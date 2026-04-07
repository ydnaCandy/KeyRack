# テーブル定義書 (Entity Relationship & Schema Design)

## 1. データベース物理構成

- **データベースエンジン**: SQLite 3 (Node.jsモジュール: `better-sqlite3`)
- **データベース保存先**:
  - **Windows**: `C:\Users\[ユーザー名]\Documents\MyKeysApps\data\vault.db`
  - Node.jsの `app.getPath('documents')` を用いて動的にパスを解決し、ディレクトリまたはファイルが存在しない場合は起動時に自動生成する。

---

## 2. テーブル仕様一覧

### 2.1. `system` (マスターシステム管理)
マスターパスワードの検証に必要なハッシュ情報およびソルトを保持する。ここは暗号アルゴリズム（認証用）の根幹となる。

| 論理名 | 物理名(カラム名) | 型 | 制約 | デフォルト | 備考 |
|--------|----------------|----|------|------------|------|
| ID | `id` | INTEGER | PK | 1 | 常に1（単一レコード固定） |
| パスワードハッシュ | `password_hash` | TEXT | NOT NULL | - | PBKDF2(入力値, salt)の結果 |
| ソルト | `salt` | TEXT | NOT NULL | - | 登録時に自動生成されたランダム値(32bytes)のHex |

### 2.2. `db_connections` (データベース接続情報)
ユーザーが登録する各種データベース等の接続先情報。ユーザーパスワードはAES暗号化して保存する。

| 論理名 | 物理名(カラム名) | 型 | 制約 | 備考 |
|--------|----------------|----|------|------|
| ID | `id` | INTEGER | PK, AUTOINCREMENT | 自動採番 |
| 名称・識別名 | `name` | TEXT | NOT NULL | サービス等の分かりやすい名前 |
| サーバー名/DNS | `dns_name` | TEXT | 任意 (NULL可) | 接続用ホスト名 |
| IPアドレス | `ip_address` | TEXT | 任意 (NULL可) | 接続用IPアドレス |
| ポート | `port` | TEXT | 任意 (NULL可) | 接続ポート番号 |
| DB名 | `db_name` | TEXT | 任意 (NULL可) | データベース名やSID |
| ユーザー名 | `username` | TEXT | 任意 (NULL可) | DB接続ユーザー名 |
| **パスワード** | `password` | TEXT | NOT NULL | **※AES-256-GCM で暗号化保存** |

### 2.3. `service_logins` (サービスログイン情報)
Webポータル、各種システム等のログイン認証情報。ユーザーパスワードはAES暗号化して保存する。

| 論理名 | 物理名(カラム名) | 型 | 制約 | 備考 |
|--------|----------------|----|------|------|
| ID | `id` | INTEGER | PK, AUTOINCREMENT | 自動採番 |
| サービス名 | `service_name` | TEXT | NOT NULL | ウェブサイトやアプリの名称 |
| URL/エンドポイント | `url` | TEXT | 任意 (NULL可) | ログイン画面のURL等 |
| ログインID/ユーザー名 | `username` | TEXT | 任意 (NULL可) | ユーザー名またはメールアドレス |
| **パスワード** | `password` | TEXT | NOT NULL | **※AES-256-GCM で暗号化保存** |
| 備考1 | `note1` | TEXT | 任意 (NULL可) | 予備の登録項目等 |
| 備考2 | `note2` | TEXT | 任意 (NULL可) | 追加設定やシークレットキー等 |

---

## 3. レコード操作に関する設計注意事項

- 全テーブルにおいて物理削除（`DELETE`クエリ）による完全削除を行うものとする（論理削除フラグ等は使用しない）。
- パスワード項目（`db_connections.password`, `service_logins.password`）は、**必ず保存直前に暗号化処理（メインプロセス内）を行い、取得・クライアント送信直前に復号化処理を行う**。SQLiteファイルレベルでの直接閲覧では一切データ内容が推測できないよう設計されている。
