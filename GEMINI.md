# Basic Infrastructure System V2

## Project Overview
This project is a monorepo designed for a basic infrastructure system, utilizing Cloudflare's ecosystem for both frontend and backend services.

### Architecture
- **Frontend (`/frontend`)**: A Next.js application (v16+) deployed using OpenNext on Cloudflare.
- **Community API (`/comunity`)**: A Cloudflare Workers service providing community-related features. Built with Hono and Zod OpenAPI.
- **Member API (`/menber`)**: A Cloudflare Workers service (internally named `backend` in configuration) providing member-related features. Built with Hono and Zod OpenAPI.
- **Shared (`/share`)**: Placeholder for shared code and assets across the monorepo.

### Core Technologies
- **Frameworks**: Next.js (Frontend), Hono (Backend APIs)
- **API Documentation**: Zod OpenAPI (Swagger UI integrated)
- **Deployment**: Cloudflare Workers, Wrangler, OpenNext
- **Validation**: Zod

---

## Getting Started

### Prerequisites
- Node.js and npm
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-update/) for Cloudflare Workers

### Building and Running
Most sub-projects follow standard npm scripts:

| Directory | Dev Command | Deploy Command |
| :--- | :--- | :--- |
| `frontend/` | `npm run dev` | `npm run deploy` |
| `comunity/` | `npm run dev` | `npm run deploy` |
| `menber/` | `npm run dev` | `npm run deploy` |

*Note: `menber/` might refer to itself as `backend` in `package.json` and `wrangler.jsonc`.*

### Database & Auth
- **Database**: Integration is currently in progress. Middlewares exist in `core/db.ts` but the client is not yet initialized.
- **Authentication**: Mocked in `core/auth.ts`. Expects transition to a real JWT-based or Cloudflare Access-based system.

---

## Development Conventions

### API Structure (comunity & menber)
Each API module should follow this structure within its `api_v0/` or `features/` directory:
- `router.ts`: Defines routes and integrates with Hono.
- `schema.ts`: Defines Zod schemas for request/response validation and OpenAPI documentation.
- `service.ts`: Contains business logic and data access (to be implemented).

### Shared Core Logic
Shared logic for each Worker is located in `src/core/`:
- `auth.ts`: Authentication middleware and types.
- `db.ts`: Database connection middleware.
- `error.ts`: Global error handling.
- `types.ts`: Shared TypeScript types and Hono context definitions (`AppContext`).

### Naming and Style
- **TypeScript**: Strictly used throughout the project.
- **OpenAPI**: Always use `@hono/zod-openapi` to keep documentation in sync with implementation.
- **Hono Context**: Use the `AppContext` type to ensure type safety for bindings and variables (like `db` and `appUser`).
- 絶対にコメントを消さないでください。

---
community apiは次を実装する
- role
- channel
- category
- user
- message

