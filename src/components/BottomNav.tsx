import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Plus, BarChart3, Target, Wallet } from 'lucide-react'
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
          'flex flex-1 flex-col items-center gap-1 py-1 transition-colors',
          isActive
            ? 'text-[rgba(var(--fg),0.85)]'
            : 'text-[rgba(var(--fg),0.70)] hover:text-[rgba(var(--fg),0.45)]'
        )
      }
    >
      <Icon size={18} strokeWidth={1.5} />
      <span className="text-[10px] font-medium tracking-wide">{label}</span>
    </NavLink>
  )
}

export default function BottomNav() {
  const navigate = useNavigate()

  return (
    <nav className="flex items-end justify-around px-4 pt-3 pb-4 border-t border-[rgba(var(--fg),0.05)] bg-[var(--bg-base)] shrink-0">
      <NavItem to="/" icon={Home} label="Home" end />
      <NavItem to="/wallet" icon={Wallet} label="Wallet" />

      {/* Add — white rounded-square raised button */}
      <div className="flex flex-1 flex-col items-center -mt-[18px]">
        <button
          onClick={() => navigate('/add')}
          className="flex items-center justify-center w-11 h-11 rounded-[14px] bg-[rgba(var(--fg),0.9)] text-[var(--btn-primary-text)] active:scale-95 transition-transform"
          aria-label="Add expense"
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
        <span className="mt-1 text-[10px] font-medium tracking-wide text-[rgba(var(--fg),0.70)]">Add</span>
      </div>

      <NavItem to="/insights" icon={BarChart3} label="Insights" />
      <NavItem to="/goals" icon={Target} label="Goals" />
    </nav>
  )
}
