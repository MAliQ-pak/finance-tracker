import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Plus, BarChart3, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

function NavItem({
  to,
  icon: Icon,
  label,
  end,
}: {
  to: string
  icon: React.ElementType
  label: string
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex flex-1 flex-col items-center gap-1 py-1 text-xs font-medium transition-colors',
          isActive ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
        )
      }
    >
      <Icon size={20} />
      <span>{label}</span>
    </NavLink>
  )
}

export default function BottomNav() {
  const navigate = useNavigate()

  return (
    <nav className="flex items-end justify-around px-2 pt-2 pb-3 border-t border-slate-800 bg-slate-950 shrink-0">
      <NavItem to="/" icon={Home} label="Home" end />

      {/* Add — visually prominent raised button */}
      <div className="flex flex-1 flex-col items-center">
        <button
          onClick={() => navigate('/add')}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 active:scale-95 transition-all -mt-6"
          aria-label="Add expense"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
        <span className="mt-1 text-xs font-medium text-slate-500">Add</span>
      </div>

      <NavItem to="/insights" icon={BarChart3} label="Insights" />
      <NavItem to="/settings" icon={Settings} label="Settings" />
    </nav>
  )
}
