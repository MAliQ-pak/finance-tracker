import { Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Header() {
  const navigate = useNavigate()

  return (
    <header className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
      <span className="text-base font-semibold tracking-tight text-slate-100">
        Finance Tracker
      </span>
      <button
        onClick={() => navigate('/settings')}
        className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        aria-label="Settings"
      >
        <Settings size={18} />
      </button>
    </header>
  )
}
