import test from "node:test";
import assert from "node:assert/strict";
import { forwardAnthropicMessage } from "./anthropicProxy.js";

test("proxy refuses Anthropic requests when the server key is missing", async () => {
  const result = await forwardAnthropicMessage({
    payload: { messages: [] },
    apiKey: "",
    fetchImpl: async () => {
      throw new Error("fetch should not be called without a key");
    },
  });

  assert.equal(result.status, 503);
  assert.match(result.body.error, /ANTHROPIC_API_KEY/);
});

test("proxy forwards messages with Anthropic headers on the server", async () => {
  let forwarded;
  const result = await forwardAnthropicMessage({
    payload: { model: "claude-sonnet-4-6", messages: [{ role: "user", content: "hello" }] },
    apiKey: "server-only-key",
    fetchImpl: async (url, options) => {
      forwarded = { url, options };
      return {
        status: 200,
        json: async () => ({ content: [{ type: "text", text: "ok" }] }),
      };
    },
  });

  assert.equal(result.status, 200);
  assert.equal(forwarded.url, "https://api.anthropic.com/v1/messages");
  assert.equal(forwarded.options.headers["x-api-key"], "server-only-key");
  assert.equal(forwarded.options.headers["anthropic-version"], "2023-06-01");
  assert.equal(JSON.parse(forwarded.options.body).model, "claude-sonnet-4-6");
});
