# BasicInfrastructureSystem
MCC基盤システムのモノレポ

# 操作用インターフェース

起ち上げ
```sh
uv sync
cd DiscordConnector/ControlInterface
uv run uvicorn main:app --reload
#モックモード
#MOCK_MODE=true uv run uvicorn main:app --reload
```
テスト実行
```
cd DiscordConnector/ControlInterface
uv run pytest tests/ -v
```