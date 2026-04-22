import { swaggerUI } from "@hono/swagger-ui";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { registerV0Routes } from "./api/v0";
import {
  AuthenticationError,
  AuthorizationError,
  DiscordConnectionError,
  DiscordError,
  ValidationError,
} from "../errors";
import { HealthSchema, jsonContent, type AppEnv } from "./shared";

export { getServices } from "./shared";

export function createApp(): OpenAPIHono<AppEnv> {
  const app = new OpenAPIHono<AppEnv>({
    defaultHook: (result, c) => {
      if (result.success) {
        return;
      }
      return c.json(
        {
          detail: result.error.issues.map((issue) => {
            const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
            return `${path}${issue.message}`;
          }),
        },
        422,
      );
    },
  });

  app.onError((error, c) => {
    if (error instanceof AuthenticationError) {
      return c.json({ detail: error.message }, 401, { "WWW-Authenticate": "Bearer" });
    }
    if (error instanceof AuthorizationError) {
      return c.json({ detail: error.message }, 403);
    }
    if (error instanceof ValidationError) {
      return c.json({ detail: error.issues }, 422);
    }
    if (error instanceof DiscordConnectionError) {
      return c.json({ detail: error.message }, 503);
    }
    if (error instanceof DiscordError) {
      return c.json({ detail: error.message }, statusCodeForDiscordError(error));
    }
    console.error("Unhandled request failure", error);
    return c.json({ detail: "Internal Server Error" }, 500);
  });

  app.openapi(
    createRoute({
      method: "get",
      path: "/health",
      responses: {
        200: jsonContent(HealthSchema, "Health check"),
      },
    }),
    (c) => c.json({ status: "ok" as const }, 200),
  );

  registerV0Routes(app);

  app.openAPIRegistry.registerComponent("securitySchemes", "BearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  });

  app.doc("/openapi.json", {
    openapi: "3.0.0",
    info: {
      title: "DiscordConnector API",
      version: "0.1.0",
    },
  });

  app.get("/docs", swaggerUI({ url: "/openapi.json" }));

  return app;
}

function statusCodeForDiscordError(error: DiscordError): 400 | 403 | 404 | 502 {
  const message = error.message.toLowerCase();
  if (message.includes("no permission")) {
    return 403;
  }
  if (message.includes("no such") || message.includes("not found")) {
    return 404;
  }
  if (message.includes("http error")) {
    return 502;
  }
  return 400;
}
