import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  createDiscordLinkState,
  isAllowedDiscordLinkReturnTo,
} from "@/lib/discord-link-state";

type StartBody = {
  return_to?: string;
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

function getDiscordClientId(): string {
  const clientId = process.env.DISCORD_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new Error("DISCORD_OAUTH_CLIENT_ID is not set");
  }
  return clientId;
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

  let body: StartBody;
  try {
    body = (await request.json()) as StartBody;
  } catch {
    return Response.json({ code: 400, message: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.return_to || !isAllowedDiscordLinkReturnTo(body.return_to)) {
    return Response.json(
      { code: 400, message: "return_to must be /enrollment or /dashboard" },
      { status: 400 },
    );
  }

  try {
    const state = await createDiscordLinkState({
      issuedAt: Date.now(),
      nonce: crypto.randomUUID(),
      returnTo: body.return_to,
    });

    const authorizeUrl = new URL("https://discord.com/oauth2/authorize");
    authorizeUrl.searchParams.set("client_id", getDiscordClientId());
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set(
      "redirect_uri",
      new URL("/api/discord/link/callback", request.url).toString(),
    );
    authorizeUrl.searchParams.set("scope", "identify");
    authorizeUrl.searchParams.set("prompt", "consent");
    authorizeUrl.searchParams.set("state", state);

    return Response.json(
      {
        code: 200,
        body: {
          authorize_url: authorizeUrl.toString(),
        },
      },
      { status: 200 },
    );
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : "Discord OAuth init failed";
    return Response.json({ code: 500, message }, { status: 500 });
  }
}
