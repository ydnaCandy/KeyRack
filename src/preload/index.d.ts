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
