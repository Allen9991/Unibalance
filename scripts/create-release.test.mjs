import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createRelease } from './create-release.mjs';

const commit = 'a'.repeat(40);
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'unibalance-release-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'dist/assets'), { recursive: true });
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ version: '0.0.1', packageManager: 'pnpm@10.34.9' }));
  await writeFile(path.join(root, 'dist/index.html'), '<html><body>Test</body></html>');
  await writeFile(path.join(root, 'dist/assets/app.js'), 'console.log("synthetic build");');
  await writeFile(path.join(root, '.env'), 'PRIVATE_VALUE=must-not-be-packaged');
  return root;
}

test('archive contains only the built web files and matching revision/hash manifest', async t => {
  const root = await fixture(t);
  const result = await createRelease({ root, commit });
  const manifest = JSON.parse(await readFile(path.join(result.output, 'manifest.json')));
  assert.equal(manifest.commit, commit);
  assert.equal(manifest.includesBackend, false);
  assert.deepEqual(manifest.files.map(file => file.path), ['assets/app.js', 'index.html']);
  for (const file of manifest.files) {
    const bytes = await readFile(path.join(result.output, 'web', file.path));
    assert.equal(file.bytes, bytes.length);
    assert.equal(file.sha256, createHash('sha256').update(bytes).digest('hex'));
  }
  const listing = execFileSync('tar', ['-tzf', path.join(result.output, 'unibalance-web.tar.gz')], { encoding: 'utf8' });
  assert.match(listing, /manifest.json/);
  assert.match(listing, /web\/index.html/);
  assert.doesNotMatch(listing, /\.env|package.json/);
  const archive = await readFile(path.join(result.output, 'unibalance-web.tar.gz'));
  const digest = createHash('sha256').update(archive).digest('hex');
  assert.equal(result.archiveSha256, digest);
  assert.match(await readFile(path.join(result.output, 'SHA256SUMS'), 'utf8'), new RegExp(`^${digest}  unibalance-web.tar.gz`));
  await assert.rejects(createRelease({ root, commit }), /EEXIST/);
});

test('rejects symlinks in build output and a symlinked build root', async t => {
  const root = await fixture(t);
  await symlink(path.join(root, '.env'), path.join(root, 'dist/assets/leak.txt'));
  await assert.rejects(createRelease({ root, commit }), /symlink rejected/);
  await rm(path.join(root, 'dist'), { recursive: true });
  await mkdir(path.join(root, 'elsewhere'));
  await symlink(path.join(root, 'elsewhere'), path.join(root, 'dist'));
  await assert.rejects(createRelease({ root, commit }), /real directory/);
});

test('rejects sensitive filenames, source maps, missing entrypoint and invalid provenance', async t => {
  const root = await fixture(t);
  for (const filename of ['.env', 'secret.pem', 'app.js.map', 'credentials.json']) {
    const target = path.join(root, 'dist', filename);
    await writeFile(target, 'synthetic fixture');
    await assert.rejects(createRelease({ root, commit }), /Unexpected release file/);
    await rm(target);
  }
  await assert.rejects(createRelease({ root, commit: 'main' }), /full Git commit/);
  await assert.rejects(createRelease({ root, commit, output: path.join(root, 'dist/release') }), /outside dist/);
  await rm(path.join(root, 'dist/index.html'));
  await assert.rejects(createRelease({ root, commit }), /no index.html/);
});
