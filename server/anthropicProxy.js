const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

export async function forwardAnthropicMessage({ payload, apiKey, fetchImpl = fetch }) {
  if (!apiKey) {
    return {
      status: 503,
      body: { error: "ANTHROPIC_API_KEY is not configured" },
    };
  }

  const response = await fetchImpl(ANTHROPIC_MESSAGES_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({
    error: "Anthropic returned a non-JSON response",
  }));

  return {
    status: response.status,
    body,
  };
}

export function createAnthropicProxy({ apiKey, fetchImpl } = {}) {
  return async function anthropicProxy(req, res) {
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    try {
      // TODO(auth): when this proxy moves off localhost, verify the signed-in user
      // before forwarding so each request is tied to an allowed UniBalance account.
      const payload = await readJson(req);
      const result = await forwardAnthropicMessage({ payload, apiKey, fetchImpl });
      sendJson(res, result.status, result.body);
    } catch (error) {
      sendJson(res, 400, { error: "Invalid Anthropic proxy request" });
    }
  };
}

async function readJson(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
  }
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(payload));
}
