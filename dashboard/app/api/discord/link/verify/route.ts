import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type VerifyBody = {
  discord_id?: unknown;
  discord_name?: unknown;
};

type MemberExistsResponse = {
  exists?: boolean;
};

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

async function readError(response: Response): Promise<string> {
  try {
    const json = (await response.json()) as { message?: string; error?: string };
    return json.message ?? json.error ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

function buildApiUrl(baseUrl: string, path: string): URL {
  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
}

export async function POST(request: NextRequest) {
  const accessToken = readBearerToken(request);
  if (!accessToken) {
    return Response.json({ code: 401, message: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServerClient(accessToken);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    return Response.json(
      { code: 401, message: error?.message ?? "Unauthorized" },
      { status: 401 },
    );
  }

  let body: VerifyBody;
  try {
    body = (await request.json()) as VerifyBody;
  } catch {
    return Response.json({ code: 400, message: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.discord_id !== "string" || !/^\d+$/.test(body.discord_id)) {
    return Response.json(
      { code: 400, message: "discord_id must be a numeric Discord snowflake" },
      { status: 400 },
    );
  }

  if (body.discord_name !== undefined && typeof body.discord_name !== "string") {
    return Response.json({ code: 400, message: "discord_name must be string" }, { status: 400 });
  }

  const discordApiBaseUrl = process.env.DISCORD_API_BASE_URL;
  if (!discordApiBaseUrl) {
    return Response.json(
      { code: 500, message: "DISCORD_API_BASE_URL is not set" },
      { status: 500 },
    );
  }

  const memberDbApiBaseUrl = process.env.MEMBERDB_API_BASE_URL;
  if (!memberDbApiBaseUrl) {
    return Response.json(
      { code: 500, message: "MEMBERDB_API_BASE_URL is not set" },
      { status: 500 },
    );
  }

  const discordCheckUrl = buildApiUrl(discordApiBaseUrl, "api/v0/member/exists");
  discordCheckUrl.searchParams.set("member_id", body.discord_id);

  const discordCheckResponse = await fetch(discordCheckUrl, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!discordCheckResponse.ok) {
    return Response.json(
      { code: discordCheckResponse.status, message: await readError(discordCheckResponse) },
      { status: discordCheckResponse.status },
    );
  }

  const discordCheckJson = (await discordCheckResponse.json()) as MemberExistsResponse;
  if (discordCheckJson.exists !== true) {
    return Response.json(
      { code: 403, message: "このDiscordアカウントは組織のサーバーに参加していません。" },
      { status: 403 },
    );
  }

  const saveLinkResponse = await fetch(buildApiUrl(memberDbApiBaseUrl, "api/v0/discord-link"), {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      discord_id: body.discord_id,
      ...(typeof body.discord_name === "string" ? { discord_name: body.discord_name } : {}),
    }),
    cache: "no-store",
  });

  const responseText = await saveLinkResponse.text();
  return new Response(responseText, {
    status: saveLinkResponse.status,
    headers: {
      "content-type": saveLinkResponse.headers.get("content-type") ?? "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
