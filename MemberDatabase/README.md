```txt
npm install npm run dev
```

```txt
npm run deploy
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiation `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```
# 公開API一覧
## `api/v0/me`
- ログイン中のユーザーなら誰でも実行可能

### GET
- ログイン中のユーザの情報を取得する。
- `needs_enrollment` が `true` の場合、入部届入力（初期値からの更新）が必要。

#### レスポンス形式
  ```json
  {
  "code" : <HTTPステータスコード> , 
	"needs_enrollment" : <入部届入力が必要ならtrue> ,
  "body" : {
  	"full_name": <本名> , 
  	"discord_name" : <Discord表示名> , 
  	"discord_id" : <DiscordユーザーID> ,
  	"grade": <内部で管理している学年番号> , 
  	"display_grade" : <表示上の学年> , 
  	"student_id": <学籍番号> , 
  	"emergency_contact": <緊急連絡先> , 
  	"student_email" : <学内メアド> ,
  	"insurance" : <保険加入状況> , 
  	"some_allergy": <アレルギーの有無>
  }
  }
  ```

### POST
- 新規登録用途のエンドポイント。
- 内部では Supabase Trigger と同等の DB function（`SECURITY DEFINER`）を呼び出し、
	`members/users/app_metadata.member_id` の紐付けを保証してから登録情報を保存する。
- Discord連携は別エンドポイントで事前に保存する想定。`discord_name` は任意で送れる。

#### レスポンス形式
  ``` json
  {
	"code" : 201
  }
  ```

### PATCH
- ログイン中のユーザーの指定した項目を書き換える。
  - `display_name` と `display_grade` はPATCH不可。ステータスコードは必ず `400` 。
	- `discord_name` は更新可能（`users.display_name` を更新）。

- **Merge Patch** 方式を採用

#### リクエスト形式
  ``` json
  {
  	"<編集したいカラム>" : <編集後の値>
  }
  ```

#### レスポンス形式
  ``` json
  {
  	"code" : <HTTPステータスコード>
  }
  ```

## `api/v0/discord-link`
- ログイン中のユーザーなら誰でも実行可能

### POST
- ログイン中のユーザーの `public.users.discord_id` を更新する。
- Discord OAuth で取得したユーザーIDを保存する用途。

#### リクエスト形式
  ``` json
  {
  	"discord_id" : <DiscordユーザーID>,
  	"discord_name" : <Discord表示名>
  }
  ```

#### レスポンス形式
  ``` json
  {
  	"code" : 200,
  	"body" : {
  		"discord_id" : <DiscordユーザーID>,
  		"discord_name" : <Discord表示名>
  	}
  }
  ```

## `api/v0/grades`
- ログイン中のユーザーなら誰でも実行可能 (NOTE: これはセキュリティ上のリスクがあるため、より良い方法がある場合にはそれを提案してください)

### GET
- `public.grades`に格納されている`grades.id`と`grades.display_grade`の対応をjson配列で返す。
#### レスポンス形式
  ``` json
  {
  	"code" : <HTTPステータスコード> , 
	"body" : [
	  <grades.idの値> : <grades.display_gradeの値> , 
	  ...
	]
  }
  ```

## `api/v0/members?` 
- 管理者のみ実行可能
### GET
- 全メンバーの情報を返す

#### リクエスト形式
- クエリパラメータによる条件指定が可能
##### クエリパラメータ一覧
- `?enroll_year_min=` : 入学年が指定した値以上の行を返す。
  - 例: `?genroll_year_min=2023` → 入学年が `2023` 以上の人の情報のみ返す
- `?enroll_year_max=` : 入学年が指定した値以下の行を返す。
  - 例: `?enroll_year_max=2025` → 入学年が `2025` 以上の人の情報のみ返す
- `?some_allergy=` : `members.some_allergy` が指定した値の行のみ返す
  - 例: `?some_allergy=true` → `some_allergy` が `true` の行のみ返す。

#### レスポンス形式
  ``` json
  {
	"code" : <HTTPステータスコード>
	"body" : [
	  <members.member.id> : {
		"full_name": <本名> , 
		"display_name" : <Discord表示名> , 
		"grade": <内部で管理している学年番号> , 
		"display_grade" : <表示上の学年> , 
		"student_id": <学籍番号> , 
		"emergency_contact": <緊急連絡先> , 
		"student_email" : <学内メアド> ,
		"insurance" : <保険加入状況> , 
		"some_allergy": <アレルギーの有無>
	  },
	  ...
	]
  }
  ```

## 管理者ロールの付与

- MemberDB の管理者判定は Supabase Auth の `app_metadata.role` を見ます。
- `app_metadata.role` が文字列で `admin` の場合のみ管理者として扱います。
- 例:

```sql
update auth.users
set raw_app_meta_data =
	coalesce(raw_app_meta_data, '{}'::jsonb)
	|| '{"role":"admin"}'::jsonb
where email = 'admin@example.com';
```

- 権限を変更したら、対象ユーザーは一度ログアウトして再ログインしてください。JWT の更新時に新しいロールが反映されます。



<!-- ## `api/v0/me/fullname`

- PATCH: ログイン中のユーザーの本名(`members.name`)を編集する

## `api/v0/me/handlename`
- GET: ログイン中のユーザーのハンドルネーム(Discord表示名)を取得する

## `api/v0/me/grade`
- GET: ログイン中のユーザーの学年(`grades.display_grade` と `members.grade`)を取得する
- PATCH: ログイン中のユーザーの学年(`members.grade`)を編集する

## `api/v0/me/emergency-contact`
- GET: ログイン中のユーザーの緊急連絡先(`members.emergency_contact`)を取得する
- PATCH: ログイン中のユーザーの緊急連絡先を編集する(`members.emergency_contact`)を編集する

## `api/v0/me/student-email`
- GET: ログイン中のユーザーの学内メアド(`members.student_email`)を取得する
- PATCH: ログイン中のユーザーの学内メアドを編集する(`members.student_email`)を編集する

## `api/v0/me/insurance`
- GET: ログイン中のユーザーの保険加入状況(`members.insurance`)を取得する
- PATCH: ログイン中のユーザーの保険加入状況を編集する(`members.insurance`)を編集する

## `api/v0/me/some-allergy`
- GET: ログイン中のユーザーのアレルギー有無(`members.some_allergy`)を取得する
- PATCH: ログイン中のユーザーのアレルギー有無を編集する(`members.some_allergy`)を編集する -->

# 使い方
- `dev.vars`に環境変数を設定(例は`.dev.vars.example`に記載)
- `npm install` 
- `npm run dev`
