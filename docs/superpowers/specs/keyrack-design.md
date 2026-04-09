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
| UI | React 19 + Tailwind CSS v4 + Lucide-React |
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

- **テーマ**: ライトグレー基調（薄ラベンダーグレー）。レトロゲーム（スーパーファミコン）風の遊び心を取り入れる。
- **アイコン**: Lucide-React
- **言語**: 日本語（全ラベル・エラーメッセージ・確認文）

### 7.1 カラーパレット

| 用途 | 値 |
|------|----|
| 背景 | `#f4f2f9`（薄ラベンダーグレー） |
| カード・パネル | `#ffffff` |
| サブ背景 | `#ede9f8` |
| ボーダー（通常） | `#c9bce6` |
| ボーダー（強調） | `#b0a0d8` |
| テキスト（本文） | `#2a2440` |
| テキスト（補足） | `#7a6a9e` |
| アクセント | `#7c3aed` / `#6d28d9` |

アクセントカラー（スーファミボタン風）:

| 用途 | 値 |
|------|----|
| 赤（削除・警告） | `#c0392b` |
| 黄（バッジ） | `#d4a017` |
| 青（バッジ） | `#1a6fb5` |
| 緑（バッジ） | `#1a8a4a` |

### 7.2 タイポグラフィ（すべてSIL OFL・商用利用可）

| フォント | 用途 |
|----------|------|
| Silkscreen (Jason Kottke) | ラベル・ボタン・タブ・タイトル |
| DotGothic16 (FONTDASU) | 本文・日本語テキスト・入力欄 |
| IBM Plex Mono (IBM) | パスワードマスク表示 |

フォントサイズ基準:
- 本文・入力欄: 16〜18px
- カードタイトル: 18〜20px
- Silkscreenラベル: 8〜12px
- タブ: 12px

### 7.3 画面フロー

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

### 7.4 ダッシュボードレイアウト

```
┌──────┬───────────────────────────────────────┐
│アイコン│ [🔍 検索バー................] [＋ 追加] │
│サイド │─────────────────────────────────────── │
│バー  │ ▶ SERVICE LOGINS — N件               │
│(62px)│  [バッジ] サービス名                   │
│      │          user@example.com             │
│ 🌐  │          •••••••• 👁 📋   ✏️ 🗑     │
│ 🗄️  │                                        │
│ ─── │                                        │
│ 📤  │                                        │
│ 📥  │                                        │
│ ─── │                                        │
│ 🔒  │                                        │
└──────┴───────────────────────────────────────┘
```

- サイドバー幅: 62px（アイコンのみ、ホバーでツールチップ表示）
- ナビ: サービスログイン / DB接続管理
- 下部: エクスポート / インポート / ロック（ロックは赤色）
- セパレーター線でグループ分け

### 7.5 コンポーネント仕様

#### 認証画面 (`Auth.tsx`)
- ライトグレー背景に薄いグラデーション（紫系）
- 中央に白カード（ボーダー + 紫グロー影）
- ロゴアイコン: 紫グラデーション + 3Dシャドウ（`0 6px 0 #4c1d95`）
- タイトル: `KEYRACK`（Silkscreen）
- 初回起動: パスワード2回入力。ロック解除: パスワード1回入力
- エラー時: 赤系メッセージ表示

#### ダッシュボード カード (`Dashboard.tsx`)
- 白背景・ボーダー付き・ホバーで浮き上がる（`translateY(-1px)`）
- 左端にカラーバッジ（40×40px、スーファミ色 + 3Dシャドウ）
- バッジ色はアイテムのインデックスに応じて赤→黄→青→緑をサイクル
- パスワードはデフォルトマスク（`••••••••`）、👁ボタンで表示トグル
- 削除ボタンは赤系で危険性を明示

#### モーダル (`ServiceLoginModal.tsx` / `DbConnectionModal.tsx`)
- 背景: 半透明の紫がかった黒 + `backdrop-filter: blur`
- カード: 白・角丸14px・紫グロー影
- ユーザー名・パスワードフィールドは2列グリッド
- ボタン: キャンセル（グレー）/ 保存（紫グラデーション3D押し込み）
- 必須フィールドには赤の `*` マーク

### 7.6 インタラクション仕様

| 操作 | 挙動 |
|------|------|
| カードホバー | `translateY(-1px)` + ボーダー強調 |
| ボタン押下 | `translateY(2〜5px)` で3D押し込み感 |
| 検索入力フォーカス | 紫ボーダー + 薄紫グロー |
| パスワード表示トグル | 👁アイコンで当該カードのみ切替 |
| コピー完了 | アイコンを一時変化（2秒） |
| 削除確認 | confirmダイアログを必ず表示 |
| エクスポート | 平文出力の警告確認あり |

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
