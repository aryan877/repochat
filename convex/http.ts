import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// Convert ArrayBuffer to hex string
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Verify GitHub webhook signature using Web Crypto API
async function verifySignature(
  payload: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature) return false;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureData = encoder.encode(payload);
  const signedData = await crypto.subtle.sign("HMAC", key, signatureData);
  const expected = `sha256=${bufferToHex(signedData)}`;

  // Constant time comparison
  if (signature.length !== expected.length) return false;
  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return result === 0;
}

// GitHub webhook endpoint
http.route({
  path: "/github/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return new Response("Webhook secret not configured", { status: 500 });
    }

    // Get headers
    const signature = request.headers.get("x-hub-signature-256");
    const event = request.headers.get("x-github-event");
    const deliveryId = request.headers.get("x-github-delivery");

    if (!event || !deliveryId) {
      return new Response("Missing required headers", { status: 400 });
    }

    // Get payload
    const payload = await request.text();

    // Verify signature
    if (!(await verifySignature(payload, signature, webhookSecret))) {
      return new Response("Invalid signature", { status: 401 });
    }

    // Parse payload
    const data = JSON.parse(payload);
    const action = data.action as string | undefined;

    // Store webhook event for processing
    await ctx.runMutation(internal.webhooksMutations.storeWebhookEvent, {
      eventType: event,
      action,
      deliveryId,
      installationId: data.installation?.id,
      repositoryId: data.repository?.id,
      summary: JSON.stringify({
        sender: data.sender?.login,
        repository: data.repository?.full_name,
        action,
      }),
    });

    // Process different event types
    switch (event) {
      case "installation":
        await ctx.runAction(internal.webhooks.handleInstallation, {
          action: action || "",
          payload: data,
        });
        break;

      case "installation_repositories":
        await ctx.runAction(internal.webhooks.handleInstallationRepos, {
          action: action || "",
          payload: data,
        });
        break;

      case "push":
        await ctx.runAction(internal.webhooks.handlePush, { payload: data });
        break;

      case "pull_request":
        if (action === "opened" || action === "synchronize") {
          await ctx.runAction(internal.webhooks.handlePullRequest, {
            action,
            payload: data,
          });
        }
        break;

      default:
        // Log but don't process unknown events
        console.log(`Received unhandled event: ${event}`);
    }

    return new Response("OK", { status: 200 });
  }),
});

// Health check endpoint
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response("OK", { status: 200 });
  }),
});

export default http;
