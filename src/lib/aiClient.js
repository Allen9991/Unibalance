export const CLAUDE_MODEL = "claude-sonnet-4-6";

export async function sendAnthropicMessage(payload) {
  const baseUrl = (import.meta.env.VITE_AI_PROXY_BASE_URL || "").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/api/anthropic/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`AI proxy request failed with status ${response.status}`);
  }

  return response.json();
}

export async function importCourseLink(url) {
  const baseUrl = (import.meta.env.VITE_AI_PROXY_BASE_URL || "").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/api/course/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `Course import failed with status ${response.status}`);
  }

  return body;
}

export async function importCourseOutlineFile(file) {
  const baseUrl = (import.meta.env.VITE_AI_PROXY_BASE_URL || "").replace(/\/$/, "");
  const dataUrl = await readFileAsDataUrl(file);
  const data = dataUrl.split(",")[1];
  const response = await fetch(`${baseUrl}/api/course/import-file`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type || "application/pdf",
      data,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `Course outline import failed with status ${response.status}`);
  }

  return body;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}
