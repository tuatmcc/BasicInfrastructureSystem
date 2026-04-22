`dashboard/`に`docs/MCC基盤システム/Dashboard.md`の要件に従ってダッシュボードを実装してください。

# 追加要件
- はじめにログイン/新規登録画面を表示するようにすること。ログイン画面では、Supabase Authで利用可能なすべてのログイン手段が使えるようにすること。
- 新規登録画面では、`public.members`カラムのうち、`name`、`grade`、`emergency_call`、`student_id`、`student_email`、`insurance`、`some_allergy`の内容を尋ねるようにすること。
- Dashboardが利用するバックエンドのうち、MemberDBの操作に関わる部分は`MemberDatabase/`、Discord操作に関わる部分は`DiscordConnector/`に実装されている。MemberDBで利用可能なエンドポイントの一覧は`MemberDatabase/README.md`に、Discord操作に必要なエンドポイントは`docs/MCC基盤システム/DiscordConnector/DiscordController/Beta.md`記載されている。
原則、DashboardからSupabaseとDiscordを直接操作せず、以上に示した既存のエンドポイントを用いること。ただし、例外としてログイン時のSupabaseへのアクセスは許可する。