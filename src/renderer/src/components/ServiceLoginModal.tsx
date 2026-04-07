// src/renderer/src/components/ServiceLoginModal.tsx
import { useState, useEffect } from 'react'
import { X, Eye, EyeOff, Loader2 } from 'lucide-react'
import type { ServiceLogin, ServiceLoginInput } from '@shared/interfaces'

interface ServiceLoginModalProps {
  item: ServiceLogin | null  // null = 新規追加, non-null = 編集
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

  const handleChange = (field: keyof ServiceLoginInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            {item ? 'サービスログイン情報を編集' : 'サービスログイン情報を追加'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              サービス名 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.service_name}
              onChange={handleChange('service_name')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: Gmail"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">URL</label>
            <input
              type="text"
              value={form.url}
              onChange={handleChange('url')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: https://gmail.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              ユーザー名 / メールアドレス
            </label>
            <input
              type="text"
              value={form.username}
              onChange={handleChange('username')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: user@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              パスワード <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange('password')}
                className="w-full px-3 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="パスワードを入力"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">備考1</label>
            <input
              type="text"
              value={form.note1}
              onChange={handleChange('note1')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="予備の登録項目など"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">備考2</label>
            <input
              type="text"
              value={form.note2}
              onChange={handleChange('note2')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="追加設定やシークレットキーなど"
            />
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-700 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
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
