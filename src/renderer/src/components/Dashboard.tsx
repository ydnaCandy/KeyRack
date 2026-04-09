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
  type LucideIcon,
} from 'lucide-react'
import type { ServiceLogin, DbConnection } from '@shared/interfaces'
import { ServiceLoginModal } from './ServiceLoginModal'
import { DbConnectionModal } from './DbConnectionModal'

type Tab = 'service' | 'db'

interface DashboardProps {
  onLocked: () => void
}

// スーファミ風バッジカラー（赤→黄→青→緑でサイクル）
const BADGE_COLORS = [
  { bg: '#c0392b', shadow: '#7a1c1c' },
  { bg: '#d4a017', shadow: '#8a690f' },
  { bg: '#1a6fb5', shadow: '#0d3d6e' },
  { bg: '#1a8a4a', shadow: '#0d5430' },
]

function getBadgeColor(index: number) {
  return BADGE_COLORS[index % BADGE_COLORS.length]
}

// サイドバーボタン
interface SidebarBtnProps {
  icon: LucideIcon
  label: string
  active?: boolean
  danger?: boolean
  onClick: () => void
}

function SidebarBtn({ icon: Icon, label, active, danger, onClick }: SidebarBtnProps) {
  return (
    <div className="sidebar-btn-wrap" style={{ position: 'relative' }}>
      <button
        onClick={onClick}
        title={label}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px',
          borderRadius: '10px',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          ...(active
            ? {
                background: 'linear-gradient(to bottom, #7c3aed, #6d28d9)',
                color: '#ffffff',
                boxShadow: '0 3px 0 #4c1d95',
              }
            : danger
              ? {
                  background: 'transparent',
                  color: '#c0392b',
                }
              : {
                  background: 'transparent',
                  color: '#7a6a9e',
                }),
        }}
        onMouseEnter={(e) => {
          if (!active) {
            e.currentTarget.style.background = danger
              ? 'rgba(192,57,43,0.1)'
              : 'rgba(124,58,237,0.1)'
            e.currentTarget.style.color = danger ? '#c0392b' : '#7c3aed'
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = danger ? '#c0392b' : '#7a6a9e'
          }
        }}
      >
        <Icon style={{ width: '20px', height: '20px' }} />
      </button>
      {/* ツールチップ */}
      <div
        className="sidebar-tooltip"
        style={{
          position: 'absolute',
          left: 'calc(100% + 8px)',
          top: '50%',
          transform: 'translateY(-50%)',
          background: '#2a2440',
          color: '#ffffff',
          fontSize: '11px',
          fontFamily: "'Silkscreen', monospace",
          letterSpacing: '1px',
          padding: '5px 10px',
          borderRadius: '6px',
          whiteSpace: 'nowrap',
          zIndex: 100,
        }}
      >
        {label}
        <div
          style={{
            position: 'absolute',
            right: '100%',
            top: '50%',
            transform: 'translateY(-50%)',
            border: '5px solid transparent',
            borderRightColor: '#2a2440',
          }}
        />
      </div>
    </div>
  )
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
  )
  const [editingDbConnection, setEditingDbConnection] = useState<DbConnection | null | undefined>(
    undefined,
  )
  const [statusMessage, setStatusMessage] = useState<{ text: string; ok: boolean } | null>(null)

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

  const showStatus = (text: string, ok = true) => {
    setStatusMessage({ text, ok })
    setTimeout(() => setStatusMessage(null), 3000)
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
    const confirmed = confirm(
      'このサービスログイン情報を削除しますか？\nこの操作は元に戻せません。',
    )
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
    showStatus(result.message ?? (result.success ? 'エクスポート完了' : 'エクスポート失敗'), result.success)
  }

  const handleImport = async () => {
    const result = await window.api.importData()
    if (result.success) await loadData()
    showStatus(result.message ?? (result.success ? 'インポート完了' : 'インポート失敗'), result.success)
  }

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

  const iconBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
    color: '#7a6a9e',
    display: 'flex',
    alignItems: 'center',
    transition: 'background 0.1s, color 0.1s',
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f4f2f9', color: '#2a2440' }}>
      {/* アイコンサイドバー（62px） */}
      <aside
        style={{
          width: '62px',
          minWidth: '62px',
          background: '#ede9f8',
          borderRight: '2px solid #c9bce6',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'visible',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* ロゴ */}
        <div
          style={{
            height: '62px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '2px solid #c9bce6',
          }}
        >
          <KeyRound style={{ width: '26px', height: '26px', color: '#7c3aed' }} />
        </div>

        {/* ナビゲーション */}
        <nav style={{ flex: 1, padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <SidebarBtn
            icon={Globe}
            label="サービスログイン"
            active={activeTab === 'service'}
            onClick={() => setActiveTab('service')}
          />
          <SidebarBtn
            icon={Database}
            label="DB接続管理"
            active={activeTab === 'db'}
            onClick={() => setActiveTab('db')}
          />
        </nav>

        {/* 下部ボタン */}
        <div
          style={{
            padding: '8px',
            borderTop: '2px solid #c9bce6',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <SidebarBtn icon={Download} label="エクスポート" onClick={handleExport} />
          <SidebarBtn icon={Upload} label="インポート" onClick={handleImport} />
          <SidebarBtn icon={Lock} label="ロック" danger onClick={handleLock} />
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* ヘッダー */}
        <header
          style={{
            padding: '12px 16px',
            borderBottom: '2px solid #c9bce6',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: '#ffffff',
          }}
        >
          {/* 検索バー */}
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '16px',
                height: '16px',
                color: '#7a6a9e',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="名称・ユーザー名などで検索..."
              style={{
                width: '100%',
                paddingLeft: '36px',
                paddingRight: '12px',
                paddingTop: '8px',
                paddingBottom: '8px',
                background: '#f4f2f9',
                border: '2px solid #c9bce6',
                borderRadius: '10px',
                color: '#2a2440',
                fontSize: '14px',
                fontFamily: "'DotGothic16', sans-serif",
                outline: 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#7c3aed'
                e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.12)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#c9bce6'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          {/* 追加ボタン */}
          <button
            className="btn-3d"
            onClick={() =>
              activeTab === 'service'
                ? setEditingServiceLogin(null)
                : setEditingDbConnection(null)
            }
            style={{
              '--btn-shadow': '#4c1d95',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: 'linear-gradient(to bottom, #7c3aed, #6d28d9)',
              boxShadow: '0 4px 0 #4c1d95',
              border: 'none',
              borderRadius: '10px',
              color: '#ffffff',
              fontFamily: "'Silkscreen', monospace",
              fontSize: '10px',
              letterSpacing: '1px',
              cursor: 'pointer',
            } as React.CSSProperties}
          >
            <Plus style={{ width: '16px', height: '16px' }} />
            追加
          </button>
        </header>

        {/* タブ見出し */}
        <div
          style={{
            padding: '10px 16px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontFamily: "'Silkscreen', monospace",
              fontSize: '11px',
              letterSpacing: '2px',
              color: '#7a6a9e',
            }}
          >
            {activeTab === 'service'
              ? `SERVICE LOGINS — ${filteredServiceLogins.length}件`
              : `DB CONNECTIONS — ${filteredDbConnections.length}件`}
          </span>
        </div>

        {/* ステータスメッセージ */}
        {statusMessage && (
          <div
            style={{
              margin: '8px 16px 0',
              padding: '8px 14px',
              background: statusMessage.ok ? 'rgba(26,138,74,0.1)' : 'rgba(192,57,43,0.1)',
              border: `1.5px solid ${statusMessage.ok ? 'rgba(26,138,74,0.3)' : 'rgba(192,57,43,0.3)'}`,
              borderRadius: '8px',
              color: statusMessage.ok ? '#1a8a4a' : '#c0392b',
              fontSize: '13px',
            }}
          >
            {statusMessage.text}
          </div>
        )}

        {/* カード一覧 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 16px' }}>
          {activeTab === 'service' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredServiceLogins.length === 0 ? (
                <p
                  style={{
                    color: '#b0a0d8',
                    textAlign: 'center',
                    padding: '60px 0',
                    fontFamily: "'Silkscreen', monospace",
                    fontSize: '11px',
                    letterSpacing: '1px',
                  }}
                >
                  {searchQuery ? '検索結果がありません' : 'まだデータがありません。「追加」から登録してください。'}
                </p>
              ) : (
                filteredServiceLogins.map((item, index) => {
                  const badge = getBadgeColor(index)
                  return (
                    <div
                      key={item.id}
                      style={{
                        background: '#ffffff',
                        border: '2px solid #c9bce6',
                        borderRadius: '14px',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        transition: 'transform 0.1s, border-color 0.1s, box-shadow 0.1s',
                        cursor: 'default',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)'
                        e.currentTarget.style.borderColor = '#b0a0d8'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(124,58,237,0.1)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.borderColor = '#c9bce6'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      {/* カラーバッジ */}
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          minWidth: '40px',
                          borderRadius: '10px',
                          background: badge.bg,
                          boxShadow: `0 4px 0 ${badge.shadow}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontFamily: "'Silkscreen', monospace",
                          fontSize: '14px',
                          fontWeight: 'bold',
                        }}
                      >
                        {item.service_name.charAt(0).toUpperCase()}
                      </div>

                      {/* コンテンツ */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: "'DotGothic16', sans-serif",
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: '#2a2440',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.service_name}
                        </div>
                        {item.url && (
                          <div
                            style={{
                              fontSize: '12px',
                              color: '#b0a0d8',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.url}
                          </div>
                        )}
                        {item.username && (
                          <div
                            style={{ fontSize: '13px', color: '#7a6a9e', marginTop: '2px' }}
                          >
                            {item.username}
                          </div>
                        )}
                        {/* パスワード行 */}
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}
                        >
                          <span
                            style={{
                              fontSize: '14px',
                              fontFamily: "'IBM Plex Mono', monospace",
                              color: '#7a6a9e',
                              letterSpacing: '2px',
                            }}
                          >
                            {visiblePasswords.has(item.id) ? item.password : '••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(item.id)}
                            style={iconBtnStyle}
                            aria-label={visiblePasswords.has(item.id) ? 'パスワードを隠す' : 'パスワードを表示'}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#ede9f8'
                              e.currentTarget.style.color = '#7c3aed'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'none'
                              e.currentTarget.style.color = '#7a6a9e'
                            }}
                          >
                            {visiblePasswords.has(item.id) ? (
                              <EyeOff style={{ width: '14px', height: '14px' }} />
                            ) : (
                              <Eye style={{ width: '14px', height: '14px' }} />
                            )}
                          </button>
                          <button
                            onClick={() => handleCopy(item.id, item.password)}
                            style={{
                              ...iconBtnStyle,
                              color: copiedId === item.id ? '#1a8a4a' : '#7a6a9e',
                            }}
                            aria-label="パスワードをコピー"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#ede9f8'
                              if (copiedId !== item.id) e.currentTarget.style.color = '#7c3aed'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'none'
                              if (copiedId !== item.id) e.currentTarget.style.color = '#7a6a9e'
                            }}
                          >
                            {copiedId === item.id ? (
                              <ClipboardCheck style={{ width: '14px', height: '14px' }} />
                            ) : (
                              <Clipboard style={{ width: '14px', height: '14px' }} />
                            )}
                          </button>
                        </div>
                        {(item.note1 || item.note2) && (
                          <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                            {item.note1 && (
                              <span style={{ fontSize: '11px', color: '#b0a0d8' }}>備考1: {item.note1}</span>
                            )}
                            {item.note2 && (
                              <span style={{ fontSize: '11px', color: '#b0a0d8' }}>備考2: {item.note2}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* アクションボタン */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          onClick={() => setEditingServiceLogin(item)}
                          style={iconBtnStyle}
                          aria-label="編集"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#ede9f8'
                            e.currentTarget.style.color = '#7c3aed'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'none'
                            e.currentTarget.style.color = '#7a6a9e'
                          }}
                        >
                          <Pencil style={{ width: '16px', height: '16px' }} />
                        </button>
                        <button
                          onClick={() => handleDeleteServiceLogin(item.id)}
                          style={{ ...iconBtnStyle, color: '#c0392b' }}
                          aria-label="削除"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(192,57,43,0.1)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'none'
                          }}
                        >
                          <Trash2 style={{ width: '16px', height: '16px' }} />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {activeTab === 'db' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredDbConnections.length === 0 ? (
                <p
                  style={{
                    color: '#b0a0d8',
                    textAlign: 'center',
                    padding: '60px 0',
                    fontFamily: "'Silkscreen', monospace",
                    fontSize: '11px',
                    letterSpacing: '1px',
                  }}
                >
                  {searchQuery ? '検索結果がありません' : 'まだデータがありません。「追加」から登録してください。'}
                </p>
              ) : (
                filteredDbConnections.map((item, index) => {
                  const badge = getBadgeColor(index)
                  return (
                    <div
                      key={item.id}
                      style={{
                        background: '#ffffff',
                        border: '2px solid #c9bce6',
                        borderRadius: '14px',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        transition: 'transform 0.1s, border-color 0.1s, box-shadow 0.1s',
                        cursor: 'default',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)'
                        e.currentTarget.style.borderColor = '#b0a0d8'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(124,58,237,0.1)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.borderColor = '#c9bce6'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      {/* カラーバッジ */}
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          minWidth: '40px',
                          borderRadius: '10px',
                          background: badge.bg,
                          boxShadow: `0 4px 0 ${badge.shadow}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontFamily: "'Silkscreen', monospace",
                          fontSize: '14px',
                          fontWeight: 'bold',
                        }}
                      >
                        {item.name.charAt(0).toUpperCase()}
                      </div>

                      {/* コンテンツ */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: "'DotGothic16', sans-serif",
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: '#2a2440',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.name}
                        </div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '2px 16px',
                            marginTop: '4px',
                            fontSize: '12px',
                            color: '#7a6a9e',
                          }}
                        >
                          {item.dns_name && <span>ホスト: {item.dns_name}</span>}
                          {item.ip_address && <span>IP: {item.ip_address}</span>}
                          {item.port && <span>ポート: {item.port}</span>}
                          {item.db_name && <span>DB名: {item.db_name}</span>}
                          {item.username && <span>ユーザー: {item.username}</span>}
                        </div>
                        {/* パスワード行 */}
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}
                        >
                          <span
                            style={{
                              fontSize: '14px',
                              fontFamily: "'IBM Plex Mono', monospace",
                              color: '#7a6a9e',
                              letterSpacing: '2px',
                            }}
                          >
                            {visiblePasswords.has(item.id) ? item.password : '••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(item.id)}
                            style={iconBtnStyle}
                            aria-label={visiblePasswords.has(item.id) ? 'パスワードを隠す' : 'パスワードを表示'}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#ede9f8'
                              e.currentTarget.style.color = '#7c3aed'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'none'
                              e.currentTarget.style.color = '#7a6a9e'
                            }}
                          >
                            {visiblePasswords.has(item.id) ? (
                              <EyeOff style={{ width: '14px', height: '14px' }} />
                            ) : (
                              <Eye style={{ width: '14px', height: '14px' }} />
                            )}
                          </button>
                          <button
                            onClick={() => handleCopy(item.id, item.password)}
                            style={{
                              ...iconBtnStyle,
                              color: copiedId === item.id ? '#1a8a4a' : '#7a6a9e',
                            }}
                            aria-label="パスワードをコピー"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#ede9f8'
                              if (copiedId !== item.id) e.currentTarget.style.color = '#7c3aed'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'none'
                              if (copiedId !== item.id) e.currentTarget.style.color = '#7a6a9e'
                            }}
                          >
                            {copiedId === item.id ? (
                              <ClipboardCheck style={{ width: '14px', height: '14px' }} />
                            ) : (
                              <Clipboard style={{ width: '14px', height: '14px' }} />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* アクションボタン */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          onClick={() => setEditingDbConnection(item)}
                          style={iconBtnStyle}
                          aria-label="編集"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#ede9f8'
                            e.currentTarget.style.color = '#7c3aed'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'none'
                            e.currentTarget.style.color = '#7a6a9e'
                          }}
                        >
                          <Pencil style={{ width: '16px', height: '16px' }} />
                        </button>
                        <button
                          onClick={() => handleDeleteDbConnection(item.id)}
                          style={{ ...iconBtnStyle, color: '#c0392b' }}
                          aria-label="削除"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(192,57,43,0.1)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'none'
                          }}
                        >
                          <Trash2 style={{ width: '16px', height: '16px' }} />
                        </button>
                      </div>
                    </div>
                  )
                })
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
