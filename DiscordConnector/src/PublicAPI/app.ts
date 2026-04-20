import { Hono } from "hono";
import { createServices, type Services } from "../ControlInterface";
import {
  AuthenticationError,
  AuthorizationError,
  DiscordConnectionError,
  DiscordError,
  ValidationError,
} from "../errors";
import { requireRole } from "./auth";
import {
  categoryResponse,
  channelResponse,
  memberResponse,
  messageResponse,
  reactionResponse,
  roleResponse,
} from "./responses";
import {
  asObject,
  optionalColor,
  optionalNumber,
  optionalSnowflake,
  querySnowflake,
  requiredSnowflake,
  requiredString,
} from "./validation";

type AppEnv = { Bindings: Env };

let cachedEnv: Env | null = null;
let cachedServices: Services | null = null;

export function getServices(env: Env): Services {
  if (cachedEnv !== env || cachedServices === null) {
    cachedEnv = env;
    cachedServices = createServices(env);
  }
  return cachedServices;
}

export function createApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

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

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.post("/api/v0/role/create", async (c) => {
    await requireRole(c.req.raw, c.env, "admin");
    const body = asObject(await c.req.json());
    const role = await getServices(c.env).roleService.createRole(
      requiredString(body, "name"),
      optionalColor(body, "color"),
      optionalNumber(body, "position"),
    );
    return c.json(roleResponse(role));
  });

  app.post("/api/v0/role/delete", async (c) => {
    await requireRole(c.req.raw, c.env, "admin");
    const body = asObject(await c.req.json());
    const success = await getServices(c.env).roleService.deleteRole(requiredSnowflake(body, "id"));
    return c.json({ success });
  });

  app.get("/api/v0/role/list", async (c) => {
    await requireRole(c.req.raw, c.env, "viewer");
    const roles = await getServices(c.env).roleService.listRoles();
    return c.json(roles.map(roleResponse));
  });

  app.get("/api/v0/role/list-members", async (c) => {
    await requireRole(c.req.raw, c.env, "viewer");
    const roleId = querySnowflake(new URL(c.req.url), "role_id");
    const members = await getServices(c.env).roleService.listRoleMembers(roleId);
    return c.json(members.map(memberResponse));
  });

  app.post("/api/v0/channel/create", async (c) => {
    await requireRole(c.req.raw, c.env, "admin");
    const body = asObject(await c.req.json());
    const channel = await getServices(c.env).channelService.createChannel(
      requiredString(body, "name"),
      optionalSnowflake(body, "category_id"),
      optionalNumber(body, "position"),
    );
    return c.json(channelResponse(channel));
  });

  app.post("/api/v0/channel/delete", async (c) => {
    await requireRole(c.req.raw, c.env, "admin");
    const body = asObject(await c.req.json());
    const success = await getServices(c.env).channelService.deleteChannel(requiredSnowflake(body, "id"));
    return c.json({ success });
  });

  app.get("/api/v0/channel/list", async (c) => {
    await requireRole(c.req.raw, c.env, "viewer");
    const channels = await getServices(c.env).channelService.listChannels();
    return c.json(channels.map(channelResponse));
  });

  app.get("/api/v0/channel/list-role", async (c) => {
    await requireRole(c.req.raw, c.env, "viewer");
    const channelId = querySnowflake(new URL(c.req.url), "channel_id");
    const roles = await getServices(c.env).channelService.listChannelRoles(channelId);
    return c.json(roles.map(roleResponse));
  });

  app.post("/api/v0/category/create", async (c) => {
    await requireRole(c.req.raw, c.env, "admin");
    const body = asObject(await c.req.json());
    const category = await getServices(c.env).categoryService.createCategory(
      requiredString(body, "name"),
      optionalNumber(body, "position"),
    );
    return c.json(categoryResponse(category));
  });

  app.post("/api/v0/category/delete", async (c) => {
    await requireRole(c.req.raw, c.env, "admin");
    const body = asObject(await c.req.json());
    const success = await getServices(c.env).categoryService.deleteCategory(requiredSnowflake(body, "id"));
    return c.json({ success });
  });

  app.get("/api/v0/category/list", async (c) => {
    await requireRole(c.req.raw, c.env, "viewer");
    const categories = await getServices(c.env).categoryService.listCategories();
    return c.json(categories.map(categoryResponse));
  });

  app.get("/api/v0/member/list", async (c) => {
    await requireRole(c.req.raw, c.env, "viewer");
    const members = await getServices(c.env).memberService.listMembers();
    return c.json(members.map(memberResponse));
  });

  app.post("/api/v0/member/ban", async (c) => {
    await requireRole(c.req.raw, c.env, "admin");
    const body = asObject(await c.req.json());
    const success = await getServices(c.env).memberService.banMember(requiredSnowflake(body, "id"));
    return c.json({ success });
  });

  app.post("/api/v0/member/timeout", async (c) => {
    await requireRole(c.req.raw, c.env, "admin");
    const body = asObject(await c.req.json());
    const success = await getServices(c.env).memberService.timeoutMember(requiredSnowflake(body, "id"));
    return c.json({ success });
  });

  app.get("/api/v0/member/list-roles", async (c) => {
    await requireRole(c.req.raw, c.env, "viewer");
    const memberId = querySnowflake(new URL(c.req.url), "member_id");
    const roles = await getServices(c.env).memberService.listMemberRoles(memberId);
    return c.json(roles.map(roleResponse));
  });

  app.post("/api/v0/message/create", async (c) => {
    await requireRole(c.req.raw, c.env, "operator");
    const body = asObject(await c.req.json());
    const message = await getServices(c.env).messageService.createMessage(
      requiredSnowflake(body, "channel_id"),
      requiredString(body, "content"),
    );
    return c.json(messageResponse(message));
  });

  app.post("/api/v0/message/delete", async (c) => {
    await requireRole(c.req.raw, c.env, "operator");
    const body = asObject(await c.req.json());
    const success = await getServices(c.env).messageService.deleteMessage(
      requiredSnowflake(body, "channel_id"),
      requiredSnowflake(body, "message_id"),
    );
    return c.json({ success });
  });

  app.get("/api/v0/message/reaction/totalling", async (c) => {
    await requireRole(c.req.raw, c.env, "viewer");
    const url = new URL(c.req.url);
    const reactions = await getServices(c.env).messageService.totalReactions(
      querySnowflake(url, "channel_id"),
      querySnowflake(url, "message_id"),
    );
    return c.json(reactions.map(reactionResponse));
  });

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
