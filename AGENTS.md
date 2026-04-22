# Repository Guidelines

## Project Structure & Module Organization

This repository is a small monorepo for the MCC infrastructure system. The active application is `DiscordConnector/`, a Cloudflare Workers TypeScript service. Worker source code lives in `DiscordConnector/src/`, grouped by responsibility: `PublicAPI/` for HTTP routes and auth, `DiscordController/` for Discord API access, `DiscordDatabaseController/` for persistence, and `ControlInterface/` for service composition. Tests are in `DiscordConnector/test/` and mirror public behavior and controller validation. Project documentation is in `docs/`, Supabase schema migrations are in `supabase/migrations/`, and root Docker files are legacy/supporting infrastructure.

## Build, Test, and Development Commands

Run TypeScript commands from `DiscordConnector/`.

- `pnpm install`: install Worker dependencies.
- `pnpm run typecheck`: run `tsc --noEmit` with strict compiler settings.
- `pnpm test`: run the Vitest suite once.
- `pnpm run dev`: start local Wrangler development server.
- `pnpm run deploy`: deploy the Worker with Wrangler.

For quick local API checks, copy `DiscordConnector/.env.example` to `.env`, set `MOCK_MODE=true`, and provide Wrangler's local Hyperdrive connection string as documented in `DiscordConnector/README.md`.

## Coding Style & Naming Conventions

Use TypeScript ES modules and keep code compatible with Cloudflare Workers. The project relies on strict TypeScript settings, including `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`; prefer explicit validation and narrow types over broad casts. Follow the existing two-space indentation and semicolon style. Use `camelCase` for variables and functions, `PascalCase` for exported types/classes, and descriptive module names such as `restController.ts` or `validation.ts`.

## Documentation Language

Write repository documentation in Japanese unless a file or external interface explicitly requires another language. Keep technical names, commands, environment variables, and API paths in their original spelling.

## Testing Guidelines

Vitest is the test framework, configured in `DiscordConnector/vitest.config.ts` with Node environment and globals enabled. Add tests under `DiscordConnector/test/` using the `*.test.ts` naming pattern. Cover route behavior, authorization/validation branches, and controller edge cases when changing public API behavior. Always run `pnpm run typecheck` and `pnpm test` before submitting changes.

## Commit & Pull Request Guidelines

Recent history uses short conventional prefixes such as `add:`, `del:`, `feat/...` branch names, and occasional `wip:` commits. Prefer concise imperative messages like `add: discord role validation` or `fix: auth error response`. Pull requests should include a summary, test results, related issue or context, and screenshots or example `curl` output when API behavior changes.

## Security & Configuration Tips

Do not commit real secrets. Keep local values in `DiscordConnector/.env`; use Wrangler secrets for `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, and Supabase settings. Check `wrangler.jsonc` before deploys and replace placeholder Hyperdrive binding IDs with environment-specific values.
