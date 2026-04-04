# KeyRack 設計書

作成日: 2026-04-04

---

## 1. 概要

**KeyRack** は Windows OS 向けのローカル完結型パスワード管理デスクトップアプリケーションである。  
外部サーバー・クラウド・localhost を一切介さず、完全なオフライン環境で動作する。  
ユーザーの機密情報（パスワード・DB接続情報）をローカル環境でセキュアに管理することを目的とする。

---

## 2. 技術スタック

| カテゴリ | 採用技術 |
|---------|---------|
| Framework | Electron (electron-vite) |
| Package Manager | npm |
| Database | SQLite (better-sqlite3) |
| UI | React 19 + Tailwind CSS v3 + Lucide-React |
| Language | TypeScript (Strict mode) |
| Encryption | node:crypto (AES-256-GCM / PBKDF2) |
| Build Tool | electron-builder |
| UI言語 | 日本語 |

---

## 3. プロジェクト構造

electron-vite の React + TypeScript テンプレートをベースとする。

```
KeyRack/
├── src/
│   ├── main/
│   │   ├── index.ts          # エントリーポイント、BrowserWindow生成、IPC登録
│   │   ├── db.ts             # better-sqlite3 初期化・テーブル自動作成
│   │   ├── crypto.ts         # AES-256-GCM / PBKDF2 実装
│   │   └── ipcHandlers.ts    # 全IPC実装・encryptionKeyのメモリ管理
│   ├── preload/
│   │   ├── index.ts          # contextBridge で window.api を公開
│   │   └── index.d.ts        # window.api の型定義
│   └── renderer/
│       └── src/
│           ├── App.tsx
│           ├── components/
│           │   ├── Auth.tsx
│           │   ├── Dashboard.tsx
│           │   ├── ServiceLoginModal.tsx
│           │   └── DbConnectionModal.tsx
│           └── index.css     # Tailwind CSS ディレクティブ
├── electron-builder.yml
├── electron.vite.config.ts
├── README.md                 # Windows環境構築〜exe生成手順を記載
└── package.json
```

---

## 4. セキュリティ・暗号化設計

### 4.1. マスターパスワード (PBKDF2)

- 登録時: `crypto.randomBytes(32)` でソルト生成 → PBKDF2 (100,000イテレーション, SHA-512) でハッシュ化 → `system` テーブルに保存
- ロック解除時: 入力パスワード + DBのソルトで再ハッシュ → `crypto.timingSafeEqual` で比較（タイミング攻撃防止）

### 4.2. 暗号鍵 (encryptionKey) の管理

- 認証完了時のみ PBKDF2 で導出し、**メインプロセスのメモリのみに保持**
- DBには保存しない
- ロック操作で即時 `null` に破棄
- レンダラープロセスには絶対に渡さない

### 4.3. データ暗号化 (AES-256-GCM)

- 保存時: `crypto.randomBytes(12)` で IV 生成 → 暗号化 → `[IV(12bytes)][AuthTag(16bytes)][暗号文]` をBase64でDB保存
- 復号時: Base64デコード → バイト長からIV・AuthTagを分離 → 復号

---

## 5. データベース設計

**保存先:**
- Windows: `C:\Users\[ユーザー名]\Documents\KeyRack\data\vault.db`
- macOS/Linux: `~/Documents/KeyRack/data/vault.db`

**テーブル定義:**

### `system`（マスターパスワード管理）
| カラム | 型 | 制約 | 備考 |
|-------|-----|------|------|
| id | INTEGER | PK | 常に1（単一レコード固定） |
| password_hash | TEXT | NOT NULL | PBKDF2ハッシュ値 |
| salt | TEXT | NOT NULL | ランダムソルト(32bytes)のHex |

### `service_logins`（サービスログイン情報）
| カラム | 型 | 制約 | 備考 |
|-------|-----|------|------|
| id | INTEGER | PK, AUTOINCREMENT | |
| service_name | TEXT | NOT NULL | |
| url | TEXT | NULL可 | |
| username | TEXT | NULL可 | |
| password | TEXT | NOT NULL | AES-256-GCM暗号化 |
| note1 | TEXT | NULL可 | |
| note2 | TEXT | NULL可 | |

### `db_connections`（DB接続情報）
| カラム | 型 | 制約 | 備考 |
|-------|-----|------|------|
| id | INTEGER | PK, AUTOINCREMENT | |
| name | TEXT | NOT NULL | |
| dns_name | TEXT | NULL可 | |
| ip_address | TEXT | NULL可 | |
| port | TEXT | NULL可 | |
| db_name | TEXT | NULL可 | |
| username | TEXT | NULL可 | |
| password | TEXT | NOT NULL | AES-256-GCM暗号化 |

