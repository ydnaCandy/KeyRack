# KeyRack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Electron + React + TypeScript によるローカル完結型パスワード管理デスクトップアプリ KeyRack を実装する

**Architecture:** electron-vite の React + TypeScript テンプレートをベースに、メインプロセスで暗号化・DB処理を実装し、contextBridge 経由で window.api としてレンダラーに公開する。暗号鍵はメインプロセスのメモリのみに保持し、レンダラーには渡さない。

**Tech Stack:** Electron (electron-vite), React 19, TypeScript strict, Tailwind CSS v3, better-sqlite3, Lucide-React, node:crypto (AES-256-GCM/PBKDF2), electron-builder, vitest

---

## ファイル構成

```
KeyRack/
├── src/
│   ├── shared/
│   │   └── interfaces.ts      # メイン・プリロード・レンダラー共通の型定義
│   ├── main/
│   │   ├── index.ts           # BrowserWindow生成・IPC登録・DB初期化
│   │   ├── db.ts              # better-sqlite3 初期化・テーブル作成
│   │   ├── crypto.ts          # AES-256-GCM / PBKDF2
│   │   └── ipcHandlers.ts     # 全IPC実装・encryptionKey管理
│   ├── preload/
│   │   ├── index.ts           # contextBridge で window.api を公開
│   │   └── index.d.ts         # window.api の TypeScript 型定義
│   └── renderer/
│       └── src/
│           ├── main.tsx        # React エントリーポイント
│           ├── App.tsx         # 認証状態ルーティング
│           ├── index.css       # Tailwind CSS ディレクティブ
│           └── components/
│               ├── Auth.tsx
│               ├── Dashboard.tsx
│               ├── ServiceLoginModal.tsx
│               └── DbConnectionModal.tsx
├── tests/
│   └── main/
│       ├── crypto.test.ts
│       └── db.test.ts
├── electron-builder.yml
├── electron.vite.config.ts
├── vitest.config.ts
├── package.json
└── README.md
```

---

## Task 1: プロジェクトスキャフォールド

**Files:**
- Create: `package.json`, `electron.vite.config.ts`, `tsconfig*.json`, `src/` 基本構造, `resources/`

- [ ] **Step 1: electron-vite で一時ディレクトリにスキャフォールド**

```bash
cd /tmp && npm create @quick-start/electron@latest keyrack-scaffold -- --template react-ts
```

Expected: `/tmp/keyrack-scaffold/` が生成される

- [ ] **Step 2: スキャフォールドファイルを KeyRack ディレクトリにコピー**

```bash
cd /tmp/keyrack-scaffold
# 既存の docs/, CLAUDE.md, .devcontainer/, README.md は上書きしない
cp package.json /workspaces/KeyRack/
cp electron.vite.config.ts /workspaces/KeyRack/
cp tsconfig.json tsconfig.node.json tsconfig.web.json /workspaces/KeyRack/
cp -r src /workspaces/KeyRack/
cp -r resources /workspaces/KeyRack/ 2>/dev/null || true
# eslint/prettier設定ファイル（存在する場合）
cp .eslintrc.cjs /workspaces/KeyRack/ 2>/dev/null || true
cp eslint.config.mjs /workspaces/KeyRack/ 2>/dev/null || true
cp .prettierrc.yaml /workspaces/KeyRack/ 2>/dev/null || true
cp .gitignore /workspaces/KeyRack/ 2>/dev/null || true
```

- [ ] **Step 3: コピー結果を確認**

```bash
ls /workspaces/KeyRack/
```

Expected: `package.json`, `electron.vite.config.ts`, `tsconfig.json`, `src/`, `resources/` が存在する

- [ ] **Step 4: コミット（スキャフォールド基盤）**

```bash
cd /workspaces/KeyRack
git add package.json electron.vite.config.ts tsconfig.json tsconfig.node.json tsconfig.web.json src/ resources/ .eslintrc.cjs eslint.config.mjs .prettierrc.yaml .gitignore 2>/dev/null; git add -u
git commit -m "chore: electron-vite react-ts テンプレートをスキャフォールド"
```

---

## Task 2: 依存関係のセキュリティ調査とインストール

**Files:**
- Modify: `package.json`

**注意:** 各パッケージのインストール前に必ずセキュリティ調査を実施すること。

- [ ] **Step 1: 追加パッケージのセキュリティ調査**

以下のコマンドで各パッケージの情報を確認する。確認観点: バージョン・最終更新日・週次ダウンロード数・メンテナ。

```bash
npm info better-sqlite3 version description maintainers time.modified
npm info lucide-react version description maintainers time.modified
npm info tailwindcss version description maintainers time.modified
npm info autoprefixer version description maintainers time.modified
npm info postcss version description maintainers time.modified
npm info electron-builder version description maintainers time.modified
npm info @electron/rebuild version description maintainers time.modified
npm info vitest version description maintainers time.modified
npm info @vitest/coverage-v8 version description maintainers time.modified
```

Expected (2026年時点の目安):
- `better-sqlite3`: v9.x, メンテナ: JoshuaWise, 週次数百万DL
- `lucide-react`: v0.4xx, 週次数百万DL
- `tailwindcss`: v3.4.x, Tailwind Labs
- `electron-builder`: v24.x 以上
- `vitest`: v2.x 以上

調査結果に不審な点（急激なメンテナ変更・異常なファイルサイズ・不明なスクリプト）がある場合は作業を中断してユーザーに報告すること。

- [ ] **Step 2: 本番依存パッケージのインストール**

```bash
cd /workspaces/KeyRack
npm install better-sqlite3
npm install lucide-react
```

- [ ] **Step 3: 開発依存パッケージのインストール**

```bash
npm install -D tailwindcss postcss autoprefixer
npm install -D electron-builder @electron/rebuild
npm install -D vitest @vitest/coverage-v8
npm install -D @types/better-sqlite3
```

- [ ] **Step 4: セキュリティ監査**

```bash
npm audit
```

Expected: 脆弱性が報告されないこと。`moderate` 以上の脆弱性がある場合はユーザーに報告し、対処を相談する。

- [ ] **Step 5: Tailwind CSS 設定ファイルを初期化**

```bash
npx tailwindcss init -p
```

Expected: `tailwind.config.js` と `postcss.config.js` が生成される

- [ ] **Step 6: コミット**

```bash
git add package.json package-lock.json tailwind.config.js postcss.config.js
git commit -m "chore: 依存関係をインストール（セキュリティ調査済み）"
```

---

## Task 3: TypeScript / Tailwind CSS / Lint 設定

**Files:**
- Modify: `tailwind.config.js`, `src/renderer/src/index.css`, `electron.vite.config.ts`, `tsconfig.node.json`, `tsconfig.web.json`, `vitest.config.ts` (Create)

- [ ] **Step 1: Tailwind CSS の content パスを設定**

`tailwind.config.js` を以下の内容に書き換える:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

- [ ] **Step 2: Tailwind CSS ディレクティブを index.css に追加**

`src/renderer/src/index.css` を以下の内容に書き換える（既存の内容は全削除）:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 3: electron.vite.config.ts に `@shared` エイリアスを追加**

electron-vite が生成した `electron.vite.config.ts` の renderer セクションに `@shared` エイリアスを追加する:

```typescript
// electron.vite.config.ts の renderer セクションの resolve.alias に追記
renderer: {
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src'),
      '@shared': resolve('src/shared'),   // ← 追加
    }
  },
  plugins: [react()]
}
```

- [ ] **Step 4: tsconfig.web.json に src/shared/ を include に追加**

`tsconfig.web.json` の `include` に `"src/shared/**/*"` を追加する:

```json
{
  "extends": "./tsconfig.json",
  "include": ["src/renderer/src/**/*", "src/shared/**/*", "electron.vite.config.*", "src/preload/index.d.ts"]
}
```

