import { createRemoteJWKSet, errors as joseErrors, jwtVerify } from "jose";
import {
  getDiscordConnectorRoleClaim,
  getSupabaseJwksUrl,
  getSupabaseJwtAlgorithms,
  getSupabaseJwtAudience,
  getSupabaseJwtIssuer,
} from "../config";
import { AuthenticationError, AuthorizationError } from "../errors";

const ROLE_HIERARCHY = {
  viewer: 1,
  operator: 2,
  admin: 3,
} as const;

export type DiscordConnectorRole = keyof typeof ROLE_HIERARCHY;

export interface AuthPrincipal {
  subject: string;
  roles: ReadonlySet<DiscordConnectorRole>;
  claims: Record<string, unknown>;
}

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export async function requireRole(request: Request, env: Env, requiredRole: DiscordConnectorRole): Promise<AuthPrincipal> {
  const principal = await getCurrentPrincipal(request, env);
  const highestRole = Math.max(0, ...[...principal.roles].map((role) => ROLE_HIERARCHY[role]));
  if (highestRole < ROLE_HIERARCHY[requiredRole]) {
    throw new AuthorizationError(`${requiredRole} role is required`);
  }
  return principal;
}

export async function requireAuthenticatedUser(request: Request, env: Env): Promise<AuthPrincipal> {
  return getCurrentPrincipal(request, env);
}

async function getCurrentPrincipal(request: Request, env: Env): Promise<AuthPrincipal> {
  const authorization = request.headers.get("Authorization");
  if (authorization === null) {
    throw new AuthenticationError("Authorization header is required");
  }

  const [scheme, token, extra] = authorization.split(" ");
  if (scheme === undefined || extra !== undefined || token === undefined) {
    throw new AuthenticationError("Malformed Authorization header");
  }
  if (scheme.toLowerCase() !== "bearer") {
    throw new AuthenticationError("Authorization scheme must be Bearer");
  }
  if (token.length === 0) {
    throw new AuthenticationError("Bearer token is required");
  }

  const payload = await verifySupabaseJwt(token, env);
  const subject = payload.sub;
  if (typeof subject !== "string" || subject.length === 0) {
    throw new AuthenticationError("JWT subject is required");
  }

  if (payload.role !== "authenticated") {
    throw new AuthorizationError("Supabase authenticated role is required");
  }

  return {
    subject,
    roles: extractRoles(payload, env),
    claims: payload,
  };
}

async function verifySupabaseJwt(token: string, env: Env): Promise<Record<string, unknown>> {
  try {
    const { payload } = await jwtVerify(token, getJwks(env), {
      issuer: getSupabaseJwtIssuer(env),
      audience: getSupabaseJwtAudience(env),
      algorithms: getSupabaseJwtAlgorithms(env),
      requiredClaims: ["exp", "sub", "aud", "iss"],
    });
    return payload as Record<string, unknown>;
  } catch (error) {
    if (error instanceof joseErrors.JWTExpired) {
      throw new AuthenticationError("JWT has expired");
    }
    if (error instanceof joseErrors.JWTClaimValidationFailed && error.claim === "aud") {
      throw new AuthorizationError("JWT audience does not allow this API");
    }
    if (error instanceof joseErrors.JWTClaimValidationFailed && error.claim === "iss") {
      throw new AuthenticationError("Unexpected JWT issuer");
    }
    if (error instanceof joseErrors.JOSEError && error.message.toLowerCase().includes("jwks")) {
      throw new AuthenticationError("Unable to resolve JWT signing key");
    }
    throw new AuthenticationError("Invalid JWT");
  }
}

function getJwks(env: Env): ReturnType<typeof createRemoteJWKSet> {
  const url = getSupabaseJwksUrl(env);
  const cached = jwksCache.get(url);
  if (cached !== undefined) {
    return cached;
  }
  const jwks = createRemoteJWKSet(new URL(url));
  jwksCache.set(url, jwks);
  return jwks;
}

function extractRoles(payload: Record<string, unknown>, env: Env): ReadonlySet<DiscordConnectorRole> {
  const roleClaim = getDiscordConnectorRoleClaim(env);
  const rawRoles = getClaimValue(payload, roleClaim) ?? [];
  if (!Array.isArray(rawRoles)) {
    throw new AuthenticationError(`JWT claim ${roleClaim} must be a list`);
  }

  const roles = new Set<DiscordConnectorRole>();
  for (const role of rawRoles) {
    if (typeof role !== "string") {
      throw new AuthenticationError(`JWT claim ${roleClaim} must contain strings`);
    }
    if (role in ROLE_HIERARCHY) {
      roles.add(role as DiscordConnectorRole);
    }
  }
  return roles;
}

function getClaimValue(payload: Record<string, unknown>, claimPath: string): unknown {
  let value: unknown = payload;
  for (const segment of claimPath.split(".")) {
    if (typeof value !== "object" || value === null) {
      return undefined;
    }
    value = (value as Record<string, unknown>)[segment];
  }
  return value;
}