---

## 6. IPC API 仕様 (`window.api`)

### 認証・システム
| 関数名 | 引数 | 戻り値 | 概要 |
|-------|------|--------|------|
| `checkMaster` | なし | `boolean` | 登録済みか確認 |
| `registerMaster` | `password: string` | `{success, message?}` | 新規登録・暗号鍵生成 |
| `unlockMaster` | `password: string` | `{success, message?}` | 認証・暗号鍵生成 |
| `lockApp` | なし | `{success}` | 暗号鍵破棄（ロック） |

### サービスログイン
| 関数名 | 引数 | 戻り値 | 概要 |
|-------|------|--------|------|
| `listServiceLogins` | なし | `{success, data?}` | 一覧取得（パスワードは復号済み） |
| `createServiceLogin` | データ一式 | `{success, id?}` | 追加（パスワード暗号化） |
| `updateServiceLogin` | `id`, データ一式 | `{success}` | 更新（パスワード再暗号化） |
| `deleteServiceLogin` | `id` | `{success}` | 削除 |

### DB接続
| 関数名 | 引数 | 戻り値 | 概要 |
|-------|------|--------|------|
| `listDbConnections` | なし | `{success, data?}` | 一覧取得（パスワードは復号済み） |
| `createDbConnection` | データ一式 | `{success, id?}` | 追加（パスワード暗号化） |
| `updateDbConnection` | `id`, データ一式 | `{success}` | 更新（パスワード再暗号化） |
| `deleteDbConnection` | `id` | `{success}` | 削除 |

### データ入出力
| 関数名 | 引数 | 戻り値 | 概要 |
|-------|------|--------|------|
| `exportData` | なし | `{success, message?}` | 平文JSON出力（警告ダイアログ → `dialog.showSaveDialog` でファイル保存先を選択） |
| `importData` | なし | `{success, message?}` | `dialog.showOpenDialog` でJSONファイルを選択 → 重複チェック・再暗号化してインポート |

---

## 7. UI設計

- **テーマ**: ダークテーマベース (Tailwind CSS)
- **アイコン**: Lucide-React
- **言語**: 日本語（全ラベル・エラーメッセージ・確認文）

### 画面フロー
```
起動 → checkMaster()
  false → Auth（初回登録: パスワード2回入力）
  true  → Auth（ロック解除: パスワード入力）
           → 認証成功 → Dashboard
                        ├─ サービスログイン一覧
                        │   └─ 検索・追加・編集・削除・パスワードコピー・表示トグル
                        ├─ DB接続一覧（同上）
                        ├─ エクスポート（平文JSON警告確認あり）
                        ├─ インポート（重複チェック・再暗号化）
                        └─ ロック → Auth に戻る
```

### インタラクション
- パスワードフィールド: デフォルト `●●●●` マスク、目アイコンでトグル
- パスワードコピー: クリップボードアイコンで一覧からワンクリックコピー
- 削除・エクスポート時: 確認ダイアログを必ず表示
- 検索: 名称などで部分一致フィルタリング

---

## 8. ビルド・配布

### 開発環境
- devcontainer (Linux) で `npm run dev` による動作確認
- `npm run format` / `npm run lint` / `npm run typecheck` を実装前・コミット前に実行

### Windows向けビルド方針
- Linux devcontainer から Windows向けクロスビルドを試みる
- `better-sqlite3` のネイティブモジュール問題でクロスビルドが困難な場合は、`npm run dev` 動作を優先
- Windows マシン上でのビルド手順を `README.md` に詳細記載

### electron-builder 設定
```yaml
productName: "KeyRack"
appId: "com.keyrack.app"
win:
  target:
    - portable
artifactName: "${productName}_Portable_${version}.${ext}"
asar: true
asarUnpack:
  - "node_modules/better-sqlite3/**"
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: always
```

---

## 9. セキュリティルール

- `nodeIntegration: false`, `contextIsolation: true` を必ず設定
- `encryptionKey` はメインプロセスのメモリのみ。レンダラーに渡さない
- TypeScript の `any` 禁止。IPC通信データは全てインターフェース化
- npmライブラリのインストール前に必ずセキュリティ調査を実施（CVE、メンテナ状況、npm audit）
