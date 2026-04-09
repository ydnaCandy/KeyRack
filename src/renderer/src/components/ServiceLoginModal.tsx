// src/renderer/src/components/ServiceLoginModal.tsx
import { useState, useEffect } from 'react'
import { X, Eye, EyeOff, Loader2 } from 'lucide-react'
import type { ServiceLogin, ServiceLoginInput } from '@shared/interfaces'

interface ServiceLoginModalProps {
  item: ServiceLogin | null
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

  const handleChange =
    (field: keyof ServiceLoginInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
    }

  const handleSubmit = async (e: { preventDefault(): void }) => {
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
          maxWidth: '480px',
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
            {item ? 'EDIT SERVICE LOGIN' : 'ADD SERVICE LOGIN'}
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
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>
              サービス名 <span style={{ color: '#c0392b' }}>*</span>
            </label>
            <input
              type="text"
              value={form.service_name}
              onChange={handleChange('service_name')}
              style={inputStyle}
              placeholder="例: Gmail"
              required
              autoFocus
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          <div>
            <label style={labelStyle}>URL</label>
            <input
              type="text"
              value={form.url}
              onChange={handleChange('url')}
              style={inputStyle}
              placeholder="https://gmail.com"
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          <div>
            <label style={labelStyle}>ユーザー名 / メールアドレス</label>
            <input
              type="text"
              value={form.username}
              onChange={handleChange('username')}
              style={inputStyle}
              placeholder="user@example.com"
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

          <div>
            <label style={labelStyle}>備考1</label>
            <input
              type="text"
              value={form.note1}
              onChange={handleChange('note1')}
              style={inputStyle}
              placeholder="予備の登録項目など"
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          <div>
            <label style={labelStyle}>備考2</label>
            <input
              type="text"
              value={form.note2}
              onChange={handleChange('note2')}
              style={inputStyle}
              placeholder="追加設定やシークレットキーなど"
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
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
