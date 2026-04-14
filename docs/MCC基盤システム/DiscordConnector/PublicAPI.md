# PublicAPI

# システム要件

- [ControlInterface](ControlInterface.md) が提供するAPIを外部から適切に使用できる
- 公開用APIでは**新しいエンドポイントは定義しない**
    - 新しいエンドポイントというのは操作用インタフェースで定義されていない全てのエンドポイントのことを指します。
    - つまり、エンドポイントの数が操作用インタフェースのものから減ることはあっても、**増えることはありません**。

# API設計

[Beta](PublicAPI/Beta.md)

# Memo

- `/health` を除く全エンドポイントは JWT Bearer 認証必須
- JWT の発行は PublicAPI では行わず、外部 Auth サービスが担う
- PublicAPI は共有秘密鍵で JWT を検証し、`roles` クレームで RBAC を行う
