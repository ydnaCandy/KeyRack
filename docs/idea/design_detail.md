# 詳細設計書 (Detailed Design)

## 1. モジュールアーキテクチャ構成

本アプリケーションは、外部のWebサーバー（localhost等）を一切介さず、完全なオフライン環境で機能する Electron ベースのデスクトップアプリケーションです。コードは明確に3つのプロセス領域に分離されています。

### 1.1. メインプロセス (`src/main/`)
Node.jsネイティブ環境で動作し、OS提供機能へのアクセス、ファイルシステム操作、強力な暗号化、およびローカルDB管理を行います。
- **`index.ts`**
  - アプリケーションのエントリーポイント。
  - アプリケーションのライフサイクルイベント (`app.whenReady` 等) のハンドリング。
  - セキュリティを考慮した BrowserWindow の生成パラメータ（`nodeIntegration: false`, `contextIsolation: true`）。
  - DB初期化 (`initDatabase`)。
  - IPC全ハンドラの登録 (`registerIpcHandlers`) の実行。
- **`db.ts`**
  - `better-sqlite3` を利用した同期的なDBアクセス層。
  - OSに依存しない安全なデータ退避先 (`app.getPath('documents')`) の解決と、起動時に指定のディレクトリやファイルが存在しない場合の自動作成・初期化（テーブル自動生成）を行う。
- **`crypto.ts`**
  - アプリケーションのセキュアコアモジュール（Node.js標準モジュール `node:crypto` を使用）。
  - **AES-256-GCM** を用いた暗号化および復号。
  - **PBKDF2** を用いたマスターパスワードのハッシュ化（検証用）と暗号主鍵 (`encryptionKey`) の導出。
- **`ipcHandlers.ts`**
  - レンダラー側からの API 呼び出しに対するバックエンド実装を集約。
  - DBのCRUD操作だけでなく、実行時のみメモリに保持される暗号鍵（`encryptionKey`）のステート管理を担う。
  - JSON出力時の平文書き出し機能およびインポート機能。

### 1.2. プリロード (`src/preload/`)
メインプロセス（Node.js）とレンダラープロセス（Web）間のセキュアな通信経路（橋渡し役）を提供します。
- **`index.ts` / `index.d.ts`**
  - `contextBridge.exposeInMainWorld('api', { ... })` を使用し、メインプロセスの機能の一部を安全にラップ。
  - レンダラープロセスからの直接的な `require` やNode.js APIへのアクセスを遮断し、`window.api` 経由で呼び出せる全関数のTypeScript型定義を共有する。

### 1.3. レンダラープロセス (`src/renderer/`)
React (v19) と Tailwind CSS (v3) をベースにしたユーザーインターフェース（画面表示）とインタラクションを担当します。
- **`App.tsx`**
  - 最上位コンポーネント。マスターパスワードの登録有無やロック状態に応じて `Auth` と `Dashboard` をルーティング。
- **`components/Auth.tsx`**
  - 初回起動時とロック解除のUI。
- **`components/Dashboard.tsx`**
  - メイン管理UI。
- **`components/ServiceLoginModal.tsx` & `DbConnectionModal.tsx`**
  - 新規追加・編集用モーダル。
*(各要素・UI設計の詳細は `docs/ui.md` を参照)*

---

## 2. セキュリティおよび暗号化設計

### 2.1. マスターパスワード処理 (PBKDF2)
- マスターパスワードの設定時には `crypto.randomBytes(32)` でランダムなソルト(32bytes)を生成し、ハッシュ値ともに `system` テーブルにのみ保存。
- **ハッシュ化アルゴリズム**: `PBKDF2` (100,000イテレーション, SHA-512)
- 起動時（ロック解除時）は、入力されたパスワードとDB保管のソルトから同じ条件でハッシュ値を生成し、登録済みハッシュ値と `crypto.timingSafeEqual` により比較(タイミング攻撃防止)を行う。

### 2.2. 暗号鍵 (`encryptionKey`) の生成と管理
- ユーザー個別のレコード（パスワード群）を暗号化するための256bit(32bytes)の主鍵は **DB保存しない**。
- 認証完了時のみ、マスターパスワードとソルトから PBKDF2 を通じて再度生成され、**実行中のメモリ領域（メインプロセス内のローカル変数等）のみに保持** される。
- 「ロック」操作を行うと、この変数は直ちに `null` に破棄される。

### 2.3. データ暗号化仕様 (AES-256-GCM)
- `db_connections` や `service_logins` の「パスワード」文字列は全て暗号化の対象。
- 生成毎に `crypto.randomBytes(12)` を用いて「ランダムな 12bytes の IV（初期化ベクトル）」を生成し、暗号化を実施。
- 保存フォーマットは以下を結合し、バイナリをBase64文字列に変換してDBへINSERTする：
  `[IV (12bytes)] + [AuthTag (16bytes)] + [暗号文]`
- 復号化時にはBase64をデコード後、バイト長からIVとAuthTagを取り出し、データを復元する。

---

## 3. ファイル・データベース保存領域

- **Windows**: `C:\Users\[ユーザー名]\Documents\MyKeysApps\data\vault.db`
- **macOS**: `/Users/[ユーザー名]/Documents/MyKeysApps/data/vault.db`
- Node.jsの `app.getPath('documents')` を利用してパスを解決。ディレクトリが存在しない場合は起動時に自動生成。

---

## 4. IPC API インターフェース仕様 (`window.api.XXX`)

