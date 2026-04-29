import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserRoles, hasAdminRole } from "@/lib/auth";

const ALLOWED_METHODS = new Set(["GET", "POST", "PATCH", "PUT", "DELETE"]);

function readBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const [scheme, token, ...rest] = authorization.trim().split(/\s+/);
  if (rest.length > 0 || scheme.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

function isAdminOnlyMemberPath(path: string[]): boolean {
  const routePath = path.join("/");
  return routePath.startsWith("api/v0/members") && routePath !== "api/v0/members/me";
}

async function authorizeRequest(request: NextRequest, path: string[]) {
  const accessToken = readBearerToken(request);

  if (!accessToken) {
    return { error: Response.json({ message: "Unauthorized" }, { status: 401 }) };
  }

  const supabase = createSupabaseServerClient(accessToken);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    return { error: Response.json({ message: error?.message ?? "Unauthorized" }, { status: 401 }) };
  }

  if (isAdminOnlyMemberPath(path)) {
    const roles = getUserRoles(user);
    if (!hasAdminRole(roles)) {
      return { error: Response.json({ message: "Forbidden" }, { status: 403 }) };
    }
  }

  return { accessToken };
}

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

  const authorization = await authorizeRequest(request, path);
  if ("error" in authorization) {
    return authorization.error;
  }

  const targetUrl = new URL(path.join("/"), baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  targetUrl.search = request.nextUrl.search;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");

  headers.set("authorization", `Bearer ${authorization.accessToken}`);
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
  responseHeaders.set("cache-control", "no-store");

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
