import { getDiscordLogChannelId, parseBoolean } from "../config";
import { DiscordRestController, MockDiscordController, type IDiscordController } from "../DiscordController";
import {
  DiscordDatabaseController,
  DiscordLoggingDatabaseController,
  MemoryDiscordDatabaseController,
  type IDiscordDatabaseController,
} from "../DiscordDatabaseController";
import { CategoryService, ChannelService, MemberService, MessageService, RoleService } from "./services";

export interface Services {
  discordController: IDiscordController;
  dbOnlyController: IDiscordDatabaseController;
  roleService: RoleService;
  channelService: ChannelService;
  categoryService: CategoryService;
  memberService: MemberService;
  messageService: MessageService;
}

export function createController(env: Env): IDiscordController {
  return parseBoolean(env.MOCK_MODE) ? new MockDiscordController() : new DiscordRestController(env);
}

export function createRawDbController(env: Env): IDiscordDatabaseController {
  return parseBoolean(env.MOCK_MODE) ? new MemoryDiscordDatabaseController() : new DiscordDatabaseController(env);
}

export function createDbController(env: Env, discordController: IDiscordController): IDiscordDatabaseController {
  const base = createRawDbController(env);
  const logChannelId = getDiscordLogChannelId(env);
  return logChannelId === null ? base : new DiscordLoggingDatabaseController(base, discordController, logChannelId);
}

export function createServices(env: Env): Services {
  const discordController = createController(env);
  const dbOnlyController = createRawDbController(env);
  const dbController = createDbController(env, discordController);
  return {
    discordController,
    dbOnlyController,
    roleService: new RoleService(discordController, dbController),
    channelService: new ChannelService(discordController, dbController),
    categoryService: new CategoryService(discordController, dbController),
    memberService: new MemberService(discordController, dbController),
    messageService: new MessageService(discordController),
  };
}
