import { jsonError, jsonOk } from "../lib/errors";
import type { Env } from "../types";

type AuthCredentialBody = {
  email?: string;
  password?: string;
};

function supabaseAuthBase(env: Env): string {
  return `${env.SUPABASE_PROJECT_URL.replace(/\/$/, "")}/auth/v1`;
}

function validCredential(payload: AuthCredentialBody): payload is { email: string; password: string } {
  return typeof payload.email === "string" && payload.email.length > 0 && typeof payload.password === "string" && payload.password.length > 0;
}

async function parseCredentialBody(request: Request): Promise<AuthCredentialBody | Response> {
  try {
    const payload = (await request.json()) as AuthCredentialBody;
    if (!validCredential(payload)) return jsonError(400, "Bad Request");
    return payload;
  } catch {
    return jsonError(400, "Bad Request");
  }
}

function parseSupabaseBody(raw: string): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function extractSupabaseErrorMessage(body: Record<string, unknown>, fallback: string): string {
  if (typeof body.msg === "string") return body.msg;
  if (typeof body.message === "string") return body.message;
  if (typeof body.error_description === "string") return body.error_description;
  return fallback;
}

export async function postAuthSignup(request: Request, env: Env): Promise<Response> {
  const payload = await parseCredentialBody(request);
  if (payload instanceof Response) return payload;

  const response = await fetch(`${supabaseAuthBase(env)}/signup`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const bodyText = await response.text();
  const body = parseSupabaseBody(bodyText);
  if (!response.ok) {
    return jsonError(response.status, extractSupabaseErrorMessage(body, response.statusText || "Bad Request"));
  }

  return jsonOk({
    user: body.user ?? null,
    session: body.session ?? null,
  });
}

export async function postAuthLogin(request: Request, env: Env): Promise<Response> {
  const payload = await parseCredentialBody(request);
  if (payload instanceof Response) return payload;

  const response = await fetch(`${supabaseAuthBase(env)}/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const bodyText = await response.text();
  const body = parseSupabaseBody(bodyText);
  if (!response.ok) {
    return jsonError(response.status, extractSupabaseErrorMessage(body, response.statusText || "Bad Request"));
  }

  return jsonOk({
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_in: body.expires_in,
    token_type: body.token_type,
    user: body.user,
  });
}

export async function postAuthLogout(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return jsonError(401, "Unauthorized");
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return jsonError(401, "Unauthorized");

  const response = await fetch(`${supabaseAuthBase(env)}/logout`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
  });

  if (!response.ok) {
    const bodyText = await response.text();
    const body = parseSupabaseBody(bodyText);
    return jsonError(response.status, extractSupabaseErrorMessage(body, response.statusText || "Bad Request"));
  }

  return jsonOk({ status: "ok" });
}

export async function getAuthGoogleStart(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("redirect_to");
  if (!redirectTo) return jsonError(400, "Bad Request");

  let parsedRedirect: URL;
  try {
    parsedRedirect = new URL(redirectTo);
  } catch {
    return jsonError(400, "Bad Request");
  }

  const authorize = new URL(`${supabaseAuthBase(env)}/authorize`);
  authorize.searchParams.set("provider", "google");
  authorize.searchParams.set("redirect_to", parsedRedirect.toString());
  authorize.searchParams.set("flow_type", "implicit");

  return Response.redirect(authorize.toString(), 302);
}
