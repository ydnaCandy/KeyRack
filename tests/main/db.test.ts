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
