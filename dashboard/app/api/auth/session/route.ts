import { NextRequest } from "next/server";
import { getUserRoles, hasAdminRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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

export async function GET(request: NextRequest) {
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

  const roles = getUserRoles(user);

  return Response.json(
    {
      code: 200,
      body: {
        user_id: user.id,
        email: user.email ?? null,
        roles,
        is_admin: hasAdminRole(roles),
      },
    },
    { status: 200 },
  );
}