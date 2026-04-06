# 操作用インーフェース

エンドポイント一覧に関しては現状 Discordコントローラ/エンドポイント一覧(WIP)に則る


## ロール関連 `/role`

- `/role/create`
    - 新しいロールを作成する
    - [`discord.Guild.create_role(*, name=..., permissions=..., color=..., colour=..., hoist=..., mentionable=..., reason=None)`](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.Guild.create_role)
        - 戻り値の型は[discord.Role](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.Role)
- `/role/delete`
    - 既存のロールを削除する
    - [`discord.Role.delete(*, reason=None)`](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.Role.delete)
- `/role/list`
    - 現在存在するロールのリストを返す
    - [`discord.Guild.roles(show_default_role=True)`](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.Guild.roles)
        - メソッドなんだ
            - プロパティかも！なんやねん
        - 優先度順(低い方が先)のリストで返ってくるらしい
- `/role/modify/`
    - ロールの権限等を変更する
- (勝手に追加)`/role/list-members`
    - 特定のロールをもつメンバーのリストを返す
        - 絶対いると思う

## チャンネル関連 `/channel`

- `/channel/create`
    - 新しいチャンネルを作成する
    - [`discord.Guild.create_text_channel(name, *, reason=None, category=None, position=..., topic=..., slowmode_delay=..., nsfw=..., overwrites=...)`](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.Guild.create_text_channel)
        - 戻り値の型は[discord.TextChannel](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.TextChannel)
    - [`discord.CategoryChannel.create_text_channel(name, **options)`](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.CategoryChannel.create_text_channel)
        - 上のやつだと所属カテゴリなしのチャンネルが作られてしまう　指定したカテゴリの下に作るならこっち
- `/channel/delete`
    - 既存のチャンネルを削除する
    - [`discord.TextChannel.delete(*, reason=None)`](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.TextChannel.delete)
- `/channel/list`
    - 現在存在するチャンネルのリストを返す
    - [`discord.Guild.channels`](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.Guild.channels)
        - こっちはプロパティ
        - ボイスチャンネルなども含む
            - List[[discord.abc.GuildChannel](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.abc.GuildChannel)]型で返ってくるのでめんどくさいかも
    - [`discord.Guild.text_channels`](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.Guild.text_channels)
        - テキストチャンネルのみ
            - List[discord.TextChannel]を返す
    - [`discord.CategoryChannel.channels`](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.CategoryChannel.channels)
        - カテゴリ単位、全チャンネル
    - [`discord.CategoryChannel.text_channel](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.CategoryChannel.text_channels)s`
        - カテゴリ単位、テキストチャンネルのみ
- `/channel/modify`
    - チャンネルの権限等を変更する
- `/channel/list-role`
    - 特定のチャンネルにアクセスできるロールのリストを返す
    - [`discord.TextChannel.changed_roles`](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.TextChannel.changed_roles)
        - “Returns a list of roles that have been overridden from their default values in the roles attribute.”
        - 「チャンネルにアクセスできるロールのリスト」そのものを返すエンドポイントはなさそう
            - だが、全ロールの権限がデフォルトで無ならこのプロパティを使えばいいと思われる
        - しかし最悪「チャンネル毎の権限上書き」のみを保持して「カテゴリ毎の権限上書き」に関知しないという可能性もある
            - その場合は`discord.CategoryChannel.changed_roles`と併用する必要がある
    - [`discord.TextChannel.overwrites`](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.TextChannel.overwrites)
        - 権限上書きを辞書で保持するらしい
        - もしかしたら使えるかもってだけ

## カテゴリー関連 `/categoty`

- `/category/create`
    - 新しいカテゴリーを作成する
    - [`discord.Guild.create_category(name, *, overwrites=..., reason=None, position=...)`](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.Guild.create_category)
    - [`discord.Guild.create_category_channel(name, *, overwrites=..., reason=None, position=...)`](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.Guild.create_category_channel)
        - 何が違うねん
        - [discord.CategoryChannel](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.CategoryChannel)を返す
- `/category/delete`
    - 既存のカテゴリーを削除する
    - [`discord.CategoryChannel.delete(*, reason=None)`](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.CategoryChannel.delete)
- `/category/list`
    - 現在存在するカテゴリーのリストを返す
    - [`discord.Guild.categories`](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.Guild.categories)
- `/category/modify`
    - カテゴリーの権限等を変更する

## メンバー関連 `/member`

- `/member/list`
    - 現在所属しているメンバーのリストを返す
    - [`discord.Guild.members`](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.Guild.members)
        - List[[discord.Member](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.Member)]型
- `/member/modify`
    - メンバーのロール等を変更する
- `/member/list-roles`
    - 特定のメンバーの持つロールのリストを返す
    - [`discord.Member.roles(show_default_role=True)`](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.Member.roles)
        - これプロパティかも　どういうことなの…
- `/member/ban`
    - メンバーをBanする
    - [`discord.Member.ban(*, delete_message_days=1, reason=None)`](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.Member.ban)
    - [`discord.Guild.ban(user, *, reason=None, delete_message_days=1)`](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.Guild.ban)
        - サーバーからも可能
- `/member/timeout`
    - メンバーをタイムアウトする
    - キックのことかしら
    - [`discord.Member.kick(*, reason=None)`](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.Member.kick)
    - または[`discord.Guild.kick(user, *, reason=None)`](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.Guild.kick)

## メッセージ関連 `/message`

`/message/reaction/`エンドポイントに関してはもう少し充実させたい気がしています。

- `/message/create`
    - 新しいメッセージを送信する
    - [`discord.TextChannel.send(content=None, *, tts=None, embed=None, embeds=None, file=None, files=None, stickers=None, delete_after=None, nonce=None, allowed_mentions=None, reference=None, mention_author=None, view=None)`](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.TextChannel.send)
- `/message/delete`
    - 既存のメッセージを削除する
    - [`discord.TextChannel.delete_messages(messages)`](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.TextChannel.delete_messages)
        - 一度に複数個削除できるらしい
    - [`discord.Message.delete(*, delay=None)`](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.Message.delete)
- `/message/modify`
    - 既存のメッセージを編集する
- `/message/reaction/totalling`
    - 特定のメッセージに対するリアクション数とリアクションしたメンバーのリストを取得する
    - [`discord.Message.reactions`](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.Message.reactions)
        - List[[discord.Reaction](https://discordpy-reborn.readthedocs.io/en/latest/api.html#discord.Reaction)]を返す
        - discord.Reaction型がすべてを保持しています　count、emoji、users()など