import { NextRequest } from "next/server";

const ALLOWED_METHODS = new Set(["GET", "POST", "PATCH", "PUT", "DELETE"]);

async function proxyToMemberDb(request: NextRequest, path: string[]) {
  const baseUrl = process.env.MEMBERDB_API_BASE_URL;
  if (!baseUrl) {
    return Response.json(
      { message: "MEMBERDB_API_BASE_URL is not set" },
      { status: 500 },
    );
  }

  const method = request.method.toUpperCase();
  if (!ALLOWED_METHODS.has(method)) {
    return Response.json({ message: "Method not allowed" }, { status: 405 });
  }

  const targetUrl = new URL(path.join("/"), baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  targetUrl.search = request.nextUrl.search;

  const headers = new Headers();
  const authorization = request.headers.get("authorization");
  const contentType = request.headers.get("content-type");

  if (authorization) {
    headers.set("authorization", authorization);
  }
  if (contentType) {
    headers.set("content-type", contentType);
  }

  const body = method === "GET" ? undefined : await request.text();

  const response = await fetch(targetUrl, {
    method,
    headers,
    body,
    cache: "no-store",
  });

  const responseBody = await response.arrayBuffer();
  const responseHeaders = new Headers();
  const responseContentType = response.headers.get("content-type");
  if (responseContentType) {
    responseHeaders.set("content-type", responseContentType);
  }

  return new Response(responseBody, {
    status: response.status,
    headers: responseHeaders,
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyToMemberDb(request, path);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyToMemberDb(request, path);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyToMemberDb(request, path);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyToMemberDb(request, path);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyToMemberDb(request, path);
}
