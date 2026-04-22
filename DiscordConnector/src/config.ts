export function parseBoolean(value: string | undefined): boolean {
  if (value === undefined) {
    return false;
  }
  return ["true", "1", "yes"].includes(value.toLowerCase());
}

export function requireEnv(env: Env, name: keyof Env): string {
  const value = env[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${String(name)} is required`);
  }
  return value;
}

export function getDiscordGuildId(env: Env): string {
  const guildId = requireEnv(env, "DISCORD_GUILD_ID");
  if (!/^\d+$/.test(guildId)) {
    throw new Error("DISCORD_GUILD_ID must be a Discord snowflake string");
  }
  return guildId;
}

export function getDiscordLogChannelId(env: Env): string | null {
  const value = env.DISCORD_LOG_CHANNEL_ID;
  if (value === undefined || value.trim() === "") {
    return null;
  }
  if (!/^\d+$/.test(value)) {
    console.warn("DISCORD_LOG_CHANNEL_ID is invalid; DB logging is disabled");
    return null;
  }
  return value;
}

export function getSupabaseJwtIssuer(env: Env): string {
  if (env.SUPABASE_JWT_ISSUER !== undefined && env.SUPABASE_JWT_ISSUER.trim() !== "") {
    return env.SUPABASE_JWT_ISSUER.replace(/\/+$/, "");
  }
  const projectUrl = requireEnv(env, "SUPABASE_PROJECT_URL").replace(/\/+$/, "");
  return `${projectUrl}/auth/v1`;
}

export function getSupabaseJwksUrl(env: Env): string {
  if (env.SUPABASE_JWKS_URL !== undefined && env.SUPABASE_JWKS_URL.trim() !== "") {
    return env.SUPABASE_JWKS_URL;
  }
  return `${getSupabaseJwtIssuer(env)}/.well-known/jwks.json`;
}

export function getSupabaseJwtAudience(env: Env): string {
  return env.SUPABASE_JWT_AUDIENCE ?? "authenticated";
}

export function getSupabaseJwtAlgorithms(env: Env): string[] {
  const raw = env.SUPABASE_JWT_ALGORITHMS ?? "RS256,ES256";
  const algorithms = raw
    .split(",")
    .map((algorithm) => algorithm.trim())
    .filter((algorithm) => algorithm.length > 0);
  if (algorithms.length === 0) {
    throw new Error("SUPABASE_JWT_ALGORITHMS must contain at least one algorithm");
  }
  return algorithms;
}

export function getDiscordConnectorRoleClaim(env: Env): string {
  return env.DISCORD_CONNECTOR_ROLE_CLAIM ?? "app_metadata.discord_connector_roles";
}
