import { NextRequest } from "next/server";
import { verifyDiscordLinkState } from "@/lib/discord-link-state";

type DiscordTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type DiscordUserResponse = {
  id?: string;
  username?: string;
  global_name?: string | null;
  discriminator?: string;
};

type PopupPayload = {
  source: "discord-link-callback";
  success: boolean;
  discordId?: string;
  discordName?: string | null;
  error?: string;
};

function escapeForHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function popupResponse(origin: string, payload: PopupPayload): Response {
  const serializedPayload = JSON.stringify(payload).replaceAll("<", "\\u003c");
  const serializedOrigin = JSON.stringify(origin);
  const title = payload.success ? "Discord連携完了" : "Discord連携エラー";
  const message = payload.success
    ? "このウィンドウは自動で閉じます。閉じない場合は手動で閉じてください。"
    : payload.error ?? "Discord連携に失敗しました。";

  const html = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeForHtml(title)}</title>
  </head>
  <body style="font-family: sans-serif; padding: 24px; line-height: 1.6;">
    <h1 style="font-size: 20px; margin-bottom: 12px;">${escapeForHtml(title)}</h1>
    <p>${escapeForHtml(message)}</p>
    <script>
      const payload = ${serializedPayload};
      const targetOrigin = ${serializedOrigin};
      if (window.opener) {
        window.opener.postMessage(payload, targetOrigin);
      }
      window.close();
    </script>
  </body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function getDiscordClientCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.DISCORD_OAUTH_CLIENT_ID;
  const clientSecret = process.env.DISCORD_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("DISCORD_OAUTH_CLIENT_ID and DISCORD_OAUTH_CLIENT_SECRET are required");
  }
  return { clientId, clientSecret };
}

function normalizeDiscordDisplayName(user: DiscordUserResponse): string | null {
  if (typeof user.global_name === "string" && user.global_name.trim().length > 0) {
    return user.global_name.trim();
  }
  if (
    typeof user.username === "string" &&
    user.username.trim().length > 0 &&
    typeof user.discriminator === "string" &&
    user.discriminator !== "0"
  ) {
    return `${user.username.trim()}#${user.discriminator}`;
  }
  if (typeof user.username === "string" && user.username.trim().length > 0) {
    return user.username.trim();
  }
  return null;
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const error = request.nextUrl.searchParams.get("error");
  if (error) {
    return popupResponse(origin, {
      source: "discord-link-callback",
      success: false,
      error: "Discord認証がキャンセルまたは拒否されました。",
    });
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !state) {
    return popupResponse(origin, {
      source: "discord-link-callback",
      success: false,
      error: "Discord OAuth callback is missing code or state.",
    });
  }

  if (!(await verifyDiscordLinkState(state))) {
    return popupResponse(origin, {
      source: "discord-link-callback",
      success: false,
      error: "Discord OAuth state verification failed.",
    });
  }

  try {
    const { clientId, clientSecret } = getDiscordClientCredentials();
    const redirectUri = new URL("/api/discord/link/callback", request.url).toString();
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }).toString(),
      cache: "no-store",
    });

    const tokenJson = (await tokenResponse.json()) as DiscordTokenResponse;
    if (!tokenResponse.ok || typeof tokenJson.access_token !== "string") {
      return popupResponse(origin, {
        source: "discord-link-callback",
        success: false,
        error: tokenJson.error_description ?? tokenJson.error ?? "Discord token exchange failed.",
      });
    }

    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
      },
      cache: "no-store",
    });
    const userJson = (await userResponse.json()) as DiscordUserResponse;
    if (!userResponse.ok || typeof userJson.id !== "string" || !/^\d+$/.test(userJson.id)) {
      return popupResponse(origin, {
        source: "discord-link-callback",
        success: false,
        error: "Discordユーザー情報の取得に失敗しました。",
      });
    }

    return popupResponse(origin, {
      source: "discord-link-callback",
      success: true,
      discordId: userJson.id,
      discordName: normalizeDiscordDisplayName(userJson),
    });
  } catch (caughtError) {
    return popupResponse(origin, {
      source: "discord-link-callback",
      success: false,
      error: caughtError instanceof Error ? caughtError.message : "Discord OAuth callback failed.",
    });
  }
}
