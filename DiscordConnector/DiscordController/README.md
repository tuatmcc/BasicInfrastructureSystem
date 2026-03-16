# MCC基盤で使う、Discord用Discord Controller

## これはなに
* `IDiscordController`の実装
* Discord APIをラップするやつ

## 構成
* controller.py: DiscordControllerが入っている
* bot.py: 細々したもの
* interface.py: Interfaceが提供してほしいもの
* cmds/: コマンド　関連による整理　もっといい方法ないかな
  * role.py
  * channel.py
  * category.py
  * member.py
  * message.py

## TODO
* IDiscordControllerの仕様をちゃんと決めるべき　かなり大事
  * 今はとりあえずエンドポイント一覧(WIP)を実装している
* 各コマンドはふつうにcontroller.pyに実装書くべきかも
