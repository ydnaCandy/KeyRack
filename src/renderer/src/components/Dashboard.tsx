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