レンダラーから非同期通信（Promise形式）で呼び出し可能なAPIの一覧です。

### 認証・システム関連
| 関数名 | 引数内容 | 戻り値 (Promise) | 概要 |
|--------|----------|-----------------|------|
| **`checkMaster`** | なし | `boolean` | 登録済みか |
| **`registerMaster`** | `password` (文字列) | `{success, message?}` | 新規登録＋暗号鍵の生成 |
| **`unlockMaster`** | `password` (文字列)| `{success, message?}` | 認証実行＋暗号鍵の生成 |
| **`lockApp`** | なし | `{success}` | 暗号鍵の破棄（ロック） |

### DB接続データ関連
| 関数名 | 引数内容 | 戻り値 (Promise) | 概要 |
|--------|----------|-----------------|------|
| **`listDbConnections`** | なし | `{success, data?}` | 一覧取得（パスワードは平文に復号される） |
| **`createDbConnection`**| `データ一式` | `{success, id?}` | 追加（パスワードは暗号化して保存） |
| **`updateDbConnection`**| `id`, `データ一式`| `{success}` | 更新（パスワード再度暗号化） |
| **`deleteDbConnection`**| `id` | `{success}` | 削除 |

### サービスログインデータ関連
| 関数名 | 引数内容 | 戻り値 (Promise) | 概要 |
|--------|----------|-----------------|------|
| **`listServiceLogins`** | なし | `{success, data?}` | 一覧取得（パスワードは平文に復号される） |
| **`createServiceLogin`**| `データ一式` | `{success, id?}` | サービス情報新規追加（パスワード暗号化） |
| **`updateServiceLogin`**| `id`, `データ一式`| `{success}` | サービス情報更新（パスワード再度暗号化） |
| **`deleteServiceLogin`**| `id` | `{success}` | サービス情報削除 |

### データ入出力
| 関数名 | 引数内容 | 戻り値 (Promise) | 概要 |
|--------|----------|-----------------|------|
| **`exportData`** | なし | `{success, message?}`| 警告表示後、全データを平文JSONとして出力 |
| **`importData`** | なし | `{success, message?}`| ファイルを選択し、JSONインポート（重複チェック・再暗号化） |

---

## 5. ビルド・パッケージング仕様 (electron-builder)

macOSおよびWindows向けのビルド設定仕様です。

- **App ID**: `com.sandy.mykeysapps`
- **配布形態（Windows）**: ポータブル実行ファイル形式（ユーザーのPC環境を汚さないよう、OSの「インストール済みアプリ」一覧に登録されないインストーラーなしの単一実行ファイル）を主要なターゲットとしつつ、標準インストーラー形式への対応も行える設計とする。
- **asar化**: 有効 (ソースコードはパック化され隠蔽される)
- **ネイティブモジュール除外**: `better-sqlite3` 等のネイティブコードが含まれるモジュールは `asarUnpack` によって展開し、バイナリの実行時エラーを防ぐ。

### `electron-builder.yml` などの主要な設定値
```yaml
productName: "MyKeysApps"
# Windows向けポータブル実行ファイル (単一実行ファイル) 用の設定
win:
  target:
    - portable
artifactName: "${productName}_Portable_${version}.${ext}"

# 補足: インストーラ形式 (NSIS) での出力が必要な場合の設定
nsis:
  oneClick: false # 1-Clickインストールではなく、通常のウィザード形式
  allowToChangeInstallationDirectory: true # インストール先の変更を許可
  createDesktopShortcut: always # 常にデスクトップショートカットを作成
```

---

## 6. 開発環境構築ルール・規約 (Developer Guide)

### 6.1. 必要な前提ソフトウェア
- **開発OS**: macOS (Apple Silicon / Intel) 上での開発とビルド作業を基本とする。
- **ターゲットOS**: Windows 10 / 11 向けのクロスコンパイル環境。
- **Node.js**: v20.x 等（electron v39対応環境）。

### 6.2. セットアップとローカル開発
1. **依存関係のインストール**
   ```bash
   npm install
   ```
   *注意*: ネイティブの `better-sqlite3` のため、インストール時に `postinstall` 相当の `electron-builder install-app-deps` が実行されます。macOSからWindows向けにクロスコンパイルする事前準備として機能します。

2. **開発サーバー起動**
   ```bash
   npm run dev
   ```
   HMR (Hot Module Replacement) 有効な状態で、 Electron アプリの実機検証が行えます。

### 6.3. スクリプト（Scripts）一覧とルール
定義された以下の開発用スクリプトを利用すること。
- `npm run format`: Prettierによるコードフォーマット。コミット前に必ず実行する。
- `npm run lint`: ESLintによる静的解析。エラーを残さないこと。
- `npm run typecheck`: TypeScriptの厳密な型チェック。コンパイル前に型の安全性を保証する。

### 6.4. パッケージング（ビルド）手順
- `npm run build`: JS/TS バンドルのフロントエンド/バックエンド処理（事前ビルド）。
- `npm run build:win`: Windows向けポータブル版など、定義に沿った実行ファイルの出力。

### 6.5. コーディング規約 (セキュリティ境界)
- **暗号化の徹底**: メインプロセスからレンダラープロセスには**絶対に暗号化の主鍵 (`encryptionKey`) を渡さない**こと。クライアント（画面）には必要最低限な復号済みデータのみを渡し、保存時は即座に再暗号化を通す。
- **型定義**: `any` の使用は避け、 IPC 通信で送受するデータもすべてインターフェース化 (`index.d.ts`) する。
