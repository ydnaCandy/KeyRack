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
