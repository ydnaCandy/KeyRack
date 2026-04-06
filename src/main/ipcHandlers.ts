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

    const data: ExportData = {
      version: 1,
      exported_at: new Date().toISOString(),
      service_logins: serviceLoginRows.map((r) => ({ ...r, password: decrypt(r.password, key) })),
      db_connections: dbConnectionRows.map((r) => ({ ...r, password: decrypt(r.password, key) })),
    }

    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
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
