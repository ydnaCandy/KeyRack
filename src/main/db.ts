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