- [ ] **Step 5: tsconfig.node.json に src/shared/ を include に追加**

`tsconfig.node.json` の `include` に `"src/shared/**/*"` を追加する:

```json
{
  "extends": "./tsconfig.json",
  "include": ["src/main/**/*", "src/preload/**/*", "src/shared/**/*", "electron.vite.config.*"]
}
```

- [ ] **Step 6: vitest.config.ts を作成（メインプロセステスト用）**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/main/**/*.ts'],
      exclude: ['src/main/index.ts'],
    },
  },
})
```

- [ ] **Step 7: package.json にテストスクリプトを追加**

`package.json` の `scripts` セクションに以下を追加する（electron-vite が生成した既存スクリプトは保持）:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 8: tests ディレクトリを作成**

```bash
mkdir -p /workspaces/KeyRack/tests/main
```

- [ ] **Step 9: コミット**

```bash
cd /workspaces/KeyRack
git add tailwind.config.js postcss.config.js src/renderer/src/index.css electron.vite.config.ts tsconfig.node.json tsconfig.web.json vitest.config.ts package.json
git commit -m "chore: Tailwind CSS・vitest・@shared エイリアス設定を追加"
```

---

## Task 4: 共通型定義 (interfaces.ts)

**Files:**
- Create: `src/shared/interfaces.ts`

メインプロセス・プリロード・レンダラーの3プロセスで共通して使う型定義を `src/shared/` に置く。
これにより tsconfig.web.json の include 範囲内に収まり、全プロセスで型チェックが通る。

- [ ] **Step 1: shared ディレクトリを作成し interfaces.ts を作成**

```bash
mkdir -p /workspaces/KeyRack/src/shared
```

```typescript
// src/shared/interfaces.ts

/** サービスログイン情報の入力データ */
export interface ServiceLoginInput {
  service_name: string
  url?: string
  username?: string
  password: string
  note1?: string
  note2?: string
}

/** サービスログイン情報の取得データ（id付き、パスワードは復号済み） */
export interface ServiceLogin extends ServiceLoginInput {
  id: number
}

/** DB接続情報の入力データ */
export interface DbConnectionInput {
  name: string
  dns_name?: string
  ip_address?: string
  port?: string
  db_name?: string
  username?: string
  password: string
}

/** DB接続情報の取得データ（id付き、パスワードは復号済み） */
export interface DbConnection extends DbConnectionInput {
  id: number
}

/** API 共通レスポンス */
export interface ApiResult {
  success: boolean
  message?: string
}

/** CRUD 作成時のレスポンス */
export interface CreateResult extends ApiResult {
  id?: number
}

/** エクスポートJSONの構造 */
export interface ExportData {
  version: 1
  exported_at: string
  service_logins: ServiceLogin[]
  db_connections: DbConnection[]
}
```

- [ ] **Step 2: コミット**

```bash
cd /workspaces/KeyRack
git add src/shared/interfaces.ts
git commit -m "feat: 共通型定義(src/shared/interfaces.ts)を追加"
```

---

## Task 5: 暗号化モジュール crypto.ts (TDD)

**Files:**
- Create: `tests/main/crypto.test.ts`
- Create: `src/main/crypto.ts`

セキュリティの根幹であるため、TDDで実装する。

- [ ] **Step 1: テストファイルを作成**

```typescript
// tests/main/crypto.test.ts
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword, deriveKey, encrypt, decrypt } from '../../src/main/crypto'

describe('hashPassword / verifyPassword', () => {
  it('同じパスワードで検証が成功する', async () => {
    const { hash, salt } = await hashPassword('TestPassword123!')
    const result = await verifyPassword('TestPassword123!', hash, salt)
    expect(result).toBe(true)
  })

  it('異なるパスワードで検証が失敗する', async () => {
    const { hash, salt } = await hashPassword('TestPassword123!')
    const result = await verifyPassword('WrongPassword', hash, salt)
    expect(result).toBe(false)
  })

  it('同じパスワードでも毎回異なるソルトが生成される', async () => {
    const r1 = await hashPassword('password')
    const r2 = await hashPassword('password')
    expect(r1.salt).not.toBe(r2.salt)
    expect(r1.hash).not.toBe(r2.hash)
  })
})

describe('deriveKey', () => {
  it('同じパスワードとソルトから同じキーを導出できる', async () => {
    const { salt } = await hashPassword('password')
    const key1 = await deriveKey('password', salt)
    const key2 = await deriveKey('password', salt)
    expect(key1.toString('hex')).toBe(key2.toString('hex'))
  })

  it('導出キーは32バイト(256bit)である', async () => {
    const { salt } = await hashPassword('password')
    const key = await deriveKey('password', salt)
    expect(key.length).toBe(32)
  })
})

