import { requireAuth } from "./lib/auth";
import { jsonError, jsonOk } from "./lib/errors";
import { getAuthGoogleStart, postAuthLogin, postAuthLogout, postAuthSignup } from "./routes/auth";
import {
  getMemberById,
  getMembersMe,
  listMembers,
  patchMemberById,
  patchMembersMe,
  postMembersMe,
} from "./routes/members";
import { patchUserDisplayName } from "./routes/users";
import type { Env } from "./types";

function pathId(pathname: string, prefix: string): string | null {
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length);
  if (!rest) return null;
  if (rest.includes("/")) return null;
  return decodeURIComponent(rest);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method.toUpperCase();

    if (pathname === "/health" && method === "GET") {
      return jsonOk({ status: "ok" });
    }

    if (pathname === "/auth/signup" && method === "POST") {
      return postAuthSignup(request, env);
    }
    if (pathname === "/auth/login" && method === "POST") {
      return postAuthLogin(request, env);
    }
    if (pathname === "/auth/google/start" && method === "GET") {
      return getAuthGoogleStart(request, env);
    }
    if (pathname === "/auth/logout" && method === "POST") {
      return postAuthLogout(request, env);
    }

    const auth = await requireAuth(request, env);
    if (auth instanceof Response) return auth;

    if (pathname === "/members/me" && method === "POST") {
      return postMembersMe(request, env, auth);
    }
    if (pathname === "/members/me" && method === "GET") {
      return getMembersMe(env, auth);
    }
    if (pathname === "/members/me" && method === "PATCH") {
      return patchMembersMe(request, env, auth);
    }

    if (pathname === "/members" && method === "GET") {
      return listMembers(request, env, auth);
    }

    const memberId = pathId(pathname, "/members/");
    if (memberId && method === "GET") {
      return getMemberById(env, auth, memberId);
    }
    if (memberId && method === "PATCH") {
      return patchMemberById(request, env, auth, memberId);
    }

    const userDisplayNamePrefix = "/users/";
    const displayNameSuffix = "/display-name";
    if (pathname.startsWith(userDisplayNamePrefix) && pathname.endsWith(displayNameSuffix) && method === "PATCH") {
      const discordUserId = pathname.slice(
        userDisplayNamePrefix.length,
        pathname.length - displayNameSuffix.length,
      );
      if (!discordUserId || discordUserId.includes("/")) return jsonError(404, "Not Found");
      return patchUserDisplayName(request, env, auth, decodeURIComponent(discordUserId));
    }

    return jsonError(404, "Not Found");
  },
};
