import asyncio
from interface import IDiscordController
from interface import Role, Channel, Member, Category, Message, Reaction
import bot
import cmds

#メソッドは適当。後でお話し合いをするべき
class DiscordController(IDiscordController):
    def __init__(self):
        self.client = bot.client
        self.guild = None
        self._ready_event = None
        self._runner_task = None

    async def connect(self) -> None:
        if self._runner_task is not None:
            return

        self._ready_event = asyncio.Event()

        @self.client.event
        async def on_ready():
            self._ready_event.set()

        self._runner_task = asyncio.create_task(self.client.start(bot.token))
        await self._ready_event.wait()

    async def disconnect(self) -> None:
        if self._runner_task is None:
            return

        await self.client.close()
        try:
            await self._runner_task
        finally:
            self._runner_task = None
            self._ready_event = None
    
    async def __aenter__(self):
        await self.connect()
        await self.set_guild()
        return self

    async def __aexit__(self, exc_type, exc, tb):
        await self.disconnect()

    async def set_guild(self) -> None:
        await self._ready_event.wait()
        self.guild = self.client.get_guild(bot.guild_id)
        if self.guild is None:
            raise ValueError(f"Failed to access to guild")

    async def hello_no_dec(self, ch_name: str) -> None:
        if self.guild is None:
            print("guild is null")
            return

        if not self.guild.text_channels:
            print("No text channels in the guild")
            return

        for tc in self.guild.text_channels:
            if tc.name == ch_name:
                print(f"found channel: {tc.name}")
                return

        print(f"channel not found: {ch_name}")

    @bot.logged_command
    async def create_role(self, name: str, color: tuple[int, int, int]|None=None, position: int|None=None) -> Role:
        return await cmds.role.create(name, color, position, self.guild)

    @bot.logged_command
    async def delete_role(self, id: int) -> bool:
        return await cmds.role.delete(id, self.guild)

    @bot.logged_command
    async def list_roles(self) -> list[Role]:
        return await cmds.role.list_(self.guild)

    @bot.logged_command
    async def list_role_members(self, role_id: int) -> list[Member]:
        return await cmds.role.list_members(role_id, self.guild)

    @bot.logged_command
    async def create_channel(self, name: str, category_id: int|None=None, position: int|None=None) -> Channel:
        return await cmds.channel.create(name, category_id, position, self.guild)

    @bot.logged_command
    async def delete_channel(self, id: int) -> bool:
        return await cmds.channel.delete(id, self.guild)

    @bot.logged_command
    async def list_channels(self) -> list[Channel]:
        return await cmds.channel.list_(self.guild)

    @bot.logged_command
    async def list_channel_roles(self, channel_id: int) -> list[Role]:
        return await cmds.channel.list_roles(channel_id, self.guild)

    @bot.logged_command
    async def create_category(self, name: str, position: int|None=None) -> Category:
        return await cmds.category.create(name, position, self.guild)

    @bot.logged_command
    async def delete_category(self, id: int) -> bool:
        return await cmds.category.delete(id, self.guild)

    @bot.logged_command
    async def list_categories(self) -> list[Category]:
        return await cmds.category.list_(self.guild)

    @bot.logged_command
    async def list_members(self) -> list[Member]:
        return await cmds.member.list_(self.guild)

    @bot.logged_command
    async def list_member_roles(self, member_id: int) -> list[Role]:
        return await cmds.member.list_roles(member_id, self.guild)

    @bot.logged_command
    async def ban_member(self, id: int) -> bool:
        return await cmds.member.ban(id, self.guild)

    @bot.logged_command
    async def kick_member(self, id: int) -> bool:
        return await cmds.member.kick(id, self.guild)

    @bot.logged_command
    async def create_message(self, channel_id: int, content: str) -> Message:
        return await cmds.message.create(channel_id, content, self.guild)

    @bot.logged_command
    async def delete_message(self, channel_id: int, message_id: int) -> bool:
        return await cmds.message.delete(channel_id, message_id, self.guild)

    @bot.logged_command
    async def total_reactions(self, channel_id: int, message_id: int) -> list[Reaction]:
        return await cmds.message.reactions(channel_id, message_id, self.guild)
