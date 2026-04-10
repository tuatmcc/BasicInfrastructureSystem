import asyncio
from DiscordConnector.DiscordController.controller import DiscordController

async def main():
    print("Starting DiscordController...")
    async with DiscordController() as dc:
        print("DiscordController started.")
        await dc.hello_no_dec("bot-test")
        await dc.hello_no_dec("general")

asyncio.run(main())
