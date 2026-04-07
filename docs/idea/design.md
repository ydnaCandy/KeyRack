# アプリケーション概要設計書 (High-Level Design)

## 1. 概要
本プロジェクトは、Windows OS向けのローカル完結型パスワード管理デスクトップアプリケーションである。
アプリ名: **MyKeysApps**

外部のWebサーバー（クラウド等）やローカルホスト（localhost）を介在させず、完全なオフライン環境で動作する。
ユーザーの機密情報（パスワードやデータベースの接続情報など）をローカル環境でセキュアに管理することを目的とする。

## 2.システム構成 (System Architecture)
ElectronのメインプロセスとレンダラープロセスのIPC通信を利用してデータ通信・暗号化処理・ファイル書き込みを完結させる。

- **フロントエンド**はReactで構築され、リッチで直感的なUI（Tailwind CSS）を提供する。
- **バックエンド**はElectronのメインプロセス上で動作し、OSファイルシステムへのアクセス、SQLiteを介したローカルDBの管理、およびNode.jsのCryptoモジュールによる高度な暗号化を担う。

## 3. 技術スタック
- **Framework**: Electron (electron-vite)
- **Package Manager**: npm
- **Database**: SQLite (better-sqlite3)
- **UI**: React 19 + Tailwind CSS v3 + Lucide-React (Icons)
- **Language**: TypeScript (Strict mode)
- **Encryption**: node:crypto (AES-256-GCM / PBKDF2)
- **Build Tool**: electron-builder

## 4. 実行・開発環境
- **開発環境**: macOS (Apple Silicon / Intel)
- **ターゲットOS**: Windows 10 / 11
- **配布形態**: インストーラー形式の配布
  - ユーザー環境にインストールできるよう、Windowsの標準的なインストーラー（NSIS）を使用してパッケージングを行う。

## 5. 主な機能
1. **マスターパスワード管理**:
   - 初回起動時にマスターパスワードを設定し、以降はそのパスワードを用いてアプリのロック解除を行う。
2. **サービスログイン情報管理**:
   - WebサービスなどのURL、ユーザー名、ログインパスワードの保存と管理。
3. **データベース接続情報管理**:
   - DBのIPアドレス、ポート、ユーザー名、パスワードなどの認証情報の保存と管理。
4. **セキュアな暗号化保存**:
   - 全てのパスワード情報はAES-256-GCMで強力に暗号化されてからローカルSQLiteに保存される。
5. **インポート / エクスポート**:
   - 万が一のバックアップや移行のために、JSON形式でのインポート/エクスポート機能を提供する。