describe('encrypt / decrypt', () => {
  it('暗号化したデータを復号できる', async () => {
    const { salt } = await hashPassword('password')
    const key = await deriveKey('password', salt)
    const plaintext = 'super-secret-password'
    const encrypted = encrypt(plaintext, key)
    const decrypted = decrypt(encrypted, key)
    expect(decrypted).toBe(plaintext)
  })

  it('暗号文は毎回異なる（IVがランダム）', async () => {
    const { salt } = await hashPassword('password')
    const key = await deriveKey('password', salt)
    const enc1 = encrypt('same-text', key)
    const enc2 = encrypt('same-text', key)
    expect(enc1).not.toBe(enc2)
  })

  it('異なるキーでは復号に失敗する', async () => {
    const r1 = await hashPassword('password1')
    const r2 = await hashPassword('password2')
    const key1 = await deriveKey('password1', r1.salt)
    const key2 = await deriveKey('password2', r2.salt)
    const encrypted = encrypt('secret', key1)
    expect(() => decrypt(encrypted, key2)).toThrow()
  })

  it('改ざんされたデータの復号に失敗する', async () => {
    const { salt } = await hashPassword('password')
    const key = await deriveKey('password', salt)
    const encrypted = encrypt('secret', key)
    // 末尾1バイトを改ざん
    const buf = Buffer.from(encrypted, 'base64')
    buf[buf.length - 1] ^= 0xff
    const tampered = buf.toString('base64')
    expect(() => decrypt(tampered, key)).toThrow()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
cd /workspaces/KeyRack && npm test
```

Expected: `Cannot find module '../../src/main/crypto'` のエラーが出る

- [ ] **Step 3: crypto.ts を実装**

```typescript
// src/main/crypto.ts
import {
  randomBytes,
  pbkdf2,
  createCipheriv,
  createDecipheriv,
  timingSafeEqual,
} from 'node:crypto'
import { promisify } from 'node:util'

const pbkdf2Async = promisify(pbkdf2)

const PBKDF2_ITERATIONS = 100_000
const PBKDF2_DIGEST = 'sha512'
const SALT_BYTES = 32
// ハッシュ検証用のキー長（SHA-512の出力長と同じ64バイト）
const HASH_KEY_LEN = 64
// 暗号鍵の長さ（AES-256: 32バイト）
const ENC_KEY_LEN = 32
const IV_BYTES = 12
const AUTH_TAG_BYTES = 16

/**
 * マスターパスワードをハッシュ化する（DB保存用）
 * ランダムなソルトを生成してPBKDF2でハッシュ化する
 */
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const saltBuf = randomBytes(SALT_BYTES)
  const salt = saltBuf.toString('hex')
  const hashBuf = await pbkdf2Async(password, saltBuf, PBKDF2_ITERATIONS, HASH_KEY_LEN, PBKDF2_DIGEST)
  const hash = hashBuf.toString('hex')
  return { hash, salt }
}

/**
 * マスターパスワードを検証する（タイミング攻撃防止のためtimingSafeEqualを使用）
 */
export async function verifyPassword(
  password: string,
  hash: string,
  salt: string,
): Promise<boolean> {
  const saltBuf = Buffer.from(salt, 'hex')
  const hashBuf = await pbkdf2Async(password, saltBuf, PBKDF2_ITERATIONS, HASH_KEY_LEN, PBKDF2_DIGEST)
  const storedHash = Buffer.from(hash, 'hex')
  if (hashBuf.length !== storedHash.length) return false
  return timingSafeEqual(hashBuf, storedHash)
}

/**
 * マスターパスワードからデータ暗号化用の256bitキーを導出する
 * 認証完了時のみ呼び出され、メモリのみで保持される
 */
export async function deriveKey(password: string, salt: string): Promise<Buffer> {
  const saltBuf = Buffer.from(salt, 'hex')
  return pbkdf2Async(password, saltBuf, PBKDF2_ITERATIONS, ENC_KEY_LEN, PBKDF2_DIGEST)
}

/**
 * AES-256-GCM で平文を暗号化する
 * フォーマット: [IV(12bytes)][AuthTag(16bytes)][暗号文] → Base64文字列
 */
export function encrypt(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

/**
 * AES-256-GCM で暗号文を復号する
 * 改ざんがあった場合は例外をスローする
 */
export function decrypt(ciphertext: string, key: Buffer): string {
  const data = Buffer.from(ciphertext, 'base64')
  const iv = data.subarray(0, IV_BYTES)
  const authTag = data.subarray(IV_BYTES, IV_BYTES + AUTH_TAG_BYTES)
  const encrypted = data.subarray(IV_BYTES + AUTH_TAG_BYTES)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(encrypted) + decipher.final('utf8')
}
```

- [ ] **Step 4: テストが通ることを確認**

```bash
cd /workspaces/KeyRack && npm test
```

Expected: 全テスト PASS（`tests/main/crypto.test.ts` の 9 件）

- [ ] **Step 5: コミット**

```bash
git add src/main/crypto.ts tests/main/crypto.test.ts
git commit -m "feat: 暗号化モジュール(AES-256-GCM/PBKDF2)をTDDで実装"
```

---

## Task 6: DB 層 db.ts (TDD)

**Files:**
- Create: `tests/main/db.test.ts`
- Create: `src/main/db.ts`

- [ ] **Step 1: テストファイルを作成**

```typescript
// tests/main/db.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'

// db.ts の createTables をテストするため、同じSQL定義をここに複製して検証する
// （メインプロセスの app.getPath に依存しないよう in-memory で検証）
function createTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS system (
      id INTEGER PRIMARY KEY DEFAULT 1,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS service_logins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_name TEXT NOT NULL,
      url TEXT,
      username TEXT,
      password TEXT NOT NULL,
      note1 TEXT,
      note2 TEXT
    );
    CREATE TABLE IF NOT EXISTS db_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      dns_name TEXT,
      ip_address TEXT,
      port TEXT,
      db_name TEXT,
      username TEXT,
      password TEXT NOT NULL
    );
  `)
}

describe('DBテーブル操作', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    db.pragma('journal_mode = WAL')
    createTables(db)
  })

  afterEach(() => {
    db.close()
  })

  describe('system テーブル', () => {
    it('レコードを挿入・取得できる', () => {
      db.prepare('INSERT INTO system (id, password_hash, salt) VALUES (1, ?, ?)').run(
        'testhash',
        'testsalt',
      )
      const row = db.prepare('SELECT * FROM system WHERE id = 1').get() as {
        password_hash: string
        salt: string
      }
      expect(row.password_hash).toBe('testhash')
      expect(row.salt).toBe('testsalt')
    })

    it('レコードが存在しない場合は undefined を返す', () => {
      const row = db.prepare('SELECT * FROM system WHERE id = 1').get()
      expect(row).toBeUndefined()
    })
  })

  describe('service_logins テーブル', () => {
    it('必須フィールドのみでレコードを挿入できる', () => {
      const result = db
        .prepare('INSERT INTO service_logins (service_name, password) VALUES (?, ?)')
        .run('Gmail', 'encrypted-pw')
      expect(result.lastInsertRowid).toBe(1)
    })

    it('全フィールドでレコードを挿入・取得できる', () => {
      db.prepare(
        'INSERT INTO service_logins (service_name, url, username, password, note1, note2) VALUES (?, ?, ?, ?, ?, ?)',
      ).run('Gmail', 'https://gmail.com', 'user@test.com', 'enc-pw', 'メモ1', 'メモ2')
      const row = db.prepare('SELECT * FROM service_logins').get() as {
        service_name: string
        url: string
        note1: string
      }
      expect(row.service_name).toBe('Gmail')
      expect(row.url).toBe('https://gmail.com')
      expect(row.note1).toBe('メモ1')
    })

    it('レコードを削除できる', () => {
      db.prepare('INSERT INTO service_logins (service_name, password) VALUES (?, ?)').run(
        'Gmail',
        'enc-pw',
      )
      db.prepare('DELETE FROM service_logins WHERE id = 1').run()
      const rows = db.prepare('SELECT * FROM service_logins').all()
      expect(rows).toHaveLength(0)
    })
  })

  describe('db_connections テーブル', () => {
    it('必須フィールドのみでレコードを挿入できる', () => {
      const result = db
        .prepare('INSERT INTO db_connections (name, password) VALUES (?, ?)')
        .run('本番DB', 'encrypted-pw')
      expect(result.lastInsertRowid).toBe(1)
    })

    it('全フィールドでレコードを挿入・取得できる', () => {
      db.prepare(
        'INSERT INTO db_connections (name, dns_name, ip_address, port, db_name, username, password) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).run('本番DB', 'db.example.com', '192.168.1.1', '5432', 'mydb', 'admin', 'enc-pw')
      const row = db.prepare('SELECT * FROM db_connections').get() as {
        name: string
        port: string
      }
      expect(row.name).toBe('本番DB')
      expect(row.port).toBe('5432')
    })
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
cd /workspaces/KeyRack && npm test
```

Expected: db.test.ts の better-sqlite3 import で失敗、または全テスト PASS のまま（新規ファイルなので）

- [ ] **Step 3: db.ts を実装**

```typescript
// src/main/db.ts
import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'

let db: Database.Database | null = null

/**
 * データベースを初期化する
 * Documents/KeyRack/data/vault.db にDBファイルを作成し、テーブルを自動生成する
 */
export function initDatabase(): void {
  const documentsPath = app.getPath('documents')
  const dbDir = join(documentsPath, 'KeyRack', 'data')
  mkdirSync(dbDir, { recursive: true })
  const dbPath = join(dbDir, 'vault.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  createTables(db)
}

/**
 * 初期化済みのデータベースインスタンスを返す
 * initDatabase() 前に呼ぶと例外をスローする
 */
export function getDatabase(): Database.Database {
  if (!db) throw new Error('データベースが初期化されていません')
  return db
}

function createTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS system (
      id INTEGER PRIMARY KEY DEFAULT 1,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS service_logins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_name TEXT NOT NULL,
      url TEXT,
      username TEXT,
      password TEXT NOT NULL,
      note1 TEXT,
      note2 TEXT
    );
    CREATE TABLE IF NOT EXISTS db_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      dns_name TEXT,
      ip_address TEXT,
      port TEXT,
      db_name TEXT,
      username TEXT,
      password TEXT NOT NULL
    );
  `)
}
```

- [ ] **Step 4: テストが通ることを確認**

```bash
cd /workspaces/KeyRack && npm test
```

Expected: 全テスト PASS（crypto + db 合計 14件以上）

- [ ] **Step 5: コミット**

```bash
git add src/main/db.ts tests/main/db.test.ts
git commit -m "feat: DB層(better-sqlite3)をTDDで実装"
```

---

## Task 7: IPC ハンドラー (ipcHandlers.ts)

**Files:**
- Create: `src/main/ipcHandlers.ts`

encryptionKey のライフサイクル管理が最重要。テストは electron の ipcMain に依存するため、ロジックを関数として切り出してテスト可能にする。

- [ ] **Step 1: ipcHandlers.ts を作成**

```typescript
// src/main/ipcHandlers.ts
import { ipcMain, dialog, BrowserWindow } from 'electron'
import { writeFileSync, readFileSync } from 'node:fs'
import type {
  ServiceLoginInput,
  ServiceLogin,
  DbConnectionInput,
  DbConnection,
  ApiResult,
  CreateResult,
  ExportData,
} from '../shared/interfaces'
import { hashPassword, verifyPassword, deriveKey, encrypt, decrypt } from './crypto'
import { getDatabase } from './db'

// セキュリティの核心: 暗号鍵はこのモジュールのメモリのみに保持
// レンダラープロセスには絶対に渡さない
let encryptionKey: Buffer | null = null

/** 現在の暗号鍵を返す。ロック中は例外をスローする */
function requireKey(): Buffer {
  if (!encryptionKey) throw new Error('アプリがロックされています')
  return encryptionKey
}

// ─── 認証系 ──────────────────────────────────────────────────

export async function checkMaster(): Promise<boolean> {
  const db = getDatabase()
  const row = db.prepare('SELECT id FROM system WHERE id = 1').get()
  return row !== undefined
}

export async function registerMaster(password: string): Promise<ApiResult> {
  try {
    const db = getDatabase()
    const { hash, salt } = await hashPassword(password)
    db.prepare('INSERT INTO system (id, password_hash, salt) VALUES (1, ?, ?)').run(hash, salt)
    encryptionKey = await deriveKey(password, salt)
    return { success: true }
  } catch (error) {
    return { success: false, message: `登録に失敗しました: ${(error as Error).message}` }
  }
}

export async function unlockMaster(password: string): Promise<ApiResult> {
  try {
    const db = getDatabase()
    const row = db.prepare('SELECT password_hash, salt FROM system WHERE id = 1').get() as
      | { password_hash: string; salt: string }
      | undefined
    if (!row) return { success: false, message: 'マスターパスワードが設定されていません' }

    const isValid = await verifyPassword(password, row.password_hash, row.salt)
    if (!isValid) return { success: false, message: 'パスワードが違います' }

    encryptionKey = await deriveKey(password, row.salt)
    return { success: true }
  } catch (error) {
    return { success: false, message: `認証に失敗しました: ${(error as Error).message}` }
  }
}

export function lockApp(): ApiResult {
  encryptionKey = null
  return { success: true }
}

// ─── サービスログイン ────────────────────────────────────────

export function listServiceLogins(): { success: boolean; data?: ServiceLogin[]; message?: string } {
  try {
    const key = requireKey()
    const db = getDatabase()
    const rows = db.prepare('SELECT * FROM service_logins').all() as Array<
      Omit<ServiceLogin, 'password'> & { password: string }
    >
    const data: ServiceLogin[] = rows.map((row) => ({
      ...row,
      password: decrypt(row.password, key),
    }))
    return { success: true, data }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
}

export function createServiceLogin(input: ServiceLoginInput): CreateResult {
  try {
    const key = requireKey()
    const db = getDatabase()
    const result = db
      .prepare(
        'INSERT INTO service_logins (service_name, url, username, password, note1, note2) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(
        input.service_name,
        input.url ?? null,
        input.username ?? null,
        encrypt(input.password, key),
        input.note1 ?? null,
        input.note2 ?? null,
      )
    return { success: true, id: Number(result.lastInsertRowid) }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
}

export function updateServiceLogin(id: number, input: ServiceLoginInput): ApiResult {
  try {
    const key = requireKey()
    const db = getDatabase()
    db.prepare(
      'UPDATE service_logins SET service_name=?, url=?, username=?, password=?, note1=?, note2=? WHERE id=?',
    ).run(
      input.service_name,
      input.url ?? null,
      input.username ?? null,
      encrypt(input.password, key),
      input.note1 ?? null,
      input.note2 ?? null,
      id,
    )
    return { success: true }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
}

export function deleteServiceLogin(id: number): ApiResult {
  try {
    const db = getDatabase()
    db.prepare('DELETE FROM service_logins WHERE id = ?').run(id)
    return { success: true }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
}

// ─── DB接続 ──────────────────────────────────────────────────

export function listDbConnections(): {
  success: boolean
  data?: DbConnection[]
  message?: string
} {
  try {
    const key = requireKey()
    const db = getDatabase()
    const rows = db.prepare('SELECT * FROM db_connections').all() as Array<
      Omit<DbConnection, 'password'> & { password: string }
    >
    const data: DbConnection[] = rows.map((row) => ({
      ...row,
      password: decrypt(row.password, key),
    }))
    return { success: true, data }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
}

export function createDbConnection(input: DbConnectionInput): CreateResult {
  try {
    const key = requireKey()
    const db = getDatabase()
    const result = db
      .prepare(
        'INSERT INTO db_connections (name, dns_name, ip_address, port, db_name, username, password) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        input.name,
        input.dns_name ?? null,
        input.ip_address ?? null,
        input.port ?? null,
        input.db_name ?? null,
        input.username ?? null,
        encrypt(input.password, key),
      )
    return { success: true, id: Number(result.lastInsertRowid) }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
}

export function updateDbConnection(id: number, input: DbConnectionInput): ApiResult {
  try {
    const key = requireKey()
    const db = getDatabase()
    db.prepare(
      'UPDATE db_connections SET name=?, dns_name=?, ip_address=?, port=?, db_name=?, username=?, password=? WHERE id=?',
    ).run(
      input.name,
      input.dns_name ?? null,
      input.ip_address ?? null,
      input.port ?? null,
      input.db_name ?? null,
      input.username ?? null,
      encrypt(input.password, key),
      id,
    )
    return { success: true }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
}

export function deleteDbConnection(id: number): ApiResult {
  try {
    const db = getDatabase()
    db.prepare('DELETE FROM db_connections WHERE id = ?').run(id)
    return { success: true }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
}

// ─── エクスポート・インポート ─────────────────────────────────

export async function exportData(browserWindow: BrowserWindow): Promise<ApiResult> {
  try {
    const key = requireKey()
    const db = getDatabase()

    const { response } = await dialog.showMessageBox(browserWindow, {
      type: 'warning',
      buttons: ['エクスポートする', 'キャンセル'],
      defaultId: 1,
      cancelId: 1,
      title: '警告',
      message: 'パスワードが平文で出力されます',
      detail:
        'エクスポートされたJSONファイルには全てのパスワードが平文で含まれます。\n安全な場所に保存し、不要になったら必ず削除してください。',
    })
    if (response === 1) return { success: false, message: 'キャンセルされました' }

    const { filePath, canceled } = await dialog.showSaveDialog(browserWindow, {
      title: 'エクスポート先を選択',
      defaultPath: 'keyrack-backup.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (canceled || !filePath) return { success: false, message: 'キャンセルされました' }

    const serviceLoginRows = db.prepare('SELECT * FROM service_logins').all() as Array<
      Omit<ServiceLogin, 'password'> & { password: string }
    >
    const dbConnectionRows = db.prepare('SELECT * FROM db_connections').all() as Array<
      Omit<DbConnection, 'password'> & { password: string }
    >

    const exportData: ExportData = {
      version: 1,
      exported_at: new Date().toISOString(),
      service_logins: serviceLoginRows.map((r) => ({ ...r, password: decrypt(r.password, key) })),
      db_connections: dbConnectionRows.map((r) => ({ ...r, password: decrypt(r.password, key) })),
    }

    writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf-8')
    return { success: true, message: `エクスポート完了: ${filePath}` }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
}

export async function importData(browserWindow: BrowserWindow): Promise<ApiResult> {
  try {
    const key = requireKey()
    const db = getDatabase()

    const { filePaths, canceled } = await dialog.showOpenDialog(browserWindow, {
      title: 'インポートするファイルを選択',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    })
    if (canceled || filePaths.length === 0) return { success: false, message: 'キャンセルされました' }

    const raw = readFileSync(filePaths[0], 'utf-8')
    const data: ExportData = JSON.parse(raw)
    if (data.version !== 1) return { success: false, message: '非対応のバックアップ形式です' }

    let importedCount = 0

    // サービスログインのインポート（service_name + url が同じ場合はスキップ）
    const insertServiceLogin = db.prepare(
      'INSERT OR IGNORE INTO service_logins (service_name, url, username, password, note1, note2) SELECT ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM service_logins WHERE service_name = ? AND url IS ? )',
    )
    for (const item of data.service_logins) {
      const result = insertServiceLogin.run(
        item.service_name,
        item.url ?? null,
        item.username ?? null,
        encrypt(item.password, key),
        item.note1 ?? null,
        item.note2 ?? null,
        item.service_name,
        item.url ?? null,
      )
      importedCount += Number(result.changes)
    }

    // DB接続のインポート（name が同じ場合はスキップ）
    const insertDbConnection = db.prepare(
      'INSERT INTO db_connections (name, dns_name, ip_address, port, db_name, username, password) SELECT ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM db_connections WHERE name = ?)',
    )
    for (const item of data.db_connections) {
      const result = insertDbConnection.run(
        item.name,
        item.dns_name ?? null,
        item.ip_address ?? null,
        item.port ?? null,
        item.db_name ?? null,
        item.username ?? null,
        encrypt(item.password, key),
        item.name,
      )
      importedCount += Number(result.changes)
    }

    return { success: true, message: `${importedCount}件をインポートしました` }
  } catch (error) {
    return { success: false, message: `インポートに失敗しました: ${(error as Error).message}` }
  }
}

// ─── IPC ハンドラー登録 ───────────────────────────────────────

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle('check-master', () => checkMaster())
  ipcMain.handle('register-master', (_e, password: string) => registerMaster(password))
  ipcMain.handle('unlock-master', (_e, password: string) => unlockMaster(password))
  ipcMain.handle('lock-app', () => lockApp())

  ipcMain.handle('list-service-logins', () => listServiceLogins())
  ipcMain.handle('create-service-login', (_e, data: ServiceLoginInput) => createServiceLogin(data))
  ipcMain.handle('update-service-login', (_e, id: number, data: ServiceLoginInput) =>
    updateServiceLogin(id, data),
  )
  ipcMain.handle('delete-service-login', (_e, id: number) => deleteServiceLogin(id))

  ipcMain.handle('list-db-connections', () => listDbConnections())
  ipcMain.handle('create-db-connection', (_e, data: DbConnectionInput) => createDbConnection(data))
  ipcMain.handle('update-db-connection', (_e, id: number, data: DbConnectionInput) =>
    updateDbConnection(id, data),
  )
  ipcMain.handle('delete-db-connection', (_e, id: number) => deleteDbConnection(id))

  ipcMain.handle('export-data', () => exportData(mainWindow))
  ipcMain.handle('import-data', () => importData(mainWindow))
}
```

- [ ] **Step 2: テストを実行して既存テストが壊れていないことを確認**

```bash
cd /workspaces/KeyRack && npm test
```

Expected: crypto + db の全テスト PASS（ipcHandlers.ts に対するテストはこの時点では不要）

- [ ] **Step 3: コミット**

```bash
git add src/main/ipcHandlers.ts src/main/interfaces.ts
git commit -m "feat: IPCハンドラー・認証・CRUD・エクスポートインポートを実装"
```

---

## Task 8: Preload (index.ts + index.d.ts)

**Files:**
- Modify: `src/preload/index.ts`
- Modify: `src/preload/index.d.ts`

- [ ] **Step 1: preload/index.ts を書き換える**

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'
import type {
  ServiceLoginInput,
  ServiceLogin,
  DbConnectionInput,
  DbConnection,
  ApiResult,
  CreateResult,
} from '../shared/interfaces'

// window.api として安全に公開する
// メインプロセスの IPC チャンネル名と 1:1 に対応する
contextBridge.exposeInMainWorld('api', {
  // 認証
  checkMaster: (): Promise<boolean> => ipcRenderer.invoke('check-master'),
  registerMaster: (password: string): Promise<ApiResult> =>
    ipcRenderer.invoke('register-master', password),
  unlockMaster: (password: string): Promise<ApiResult> =>
    ipcRenderer.invoke('unlock-master', password),
  lockApp: (): Promise<ApiResult> => ipcRenderer.invoke('lock-app'),

  // サービスログイン
  listServiceLogins: (): Promise<{ success: boolean; data?: ServiceLogin[]; message?: string }> =>
    ipcRenderer.invoke('list-service-logins'),
  createServiceLogin: (data: ServiceLoginInput): Promise<CreateResult> =>
    ipcRenderer.invoke('create-service-login', data),
  updateServiceLogin: (id: number, data: ServiceLoginInput): Promise<ApiResult> =>
    ipcRenderer.invoke('update-service-login', id, data),
  deleteServiceLogin: (id: number): Promise<ApiResult> =>
    ipcRenderer.invoke('delete-service-login', id),

  // DB接続
  listDbConnections: (): Promise<{ success: boolean; data?: DbConnection[]; message?: string }> =>
    ipcRenderer.invoke('list-db-connections'),
  createDbConnection: (data: DbConnectionInput): Promise<CreateResult> =>
    ipcRenderer.invoke('create-db-connection', data),
  updateDbConnection: (id: number, data: DbConnectionInput): Promise<ApiResult> =>
    ipcRenderer.invoke('update-db-connection', id, data),
  deleteDbConnection: (id: number): Promise<ApiResult> =>
    ipcRenderer.invoke('delete-db-connection', id),

  // エクスポート・インポート
  exportData: (): Promise<ApiResult> => ipcRenderer.invoke('export-data'),
  importData: (): Promise<ApiResult> => ipcRenderer.invoke('import-data'),
})
```

- [ ] **Step 2: preload/index.d.ts を書き換える**

```typescript
// src/preload/index.d.ts
import type {
  ServiceLoginInput,
  ServiceLogin,
  DbConnectionInput,
  DbConnection,
  ApiResult,
  CreateResult,
} from '../shared/interfaces'

declare global {
  interface Window {
    api: {
      checkMaster(): Promise<boolean>
      registerMaster(password: string): Promise<ApiResult>
      unlockMaster(password: string): Promise<ApiResult>
      lockApp(): Promise<ApiResult>

      listServiceLogins(): Promise<{ success: boolean; data?: ServiceLogin[]; message?: string }>
      createServiceLogin(data: ServiceLoginInput): Promise<CreateResult>
      updateServiceLogin(id: number, data: ServiceLoginInput): Promise<ApiResult>
      deleteServiceLogin(id: number): Promise<ApiResult>

      listDbConnections(): Promise<{ success: boolean; data?: DbConnection[]; message?: string }>
      createDbConnection(data: DbConnectionInput): Promise<CreateResult>
      updateDbConnection(id: number, data: DbConnectionInput): Promise<ApiResult>
      deleteDbConnection(id: number): Promise<ApiResult>

      exportData(): Promise<ApiResult>
      importData(): Promise<ApiResult>
    }
  }
}
```

- [ ] **Step 3: コミット**

```bash
git add src/preload/index.ts src/preload/index.d.ts
git commit -m "feat: preload contextBridge で window.api を公開"
```

---

## Task 9: メインプロセス (main/index.ts)

**Files:**
- Modify: `src/main/index.ts`

- [ ] **Step 1: main/index.ts を書き換える**

```typescript
// src/main/index.ts
import { app, BrowserWindow, shell } from 'electron'
import { join } from 'node:path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase } from './db'
import { registerIpcHandlers } from './ipcHandlers'

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'KeyRack',
    autoHideMenuBar: true,
    webPreferences: {
      // セキュリティ設定: Node.js APIをレンダラーに公開しない
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // 外部リンクはデフォルトブラウザで開く
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.keyrack.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // DB初期化
  initDatabase()

  // メインウィンドウ生成・IPC登録
  const mainWindow = createWindow()
  registerIpcHandlers(mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const w = createWindow()
      registerIpcHandlers(w)
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
```

- [ ] **Step 2: テストが引き続き通ることを確認**

```bash
cd /workspaces/KeyRack && npm test
```

Expected: 全テスト PASS

- [ ] **Step 3: コミット**

```bash
git add src/main/index.ts
git commit -m "feat: メインプロセス BrowserWindow・セキュリティ設定を実装"
```

---

## Task 10: Auth コンポーネント

**Files:**
- Modify: `src/renderer/src/components/Auth.tsx` (Create)

- [ ] **Step 1: Auth.tsx を作成**

```tsx
// src/renderer/src/components/Auth.tsx
import { useState } from 'react'
import { KeyRound, Lock, Loader2 } from 'lucide-react'

interface AuthProps {
  isFirstTime: boolean
  onAuthenticated: () => void
}

export function Auth({ isFirstTime, onAuthenticated }: AuthProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (isFirstTime) {
      if (password.length < 8) {
        setError('パスワードは8文字以上で入力してください')
        return
      }
      if (password !== confirmPassword) {
        setError('パスワードが一致しません')
        return
      }
    }

    setLoading(true)
    try {
      const result = isFirstTime
        ? await window.api.registerMaster(password)
        : await window.api.unlockMaster(password)

      if (result.success) {
        onAuthenticated()
      } else {
        setError(result.message ?? '認証に失敗しました')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <KeyRound className="text-blue-400 w-14 h-14 mb-3" />
          <h1 className="text-3xl font-bold text-white">KeyRack</h1>
          <p className="text-gray-400 mt-2 text-sm text-center">
            {isFirstTime
              ? 'マスターパスワードを設定してください'
              : 'マスターパスワードを入力してください'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              マスターパスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="パスワードを入力"
              required
              autoFocus
              disabled={loading}
            />
          </div>

          {isFirstTime && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                パスワードの確認
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="パスワードを再入力"
                required
                disabled={loading}
              />
            </div>
          )}

          {error && (
            <div className="bg-red-900/40 border border-red-700 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Lock className="w-5 h-5" />
            )}
            {loading ? '処理中...' : isFirstTime ? '設定する' : 'ロック解除'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: components ディレクトリが存在することを確認**

```bash
ls src/renderer/src/components/
```

Expected: `Auth.tsx` が存在する

- [ ] **Step 3: コミット**

```bash
git add src/renderer/src/components/Auth.tsx
git commit -m "feat: 認証画面(Auth)コンポーネントを実装"
```

---

## Task 11: ServiceLoginModal コンポーネント

**Files:**
- Create: `src/renderer/src/components/ServiceLoginModal.tsx`

- [ ] **Step 1: ServiceLoginModal.tsx を作成**

```tsx
// src/renderer/src/components/ServiceLoginModal.tsx
import { useState, useEffect } from 'react'
import { X, Eye, EyeOff, Loader2 } from 'lucide-react'
import type { ServiceLogin, ServiceLoginInput } from '@shared/interfaces'

interface ServiceLoginModalProps {
  item: ServiceLogin | null  // null = 新規追加, non-null = 編集
  onClose: () => void
  onSaved: () => void
}

export function ServiceLoginModal({ item, onClose, onSaved }: ServiceLoginModalProps) {
  const [form, setForm] = useState<ServiceLoginInput>({
    service_name: '',
    url: '',
    username: '',
    password: '',
    note1: '',
    note2: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (item) {
      setForm({
        service_name: item.service_name,
        url: item.url ?? '',
        username: item.username ?? '',
        password: item.password,
        note1: item.note1 ?? '',
        note2: item.note2 ?? '',
      })
    }
  }, [item])

  const handleChange = (field: keyof ServiceLoginInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = item
        ? await window.api.updateServiceLogin(item.id, form)
        : await window.api.createServiceLogin(form)

      if (result.success) {
        onSaved()
        onClose()
      } else {
        setError(result.message ?? '保存に失敗しました')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            {item ? 'サービスログイン情報を編集' : 'サービスログイン情報を追加'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              サービス名 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.service_name}
              onChange={handleChange('service_name')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: Gmail"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">URL</label>
            <input
              type="text"
              value={form.url}
              onChange={handleChange('url')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: https://gmail.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              ユーザー名 / メールアドレス
            </label>
            <input
              type="text"
              value={form.username}
              onChange={handleChange('username')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: user@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              パスワード <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange('password')}
                className="w-full px-3 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="パスワードを入力"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">備考1</label>
            <input
              type="text"
              value={form.note1}
              onChange={handleChange('note1')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="予備の登録項目など"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">備考2</label>
            <input
              type="text"
              value={form.note2}
              onChange={handleChange('note2')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="追加設定やシークレットキーなど"
            />
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-700 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add src/renderer/src/components/ServiceLoginModal.tsx
git commit -m "feat: サービスログイン追加・編集モーダルを実装"
```

---

## Task 12: DbConnectionModal コンポーネント

**Files:**
- Create: `src/renderer/src/components/DbConnectionModal.tsx`

- [ ] **Step 1: DbConnectionModal.tsx を作成**

```tsx
// src/renderer/src/components/DbConnectionModal.tsx
import { useState, useEffect } from 'react'
import { X, Eye, EyeOff, Loader2 } from 'lucide-react'
import type { DbConnection, DbConnectionInput } from '@shared/interfaces'

interface DbConnectionModalProps {
  item: DbConnection | null
  onClose: () => void
  onSaved: () => void
}

export function DbConnectionModal({ item, onClose, onSaved }: DbConnectionModalProps) {
  const [form, setForm] = useState<DbConnectionInput>({
    name: '',
    dns_name: '',
    ip_address: '',
    port: '',
    db_name: '',
    username: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name,
        dns_name: item.dns_name ?? '',
        ip_address: item.ip_address ?? '',
        port: item.port ?? '',
        db_name: item.db_name ?? '',
        username: item.username ?? '',
        password: item.password,
      })
    }
  }, [item])

  const handleChange = (field: keyof DbConnectionInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = item
        ? await window.api.updateDbConnection(item.id, form)
        : await window.api.createDbConnection(form)

      if (result.success) {
        onSaved()
        onClose()
      } else {
        setError(result.message ?? '保存に失敗しました')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-700 sticky top-0 bg-gray-800">
          <h2 className="text-lg font-semibold text-white">
            {item ? 'DB接続情報を編集' : 'DB接続情報を追加'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              名称 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={handleChange('name')}
              className={inputClass}
              placeholder="例: 本番DB"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                ホスト / DNS名
              </label>
              <input
                type="text"
                value={form.dns_name}
                onChange={handleChange('dns_name')}
                className={inputClass}
                placeholder="db.example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">IPアドレス</label>
              <input
                type="text"
                value={form.ip_address}
                onChange={handleChange('ip_address')}
                className={inputClass}
                placeholder="192.168.1.1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">ポート</label>
              <input
                type="text"
                value={form.port}
                onChange={handleChange('port')}
                className={inputClass}
                placeholder="5432"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">DB名</label>
              <input
                type="text"
                value={form.db_name}
                onChange={handleChange('db_name')}
                className={inputClass}
                placeholder="mydb"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">ユーザー名</label>
            <input
              type="text"
              value={form.username}
              onChange={handleChange('username')}
              className={inputClass}
              placeholder="admin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              パスワード <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange('password')}
                className={`${inputClass} pr-10`}
                placeholder="パスワードを入力"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-700 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add src/renderer/src/components/DbConnectionModal.tsx
git commit -m "feat: DB接続追加・編集モーダルを実装"
```

---

## Task 13: Dashboard コンポーネント

**Files:**
- Create: `src/renderer/src/components/Dashboard.tsx`

- [ ] **Step 1: Dashboard.tsx を作成**

```tsx
// src/renderer/src/components/Dashboard.tsx
import { useState, useEffect, useCallback } from 'react'
import {
  Globe,
  Database,
  Lock,
  Plus,
  Search,
  Eye,
  EyeOff,
  Clipboard,
  ClipboardCheck,
  Pencil,
  Trash2,
  Upload,
  Download,
  KeyRound,
} from 'lucide-react'
import type { ServiceLogin, DbConnection } from '@shared/interfaces'
import { ServiceLoginModal } from './ServiceLoginModal'
import { DbConnectionModal } from './DbConnectionModal'

type Tab = 'service' | 'db'

interface DashboardProps {
  onLocked: () => void
}

export function Dashboard({ onLocked }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('service')
  const [serviceLogins, setServiceLogins] = useState<ServiceLogin[]>([])
  const [dbConnections, setDbConnections] = useState<DbConnection[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set())
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [editingServiceLogin, setEditingServiceLogin] = useState<ServiceLogin | null | undefined>(
    undefined,
  ) // undefined = 閉じている, null = 新規
  const [editingDbConnection, setEditingDbConnection] = useState<DbConnection | null | undefined>(
    undefined,
  )
  const [statusMessage, setStatusMessage] = useState('')

  const loadData = useCallback(async () => {
    if (activeTab === 'service') {
      const result = await window.api.listServiceLogins()
      if (result.success && result.data) setServiceLogins(result.data)
    } else {
      const result = await window.api.listDbConnections()
      if (result.success && result.data) setDbConnections(result.data)
    }
  }, [activeTab])

  useEffect(() => {
    loadData()
    setSearchQuery('')
    setVisiblePasswords(new Set())
  }, [activeTab, loadData])

  const showStatus = (message: string) => {
    setStatusMessage(message)
    setTimeout(() => setStatusMessage(''), 3000)
  }

  const handleLock = async () => {
    await window.api.lockApp()
    onLocked()
  }

  const togglePasswordVisibility = (id: number) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleCopy = async (id: number, password: string) => {
    await navigator.clipboard.writeText(password)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDeleteServiceLogin = async (id: number) => {
    const confirmed = confirm('このサービスログイン情報を削除しますか？\nこの操作は元に戻せません。')
    if (!confirmed) return
    const result = await window.api.deleteServiceLogin(id)
    if (result.success) {
      setServiceLogins((prev) => prev.filter((item) => item.id !== id))
    }
  }

  const handleDeleteDbConnection = async (id: number) => {
    const confirmed = confirm('このDB接続情報を削除しますか？\nこの操作は元に戻せません。')
    if (!confirmed) return
    const result = await window.api.deleteDbConnection(id)
    if (result.success) {
      setDbConnections((prev) => prev.filter((item) => item.id !== id))
    }
  }

  const handleExport = async () => {
    const result = await window.api.exportData()
    showStatus(result.message ?? (result.success ? 'エクスポート完了' : 'エクスポート失敗'))
  }

  const handleImport = async () => {
    const result = await window.api.importData()
    if (result.success) {
      await loadData()
    }
    showStatus(result.message ?? (result.success ? 'インポート完了' : 'インポート失敗'))
  }

  // 検索フィルタ
  const filteredServiceLogins = serviceLogins.filter(
    (item) =>
      item.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.username ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.url ?? '').toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const filteredDbConnections = dbConnections.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.db_name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.ip_address ?? '').toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const cardClass = 'bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors'
  const btnIconClass = 'p-1.5 rounded-lg transition-colors'

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* サイドバー */}
      <aside className="w-56 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700 flex items-center gap-2">
          <KeyRound className="text-blue-400 w-6 h-6" />
          <span className="font-bold text-lg">KeyRack</span>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <button
            onClick={() => setActiveTab('service')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'service'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" />
            サービスログイン
          </button>
          <button
            onClick={() => setActiveTab('db')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'db'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <Database className="w-4 h-4" />
            DB接続管理
          </button>
        </nav>

        <div className="p-3 border-t border-gray-700 space-y-1">
          <button
            onClick={handleExport}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <Download className="w-4 h-4" />
            エクスポート
          </button>
          <button
            onClick={handleImport}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <Upload className="w-4 h-4" />
            インポート
          </button>
          <button
            onClick={handleLock}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors"
          >
            <Lock className="w-4 h-4" />
            ロック
          </button>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* ヘッダー */}
        <header className="p-4 border-b border-gray-700 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="名称、ユーザー名などで検索..."
              className="w-full pl-9 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() =>
              activeTab === 'service'
                ? setEditingServiceLogin(null)
                : setEditingDbConnection(null)
            }
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            追加
          </button>
        </header>

        {/* ステータスメッセージ */}
        {statusMessage && (
          <div className="mx-4 mt-3 px-4 py-2 bg-green-900/40 border border-green-700 rounded-lg text-green-400 text-sm">
            {statusMessage}
          </div>
        )}

        {/* 一覧 */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'service' && (
            <div className="space-y-2">
              {filteredServiceLogins.length === 0 ? (
                <p className="text-gray-500 text-center py-16">
                  {searchQuery ? '検索結果がありません' : 'まだデータがありません。「追加」から登録してください。'}
                </p>
              ) : (
                filteredServiceLogins.map((item) => (
                  <div key={item.id} className={cardClass}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-blue-400 shrink-0" />
                          <span className="font-medium text-white truncate">{item.service_name}</span>
                        </div>
                        {item.url && (
                          <p className="text-xs text-gray-500 mt-0.5 ml-6 truncate">{item.url}</p>
                        )}
                        {item.username && (
                          <p className="text-sm text-gray-400 mt-1 ml-6">{item.username}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 ml-6">
                          <span className="text-sm text-gray-300 font-mono">
                            {visiblePasswords.has(item.id) ? item.password : '••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(item.id)}
                            className={`${btnIconClass} text-gray-400 hover:text-white hover:bg-gray-700`}
                            aria-label={visiblePasswords.has(item.id) ? 'パスワードを隠す' : 'パスワードを表示'}
                          >
                            {visiblePasswords.has(item.id) ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleCopy(item.id, item.password)}
                            className={`${btnIconClass} text-gray-400 hover:text-white hover:bg-gray-700`}
                            aria-label="パスワードをコピー"
                          >
                            {copiedId === item.id ? (
                              <ClipboardCheck className="w-3.5 h-3.5 text-green-400" />
                            ) : (
                              <Clipboard className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        {(item.note1 || item.note2) && (
                          <div className="mt-1 ml-6 space-y-0.5">
                            {item.note1 && <p className="text-xs text-gray-500">備考1: {item.note1}</p>}
                            {item.note2 && <p className="text-xs text-gray-500">備考2: {item.note2}</p>}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setEditingServiceLogin(item)}
                          className={`${btnIconClass} text-gray-400 hover:text-white hover:bg-gray-700`}
                          aria-label="編集"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteServiceLogin(item.id)}
                          className={`${btnIconClass} text-gray-400 hover:text-red-400 hover:bg-red-900/30`}
                          aria-label="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'db' && (
            <div className="space-y-2">
              {filteredDbConnections.length === 0 ? (
                <p className="text-gray-500 text-center py-16">
                  {searchQuery ? '検索結果がありません' : 'まだデータがありません。「追加」から登録してください。'}
                </p>
              ) : (
                filteredDbConnections.map((item) => (
                  <div key={item.id} className={cardClass}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-green-400 shrink-0" />
                          <span className="font-medium text-white truncate">{item.name}</span>
                        </div>
                        <div className="mt-1 ml-6 grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm text-gray-400">
                          {item.dns_name && <p>ホスト: {item.dns_name}</p>}
                          {item.ip_address && <p>IP: {item.ip_address}</p>}
                          {item.port && <p>ポート: {item.port}</p>}
                          {item.db_name && <p>DB名: {item.db_name}</p>}
                          {item.username && <p>ユーザー: {item.username}</p>}
                        </div>
                        <div className="flex items-center gap-2 mt-2 ml-6">
                          <span className="text-sm text-gray-300 font-mono">
                            {visiblePasswords.has(item.id) ? item.password : '••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(item.id)}
                            className={`${btnIconClass} text-gray-400 hover:text-white hover:bg-gray-700`}
                            aria-label={visiblePasswords.has(item.id) ? 'パスワードを隠す' : 'パスワードを表示'}
                          >
                            {visiblePasswords.has(item.id) ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleCopy(item.id, item.password)}
                            className={`${btnIconClass} text-gray-400 hover:text-white hover:bg-gray-700`}
                            aria-label="パスワードをコピー"
                          >
                            {copiedId === item.id ? (
                              <ClipboardCheck className="w-3.5 h-3.5 text-green-400" />
                            ) : (
                              <Clipboard className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setEditingDbConnection(item)}
                          className={`${btnIconClass} text-gray-400 hover:text-white hover:bg-gray-700`}
                          aria-label="編集"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDbConnection(item.id)}
                          className={`${btnIconClass} text-gray-400 hover:text-red-400 hover:bg-red-900/30`}
                          aria-label="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>

      {/* モーダル */}
      {editingServiceLogin !== undefined && (
        <ServiceLoginModal
          item={editingServiceLogin}
          onClose={() => setEditingServiceLogin(undefined)}
          onSaved={loadData}
        />
      )}
      {editingDbConnection !== undefined && (
        <DbConnectionModal
          item={editingDbConnection}
          onClose={() => setEditingDbConnection(undefined)}
          onSaved={loadData}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add src/renderer/src/components/Dashboard.tsx
git commit -m "feat: ダッシュボード（一覧・検索・コピー・編集・削除）を実装"
```

---

## Task 14: App.tsx ルーティング

**Files:**
- Modify: `src/renderer/src/App.tsx`

- [ ] **Step 1: App.tsx を書き換える**

```tsx
// src/renderer/src/App.tsx
import { useState, useEffect } from 'react'
import { Auth } from './components/Auth'
import { Dashboard } from './components/Dashboard'
import { Loader2 } from 'lucide-react'

type AppState = 'loading' | 'setup' | 'locked' | 'unlocked'

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading')

  useEffect(() => {
    window.api.checkMaster().then((hasMaster) => {
      setAppState(hasMaster ? 'locked' : 'setup')
    })
  }, [])

  if (appState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="text-blue-400 w-10 h-10 animate-spin" />
      </div>
    )
  }

  if (appState === 'setup' || appState === 'locked') {
    return (
      <Auth
        isFirstTime={appState === 'setup'}
        onAuthenticated={() => setAppState('unlocked')}
      />
    )
  }

  return <Dashboard onLocked={() => setAppState('locked')} />
}
```

- [ ] **Step 2: コミット**

```bash
git add src/renderer/src/App.tsx
git commit -m "feat: App.tsx 認証状態ルーティングを実装"
```

---

## Task 15: electron-builder.yml とビルド設定

**Files:**
- Create: `electron-builder.yml`

- [ ] **Step 1: electron-builder.yml を作成**

```yaml
# electron-builder.yml
appId: com.keyrack.app
productName: KeyRack
copyright: Copyright © 2026

directories:
  buildResources: resources
  output: dist

files:
  - '!**/.vscode/*'
  - '!src/*'
  - '!electron.vite.config.{js,ts,mjs,cjs}'
  - '!{.eslintignore,.eslintrc.cjs,eslint.config.mjs,.prettierignore,.prettierrc.yaml,dev-app-update.yml,CHANGELOG.md,README.md}'
  - '!{.env,.env.*,.npmrc,pnpm-lock.yaml}'
  - '!{tsconfig.json,tsconfig.node.json,tsconfig.web.json}'

# better-sqlite3 等のネイティブモジュールを asar から除外して実行可能にする
asar: true
asarUnpack:
  - resources/**
  - node_modules/better-sqlite3/**
  - node_modules/bindings/**
  - node_modules/file-uri-to-path/**

win:
  executableName: KeyRack
  target:
    - target: portable
      arch:
        - x64
  artifactName: '${productName}_Portable_${version}.${ext}'

# インストーラー形式が必要な場合はこのセクションのコメントを外す
# nsis:
#   oneClick: false
#   allowToChangeInstallationDirectory: true
#   createDesktopShortcut: always
#   artifactName: '${productName}_Setup_${version}.${ext}'

linux:
  target:
    - AppImage
  artifactName: '${productName}_${version}.${ext}'

mac:
  target:
    - dmg
  artifactName: '${productName}_${version}.${ext}'
```

- [ ] **Step 2: package.json にビルドスクリプトを追加**

`package.json` の scripts に以下を追加（electron-vite のスクリプトは保持したまま追記）:

```json
"build:win": "npm run build && electron-builder --win",
"build:linux": "npm run build && electron-builder --linux",
"postinstall": "electron-builder install-app-deps"
```

- [ ] **Step 3: コミット**

```bash
git add electron-builder.yml package.json
git commit -m "chore: electron-builder ビルド設定を追加"
```

---

## Task 16: README.md (Windows ビルド手順)

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README.md を書き換える**

```markdown
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
```

- [ ] **Step 2: コミット**

```bash
git add README.md
git commit -m "docs: Windows環境構築・ビルド手順をREADMEに記載"
```

---

## Task 17: 動作確認・最終テスト

- [ ] **Step 1: 全テストを実行**

```bash
cd /workspaces/KeyRack && npm test
```

Expected: 全テスト PASS

- [ ] **Step 2: TypeScript 型チェック**

```bash
npm run typecheck
```

Expected: エラー 0件

- [ ] **Step 3: Lint チェック**

```bash
npm run lint
```

Expected: エラー 0件

- [ ] **Step 4: 開発サーバー起動確認**

```bash
start-xvfb
DISPLAY=:99 npm run dev
```

Expected: Electron ウィンドウが起動し、KeyRack の認証画面が表示される

- [ ] **Step 5: 動作確認シナリオ**

以下を手動で確認する:
1. マスターパスワードの初回設定（8文字以上）
2. アプリをロックして再度ロック解除
3. サービスログイン情報の追加・編集・削除
4. パスワードの表示トグル・クリップボードコピー
5. DB接続情報の追加・編集・削除
6. エクスポート（平文JSON警告が表示されること）
7. インポート（エクスポートしたファイルを読み込めること）
8. 検索フィルタの動作

- [ ] **Step 6: Windows ビルド試行（任意）**

devcontainer から Windows向けビルドを試みる:

```bash
npm run build:win
```

Expected: `dist/KeyRack_Portable_*.exe` が生成される  
失敗した場合: `better-sqlite3` のクロスコンパイルの制限によるもの。README.md に記載の Windows マシン上でのビルド手順を参照。

- [ ] **Step 7: 最終コミット**

```bash
git add -A
git commit -m "chore: 最終確認・動作検証完了"
```
```
