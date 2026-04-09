// src/renderer/src/components/Auth.tsx
import { useState } from 'react'
import { KeyRound, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'

interface AuthProps {
  isFirstTime: boolean
  onAuthenticated: () => void
}

export function Auth({ isFirstTime, onAuthenticated }: AuthProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setError('')

    if (isFirstTime) {
      if (password.length < 8) {
        setError('パスワードは8文字以上で入力してください')
        return
      }
      if (password !== confirmPassword) {
        setError('パスワードが一致しません')
        return
      }
    }

    setLoading(true)
    try {
      const result = isFirstTime
        ? await window.api.registerMaster(password)
        : await window.api.unlockMaster(password)

      if (result.success) {
        onAuthenticated()
      } else {
        setError(result.message ?? '認証に失敗しました')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: '#ffffff',
    border: '2px solid #c9bce6',
    borderRadius: '10px',
    color: '#2a2440',
    fontSize: '16px',
    fontFamily: "'DotGothic16', sans-serif",
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontFamily: "'Silkscreen', monospace",
    color: '#7a6a9e',
    marginBottom: '6px',
    letterSpacing: '1px',
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #f4f2f9 0%, #ede9f8 100%)' }}
    >
      <div
        className="w-full max-w-sm"
        style={{
          background: '#ffffff',
          border: '2px solid #c9bce6',
          borderRadius: '20px',
          padding: '40px 36px',
          boxShadow: '0 0 40px rgba(124,58,237,0.12), 0 20px 40px rgba(42,36,64,0.08)',
        }}
      >
        {/* ロゴ */}
        <div className="flex flex-col items-center mb-8">
          <div
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
              borderRadius: '16px',
              padding: '14px',
              boxShadow: '0 6px 0 #4c1d95, 0 8px 24px rgba(124,58,237,0.4)',
              marginBottom: '20px',
            }}
          >
            <KeyRound className="w-10 h-10 text-white" />
          </div>
          <h1
            style={{
              fontFamily: "'Silkscreen', monospace",
              fontSize: '26px',
              color: '#2a2440',
              letterSpacing: '4px',
              margin: 0,
            }}
          >
            KEYRACK
          </h1>
          <p
            style={{
              color: '#7a6a9e',
              fontSize: '13px',
              marginTop: '10px',
              textAlign: 'center',
            }}
          >
            {isFirstTime
              ? 'マスターパスワードを設定してください'
              : 'マスターパスワードを入力してください'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* パスワード入力 */}
          <div>
            <label style={labelStyle}>
              マスターパスワード <span style={{ color: '#c0392b' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...inputStyle, paddingRight: '42px', fontFamily: showPassword ? "'IBM Plex Mono', monospace" : undefined }}
                placeholder="8文字以上"
                required
                autoFocus
                disabled={loading}
                onFocus={(e) => {
                  e.target.style.borderColor = '#7c3aed'
                  e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#c9bce6'
                  e.target.style.boxShadow = 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#7a6a9e',
                  padding: '4px',
                  display: 'flex',
                }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 確認入力（初回のみ） */}
          {isFirstTime && (
            <div>
              <label style={labelStyle}>
                パスワードの確認 <span style={{ color: '#c0392b' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: '42px', fontFamily: showConfirm ? "'IBM Plex Mono', monospace" : undefined }}
                  placeholder="パスワードを再入力"
                  required
                  disabled={loading}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#7c3aed'
                    e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#c9bce6'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#7a6a9e',
                    padding: '4px',
                    display: 'flex',
                  }}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* エラー表示 */}
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

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={loading}
            className="btn-3d"
            style={{
              '--btn-shadow': '#4c1d95',
              width: '100%',
              padding: '12px 16px',
              background: loading
                ? '#c9bce6'
                : 'linear-gradient(to bottom, #7c3aed, #6d28d9)',
              boxShadow: loading ? 'none' : '0 5px 0 #4c1d95',
              border: 'none',
              borderRadius: '12px',
              color: '#ffffff',
              fontFamily: "'Silkscreen', monospace",
              fontSize: '11px',
              letterSpacing: '2px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '4px',
            } as React.CSSProperties}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            {loading ? '処理中...' : isFirstTime ? '設定する' : 'ロック解除'}
          </button>
        </form>
      </div>
    </div>
  )
}
