// src/renderer/src/components/Auth.tsx
import { useState } from 'react'
import { KeyRound, Lock, Loader2 } from 'lucide-react'

interface AuthProps {
  isFirstTime: boolean
  onAuthenticated: () => void
}

export function Auth({ isFirstTime, onAuthenticated }: AuthProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <KeyRound className="text-blue-400 w-14 h-14 mb-3" />
          <h1 className="text-3xl font-bold text-white">KeyRack</h1>
          <p className="text-gray-400 mt-2 text-sm text-center">
            {isFirstTime
              ? 'マスターパスワードを設定してください'
              : 'マスターパスワードを入力してください'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              マスターパスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="パスワードを入力"
              required
              autoFocus
              disabled={loading}
            />
          </div>

          {isFirstTime && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                パスワードの確認
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="パスワードを再入力"
                required
                disabled={loading}
              />
            </div>
          )}

          {error && (
            <div className="bg-red-900/40 border border-red-700 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Lock className="w-5 h-5" />
            )}
            {loading ? '処理中...' : isFirstTime ? '設定する' : 'ロック解除'}
          </button>
        </form>
      </div>
    </div>
  )
}
