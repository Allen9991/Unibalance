import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cp, lstat, mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const unsafeName = name => name.startsWith('.') || /\.(?:map|pem|key|p12|pfx)$/i.test(name) || /^(?:credentials|secrets)(?:\.|$)/i.test(name);

async function inventory(directory, prefix = '') {
  const files = [];
  for (const name of (await readdir(directory)).sort()) {
    if (unsafeName(name)) throw new Error(`Unexpected release file: ${prefix}${name}`);
    const location = path.join(directory, name);
    const stat = await lstat(location);
    if (stat.isSymbolicLink()) throw new Error(`Release symlink rejected: ${prefix}${name}`);
    if (stat.isDirectory()) files.push(...await inventory(location, `${prefix}${name}/`));
    else if (stat.isFile()) {
      const bytes = await readFile(location);
      files.push({ path: `${prefix}${name}`, bytes: bytes.length, sha256: sha256(bytes) });
    } else throw new Error(`Non-regular release file: ${prefix}${name}`);
  }
  return files;
}

// Pure packaging boundary: tests supply a synthetic build and explicit revision.
// The CLI below additionally requires a clean tracked Git tree.
export async function createRelease({ root, commit, output = path.join(root, 'release') }) {
  if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('A full Git commit SHA is required');
  const build = path.join(root, 'dist');
  if ((await lstat(build)).isSymbolicLink() || await realpath(build) !== path.join(await realpath(root), 'dist')) {
    throw new Error('The build directory must be a real directory');
  }
  const files = await inventory(build);
  if (!files.some(file => file.path === 'index.html')) throw new Error('Build has no index.html');
  const relativeOutput = path.relative(path.resolve(build), path.resolve(output));
  if (!relativeOutput || (!relativeOutput.startsWith(`..${path.sep}`) && relativeOutput !== '..' && !path.isAbsolute(relativeOutput))) {
    throw new Error('Output must be outside dist');
  }
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  // Refuse to overwrite any prior release. The caller chooses a fresh directory.
  await mkdir(output);
  const staged = path.join(output, 'web');
  await cp(build, staged, { recursive: true, dereference: false });
  const copiedFiles = await inventory(staged);
  if (JSON.stringify(files) !== JSON.stringify(copiedFiles)) throw new Error('Build changed during packaging');
  const manifest = {
    schemaVersion: 1, kind: 'static-web', commit, packageVersion: pkg.version,
    node: process.version, packageManager: pkg.packageManager, includesBackend: false,
    files: copiedFiles,
  };
  const manifestBytes = `${JSON.stringify(manifest, null, 2)}\n`;
  await writeFile(path.join(output, 'manifest.json'), manifestBytes);
  const archiveName = 'unibalance-web.tar.gz';
  execFileSync('tar', ['-czf', path.join(path.resolve(output), archiveName), '-C', output, 'web', 'manifest.json'], {
    env: { ...process.env, COPYFILE_DISABLE: '1' }, stdio: 'pipe',
  });
  const archive = await readFile(path.join(output, archiveName));
  await writeFile(path.join(output, 'SHA256SUMS'), `${sha256(archive)}  ${archiveName}\n${sha256(manifestBytes)}  manifest.json\n`);
  return { output, commit, fileCount: files.length, archiveSha256: sha256(archive) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
    const dirty = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: root, encoding: 'utf8' });
    if (dirty.trim()) throw new Error('Commit tracked changes before creating a release artifact');
    const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    console.log(JSON.stringify(await createRelease({ root, commit }), null, 2));
  } catch (error) {
    console.error(`Release failed: ${error.message}`);
    process.exitCode = 1;
  }
}
