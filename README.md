# BasicInfrastructureSystem
MCC基盤システムのモノレポ

# 操作用インターフェース

起ち上げ
```sh
uv sync
cd DiscordConnector/ControlInterface
uv run uvicorn main:app --reload
```