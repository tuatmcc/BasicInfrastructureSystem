import { requireRole } from "../lib/auth";
import { jsonError, noContent } from "../lib/errors";
import { patchDisplayNameByDiscordUserId } from "../lib/supabase";
import type { AuthContext, Env } from "../types";

type DisplayNameBody = {
  display_name?: string;
};

export async function patchUserDisplayName(
  request: Request,
  env: Env,
  auth: AuthContext,
  discordUserId: string,
): Promise<Response> {
  const forbidden = requireRole(auth, "DiscordConnector");
  if (forbidden) return forbidden;

  let payload: DisplayNameBody;
  try {
    payload = (await request.json()) as DisplayNameBody;
  } catch {
    return jsonError(400, "Bad Request");
  }

  if (!payload.display_name || typeof payload.display_name !== "string") {
    return jsonError(400, "Bad Request");
  }

  const response = await patchDisplayNameByDiscordUserId(env, discordUserId, payload.display_name);
  if (response.status === 404) return jsonError(404, "Not Found");
  if (!response.ok) return jsonError(response.status, response.statusText || "Bad Request");

  return noContent(204);
}
