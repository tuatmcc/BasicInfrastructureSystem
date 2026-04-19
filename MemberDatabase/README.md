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
## `api/v1/me`
- ログイン中のユーザーなら誰でも実行可能

### GET
- ログイン中のユーザの情報を取得する。
- レスポンス形式
  ```json
  {
  "code" : <HTTPステータスコード> , 
  "body" : {
  	"full_name": <本名> , 
  	"display_name" : <Discord表示名> , 
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

### PATCH
- ログイン中のユーザーの指定した項目を書き換える。
  - `display_name` と `display_grade` はPATCH不可。ステータスコードは必ず `400` 。

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


## `api/v1/members?` 
- 管理者のみ実行可能
### GET
- 全メンバーの情報を返す

#### リクエスト形式
- クエリパラメータによる条件指定が可能
#### クエリパラメータ一覧
- `?grade_min=` : `members.grade` が指定した値以上の行を返す。
  - 例: `?grade_min=1` → `members.grade` が1以上の行のみ返す
- `?grade_max=` : `members.grade` が指定した値以下の行を返す。
  - 例: `?grade_min=4` → `members.grade` が4以下の行のみ返す
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



<!-- ## `api/v1/me/fullname`

- PATCH: ログイン中のユーザーの本名(`members.name`)を編集する

## `api/v1/me/handlename`
- GET: ログイン中のユーザーのハンドルネーム(Discord表示名)を取得する

## `api/v1/me/grade`
- GET: ログイン中のユーザーの学年(`grades.display_grade` と `members.grade`)を取得する
- PATCH: ログイン中のユーザーの学年(`members.grade`)を編集する

## `api/v1/me/emergency-contact`
- GET: ログイン中のユーザーの緊急連絡先(`members.emergency_contact`)を取得する
- PATCH: ログイン中のユーザーの緊急連絡先を編集する(`members.emergency_contact`)を編集する

## `api/v1/me/student-email`
- GET: ログイン中のユーザーの学内メアド(`members.student_email`)を取得する
- PATCH: ログイン中のユーザーの学内メアドを編集する(`members.student_email`)を編集する

## `api/v1/me/insurance`
- GET: ログイン中のユーザーの保険加入状況(`members.insurance`)を取得する
- PATCH: ログイン中のユーザーの保険加入状況を編集する(`members.insurance`)を編集する

## `api/v1/me/some-allergy`
- GET: ログイン中のユーザーのアレルギー有無(`members.some_allergy`)を取得する
- PATCH: ログイン中のユーザーのアレルギー有無を編集する(`members.some_allergy`)を編集する -->
