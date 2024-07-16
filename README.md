# 概要

OZO の勤怠を自動化します。

# 1. プロ番の設定

`/src/constants/projects.json`を作成し、以下の例の通りに設定してください。

##### /src/constants/projects.json

```json
[
	{
		"name": "main_project",
		"code": "00000000-00"
	},
	{
		"name": "sub_project_1",
		"code": "11111111-11",
		"time": "00:30",
		"day": 3
	}
]
```

#### 主要プロジェクト

-   1 つの主要プロジェクトの設定が必須です。

| プロパティ名 | 説明                 | 必須 |
| :----------- | :------------------- | :--- |
| code         | プロジェクト番号     | true |
| name         | プロジェクト名(任意) | true |

#### サブプロジェクト

-   0 ~ 5 つまで設定可能です。

| プロパティ名 | 説明                                                                     | 必須  |
| :----------- | :----------------------------------------------------------------------- | :---- |
| code         | プロジェクト番号                                                         | true  |
| name         | プロジェクト名(任意)                                                     | true  |
| time         | 作業時間                                                                 | true  |
| day          | 設定した曜日以外は入力がスキップされる。設定しない場合は毎日入力される。 | false |

総作業時間から`time`に指定した時間の分だけサブプロジェクトの作業時間として割り当てられます。  
サブプロジェクトを指定しない場合は、総作業時間の全てが主要プロジェクトの作業時間となります。

# 2. 環境変数の設定

ルート直下に`.env`を作成し、以下の項目を設定してください。

| 変数名              | 説明                                                            | 例                  |
| :------------------ | :-------------------------------------------------------------- | :------------------ |
| USER_ID             | 社員番号                                                        | L0000               |
| USER_PASSWORD       | パスワード                                                      | password            |
| OZO_URL             | OZO の クエリを含めた URL。ログイン画面のアドレスバーから取得。 | https://example.com |
| BROWSER_IS_HEADLESS | ブラウザ表示なし                                                | false               |

# 3. パッケージインストール

```bash
pnpm install
```

# 4. 実行

## 出勤

```bash
npx ts-node src/index.ts clockIn
```

## 退勤 & プロ番自動入力

```bash
npx ts-node src/index.ts clockOut
```
