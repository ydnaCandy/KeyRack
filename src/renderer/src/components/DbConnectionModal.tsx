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

  const handleChange =
    (field: keyof DbConnectionInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
    }

  const handleSubmit = async (e: { preventDefault(): void }) => {
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

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    background: '#f4f2f9',
    border: '2px solid #c9bce6',
    borderRadius: '10px',
    color: '#2a2440',
    fontSize: '15px',
    fontFamily: "'DotGothic16', sans-serif",
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontFamily: "'Silkscreen', monospace",
    color: '#7a6a9e',
    marginBottom: '5px',
    letterSpacing: '1px',
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#7c3aed'
    e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.12)'
  }
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#c9bce6'
    e.target.style.boxShadow = 'none'
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(42,36,64,0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '16px',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 0 60px rgba(124,58,237,0.25), 0 30px 60px rgba(42,36,64,0.2)',
          border: '2px solid #c9bce6',
        }}
      >
        {/* ヘッダー */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 20px',
            borderBottom: '2px solid #ede9f8',
            position: 'sticky',
            top: 0,
            background: '#ffffff',
          }}
        >
          <h2
            style={{
              fontFamily: "'Silkscreen', monospace",
              fontSize: '12px',
              letterSpacing: '2px',
              color: '#2a2440',
              margin: 0,
            }}
          >
            {item ? 'EDIT DB CONNECTION' : 'ADD DB CONNECTION'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#7a6a9e',
              padding: '4px',
              display: 'flex',
              borderRadius: '6px',
              transition: 'color 0.1s, background 0.1s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#c0392b'
              e.currentTarget.style.background = 'rgba(192,57,43,0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#7a6a9e'
              e.currentTarget.style.background = 'none'
            }}
            aria-label="閉じる"
          >
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        {/* フォーム */}
        <form
          onSubmit={handleSubmit}
          style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          <div>
            <label style={labelStyle}>
              名称 <span style={{ color: '#c0392b' }}>*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={handleChange('name')}
              style={inputStyle}
              placeholder="例: 本番DB"
              required
              autoFocus
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          {/* ホスト / IP を2列グリッド */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>ホスト / DNS名</label>
              <input
                type="text"
                value={form.dns_name}
                onChange={handleChange('dns_name')}
                style={inputStyle}
                placeholder="db.example.com"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
            <div>
              <label style={labelStyle}>IPアドレス</label>
              <input
                type="text"
                value={form.ip_address}
                onChange={handleChange('ip_address')}
                style={inputStyle}
                placeholder="192.168.1.1"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
          </div>

          {/* ポート / DB名 を2列グリッド */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>ポート</label>
              <input
                type="text"
                value={form.port}
                onChange={handleChange('port')}
                style={inputStyle}
                placeholder="5432"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
            <div>
              <label style={labelStyle}>DB名</label>
              <input
                type="text"
                value={form.db_name}
                onChange={handleChange('db_name')}
                style={inputStyle}
                placeholder="mydb"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>ユーザー名</label>
            <input
              type="text"
              value={form.username}
              onChange={handleChange('username')}
              style={inputStyle}
              placeholder="admin"
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          <div>
            <label style={labelStyle}>
              パスワード <span style={{ color: '#c0392b' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange('password')}
                style={{
                  ...inputStyle,
                  paddingRight: '42px',
                  fontFamily: showPassword ? "'IBM Plex Mono', monospace" : undefined,
                }}
                placeholder="パスワードを入力"
                required
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#7a6a9e',
                  padding: '4px',
                  display: 'flex',
                }}
                aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
              >
                {showPassword ? (
                  <EyeOff style={{ width: '16px', height: '16px' }} />
                ) : (
                  <Eye style={{ width: '16px', height: '16px' }} />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div
              style={{
                background: 'rgba(192,57,43,0.08)',
                border: '1.5px solid rgba(192,57,43,0.3)',
                borderRadius: '10px',
                padding: '10px 14px',
              }}
            >
              <p style={{ color: '#c0392b', fontSize: '13px', margin: 0 }}>{error}</p>
            </div>
          )}

          {/* ボタン行 */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-3d"
              style={{
                '--btn-shadow': '#c9bce6',
                flex: 1,
                padding: '10px 16px',
                background: '#ede9f8',
                boxShadow: '0 4px 0 #c9bce6',
                border: 'none',
                borderRadius: '10px',
                color: '#7a6a9e',
                fontFamily: "'Silkscreen', monospace",
                fontSize: '10px',
                letterSpacing: '1px',
                cursor: 'pointer',
              } as React.CSSProperties}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-3d"
              style={{
                '--btn-shadow': '#4c1d95',
                flex: 1,
                padding: '10px 16px',
                background: loading
                  ? '#c9bce6'
                  : 'linear-gradient(to bottom, #7c3aed, #6d28d9)',
                boxShadow: loading ? 'none' : '0 4px 0 #4c1d95',
                border: 'none',
                borderRadius: '10px',
                color: '#ffffff',
                fontFamily: "'Silkscreen', monospace",
                fontSize: '10px',
                letterSpacing: '1px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              } as React.CSSProperties}
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
