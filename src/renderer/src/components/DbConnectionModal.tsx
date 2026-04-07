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

  const handleChange = (field: keyof DbConnectionInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
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

  const inputClass =
    'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-700 sticky top-0 bg-gray-800">
          <h2 className="text-lg font-semibold text-white">
            {item ? 'DB接続情報を編集' : 'DB接続情報を追加'}
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
              名称 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={handleChange('name')}
              className={inputClass}
              placeholder="例: 本番DB"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                ホスト / DNS名
              </label>
              <input
                type="text"
                value={form.dns_name}
                onChange={handleChange('dns_name')}
                className={inputClass}
                placeholder="db.example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">IPアドレス</label>
              <input
                type="text"
                value={form.ip_address}
                onChange={handleChange('ip_address')}
                className={inputClass}
                placeholder="192.168.1.1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">ポート</label>
              <input
                type="text"
                value={form.port}
                onChange={handleChange('port')}
                className={inputClass}
                placeholder="5432"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">DB名</label>
              <input
                type="text"
                value={form.db_name}
                onChange={handleChange('db_name')}
                className={inputClass}
                placeholder="mydb"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">ユーザー名</label>
            <input
              type="text"
              value={form.username}
              onChange={handleChange('username')}
              className={inputClass}
              placeholder="admin"
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
                className={`${inputClass} pr-10`}
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
