import { NextRequest, NextResponse } from "next/server";

const FORWARDED_HEADERS = [
  "authorization",
  "content-type",
  "accept",
  "mcp-session-id",
];

const HOP_BY_HOP = new Set([
  "transfer-encoding",
  "connection",
  "keep-alive",
  "upgrade",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "content-encoding",
  "content-length",
]);

function getTargetUrl(req: NextRequest): URL | null {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

function buildHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const name of FORWARDED_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers[name] = value;
  }
  return headers;
}

async function proxyRequest(req: NextRequest): Promise<Response> {
  const target = getTargetUrl(req);
  if (!target) {
    return NextResponse.json(
      { error: "Missing or invalid ?url= parameter (HTTPS required)" },
      { status: 400 },
    );
  }

  const headers = buildHeaders(req);

  // Buffer the request body to avoid ReadableStream issues
  const requestBody =
    req.method === "POST" ? await req.arrayBuffer() : undefined;

  let upstream: globalThis.Response;
  try {
    upstream = await fetch(target.toString(), {
      method: req.method,
      headers,
      body: requestBody,
    });
  } catch (err) {
    console.error("[mcp-proxy] upstream fetch failed:", err);
    return NextResponse.json(
      { error: "Upstream request failed" },
      { status: 502 },
    );
  }

  // Check if response is SSE (needs streaming) vs JSON (can buffer)
  const contentType = upstream.headers.get("content-type") || "";
  const isSSE = contentType.includes("text/event-stream");

  // Build response headers, skipping hop-by-hop
  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  // Ensure the browser can read the Mcp-Session-Id header
  const sessionId = upstream.headers.get("mcp-session-id");
  if (sessionId) {
    responseHeaders.set("mcp-session-id", sessionId);
  }

  if (isSSE) {
    // Stream SSE responses through
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  }

  // Buffer JSON / other responses for reliable delivery
  const responseBody = await upstream.arrayBuffer();
  return new Response(responseBody, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function POST(req: NextRequest) {
  return proxyRequest(req);
}

export async function GET(req: NextRequest) {
  return proxyRequest(req);
}

export async function DELETE(req: NextRequest) {
  return proxyRequest(req);
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": FORWARDED_HEADERS.join(", "),
      "Access-Control-Expose-Headers": "mcp-session-id",
    },
  });
}
