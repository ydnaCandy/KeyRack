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
