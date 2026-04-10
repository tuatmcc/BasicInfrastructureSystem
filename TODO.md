# TODO

## Resume ID

`uvicorn-startup-hang-20260410`

## Context

- 現象: `uv run uvicorn main:app --reload` で起動しても URL にアクセスできず、`Ctrl+C` でも終了しにくい。
- 調査日: 2026-04-10
- 調査場所: repo root `/home/nixos/myProjects/BasicInfrastructureSystem`

## Findings

- `--reload` 自体が主因ではない。`--reload` なしでも `Waiting for application startup.` で停止する。
- FastAPI 起動時に `PublicAPI` -> `ControlInterface` の lifespan が走り、その中で Discord 接続完了待ちをしている。
- `DiscordController.connect()` は `self.client.start(bot.token)` を task 化し、`on_ready` が来るまで `await self._ready_event.wait()` で待機する。
- この待機が終わらないと `Application startup complete` まで進まず、HTTP 受付も始まらない。
- `MOCK_MODE=true` では正常起動し、`/health` が 200 を返し、`Ctrl+C` でも正常終了した。
- DB 側の `connect()` は engine 初期化のみで、今回の停止の一次原因ではなさそう。
- `client.start(...)` 側の例外が startup に表面化しにくく、ログなしで固まったように見える構造になっている。
- startup 完了前に停止すると cleanup に到達しないため、Discord task が残って `Ctrl+C` が効きにくく見える。

## Relevant Files

- `DiscordConnector/PublicAPI/dependencies.py`
- `DiscordConnector/ControlInterface/dependencies.py`
- `DiscordConnector/DiscordController/controller.py`
- `DiscordConnector/DiscordController/bot.py`
- `DiscordConnector/DiscordDatabaseController/database.py`
- `DiscordConnector/config.py`

## Likely Causes To Verify

- `DISCORD_BOT_TOKEN` が不正
- `DISCORD_GUILD_ID` が不正、または bot がその guild に参加していない
- Discord Developer Portal の privileged intents 設定不足
- Discord Gateway への outbound 接続不可
- `on_ready` 前に `client.start()` 側で例外が出ているが拾えていない

## Next Actions

- `DiscordController.connect()` で `client.start()` task の例外を確実に拾って startup 失敗として落とす
- startup timeout を入れて、永久待機を防ぐ
- startup 失敗時や `Ctrl+C` 時にも `disconnect()` が走るよう cleanup を強化する
- Discord 接続ログを追加して、どの段階で止まっているか見えるようにする
- `.env` の読み込み位置依存を減らすため、`load_dotenv()` のパス指定も検討する

## Repro Notes

- NG:
  `uv run uvicorn main:app --reload`
- OK:
  `MOCK_MODE=true uv run uvicorn main:app --reload`

## Resume Prompt

次回は `uvicorn-startup-hang-20260410` を指定して、Discord startup ハング対策の実装を続ける。
