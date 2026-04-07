# KeyRack

ローカル完結型パスワード管理デスクトップアプリケーション。
外部サーバーやクラウドを一切使わず、全データをローカルSQLiteに AES-256-GCM で暗号化して保存します。

## 開発環境での起動 (devcontainer)

```bash
# 仮想ディスプレイを起動
start-xvfb

# 依存関係インストール（初回のみ）
npm install

# 開発サーバー起動（HMR有効）
DISPLAY=:99 npm run dev
```

## Windows向け実行ファイルのビルド手順

### 前提条件（Windowsマシン上での実行）

以下のソフトウェアをインストールしてください:

1. **Node.js v20.x**
   https://nodejs.org/en/download から LTS版をインストール

2. **Visual Studio Build Tools 2022**
   `better-sqlite3` のネイティブモジュールビルドに必要です。
   https://visualstudio.microsoft.com/ja/visual-cpp-build-tools/
   インストール時に「C++ によるデスクトップ開発」を選択してください。

3. **Python 3.x**
   https://www.python.org/downloads/
   インストール時に「Add Python to PATH」にチェックを入れてください。

4. **Git**
   https://git-scm.com/download/win

### ビルド手順

```powershell
# 1. リポジトリをクローン
git clone <repository-url>
cd KeyRack

# 2. 依存関係インストール（better-sqlite3 がWindowsネイティブでビルドされる）
npm install

# 3. Windows向けポータブル実行ファイルをビルド
npm run build:win
```

ビルド成功後、`dist/` ディレクトリに `KeyRack_Portable_x.x.x.exe` が生成されます。
このファイルをそのまま実行することでアプリが起動します（インストール不要）。

### ビルド成果物

| ファイル | 説明 |
|---------|------|
| `dist/KeyRack_Portable_*.exe` | インストール不要のポータブル版 |

### データの保存先

アプリのデータは以下に保存されます:

- **Windows**: `C:\Users\[ユーザー名]\Documents\KeyRack\data\vault.db`

### トラブルシューティング

**`node-gyp` 関連エラーが出る場合**
Visual Studio Build Tools が正しくインストールされているか確認してください。
PowerShell（管理者）で以下を実行すると解決することがあります:

```powershell
npm install --global windows-build-tools
```

**`better-sqlite3` のビルドに失敗する場合**
Electron のバージョンに合わせたネイティブモジュールを再ビルドします:

```powershell
npx electron-rebuild -f -w better-sqlite3
```

## 開発コマンド一覧

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動（HMR有効） |
| `npm run build` | JS/TSバンドルのビルド |
| `npm run build:win` | Windows向けポータブル版ビルド |
| `npm run lint` | ESLintによる静的解析 |
| `npm run typecheck` | TypeScript型チェック |
| `npm run format` | Prettierによるコードフォーマット |
| `npm test` | ユニットテスト実行 |
| `npm run test:coverage` | テストカバレッジレポート |

## セキュリティについて

- マスターパスワードは **PBKDF2** (100,000イテレーション, SHA-512) でハッシュ化して保存
- 全パスワードは **AES-256-GCM** で暗号化してSQLiteに保存
- 暗号鍵はメモリのみで保持し、DBには保存しない
- ロック操作で暗号鍵を即時破棄
