interface Env {
  HYPERDRIVE: Hyperdrive;
  DISCORD_BOT_TOKEN?: string;
  DISCORD_GUILD_ID?: string;
  DISCORD_LOG_CHANNEL_ID?: string;
  SUPABASE_PROJECT_URL?: string;
  SUPABASE_JWT_ISSUER?: string;
  SUPABASE_JWKS_URL?: string;
  SUPABASE_JWT_AUDIENCE?: string;
  SUPABASE_JWT_ALGORITHMS?: string;
  DISCORD_CONNECTOR_ROLE_CLAIM?: string;
  MOCK_MODE?: string;
}
