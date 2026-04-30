export type DiscordLinkReturnTo = "/dashboard" | "/enrollment";

type DiscordLinkState = {
  issuedAt: number;
  nonce: string;
  returnTo: DiscordLinkReturnTo;
};

const ALLOWED_RETURN_TO = new Set<DiscordLinkReturnTo>(["/dashboard", "/enrollment"]);
const MAX_STATE_AGE_MS = 10 * 60 * 1000;

function getStateSecret(): string {
  const secret = process.env.DISCORD_OAUTH_STATE_SECRET;
  if (!secret) {
    throw new Error("DISCORD_OAUTH_STATE_SECRET is not set");
  }
  return secret;
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

async function signPayload(payload: string): Promise<string> {
  const secret = getStateSecret();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Buffer.from(signature).toString("base64url");
}

export function isAllowedDiscordLinkReturnTo(value: string): value is DiscordLinkReturnTo {
  return ALLOWED_RETURN_TO.has(value as DiscordLinkReturnTo);
}

export async function createDiscordLinkState(state: DiscordLinkState): Promise<string> {
  const payload = encodeBase64Url(JSON.stringify(state));
  const signature = await signPayload(payload);
  return `${payload}.${signature}`;
}

export async function verifyDiscordLinkState(rawState: string): Promise<DiscordLinkState | null> {
  const [payload, signature, extra] = rawState.split(".");
  if (!payload || !signature || extra !== undefined) {
    return null;
  }

  const expectedSignature = await signPayload(payload);
  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as Partial<DiscordLinkState>;
    if (
      typeof parsed.issuedAt !== "number" ||
      typeof parsed.nonce !== "string" ||
      typeof parsed.returnTo !== "string" ||
      !isAllowedDiscordLinkReturnTo(parsed.returnTo)
    ) {
      return null;
    }

    if (Date.now() - parsed.issuedAt > MAX_STATE_AGE_MS) {
      return null;
    }

    return {
      issuedAt: parsed.issuedAt,
      nonce: parsed.nonce,
      returnTo: parsed.returnTo,
    };
  } catch {
    return null;
  }
}
