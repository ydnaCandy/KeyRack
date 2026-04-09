// src/renderer/src/App.tsx
import { useState, useEffect } from 'react'
import { Auth } from './components/Auth'
import { Dashboard } from './components/Dashboard'
import { Loader2 } from 'lucide-react'

type AppState = 'loading' | 'setup' | 'locked' | 'unlocked'

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading')

  useEffect(() => {
    window.api.checkMaster().then((hasMaster) => {
      setAppState(hasMaster ? 'locked' : 'setup')
    })
  }, [])

  if (appState === 'loading') {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#f4f2f9' }}
      >
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#7c3aed' }} />
      </div>
    )
  }

  if (appState === 'setup' || appState === 'locked') {
    return (
      <Auth
        isFirstTime={appState === 'setup'}
        onAuthenticated={() => setAppState('unlocked')}
      />
    )
  }

  return <Dashboard onLocked={() => setAppState('locked')} />
}
