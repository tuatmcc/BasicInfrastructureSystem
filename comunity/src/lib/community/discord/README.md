```
curl -X POST \
  -H "Authorization: Bot <YOUR_BOT_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "User-Agent: DiscordBot (https://github.com/your-repo, 1.0.0)" \
  -d '{
    "name": "Test Role",
    <!-- "permissions": "0", // https://discord.com/developers/applications/1501602493606662264/bot bot 権限の数値　example roleの管理：268435456 -->
    "color": 3447003,
    "hoist": true,
    "mentionable": true
  }' \
  "https://discord.com/api/v10/guilds/<YOUR_GUILD_ID>/roles"
```
<!-- 
とりあえず権限はこれ。
```
8858894384
``` -->
