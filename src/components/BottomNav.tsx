import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Plus, BarChart3, Target, MoreHorizontal } from 'lucide-react'
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
            ? 'text-[rgba(255,255,255,0.85)]'
            : 'text-[rgba(255,255,255,0.22)] hover:text-[rgba(255,255,255,0.45)]'
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
    <nav className="flex items-end justify-around px-4 pt-3 pb-4 border-t border-[rgba(255,255,255,0.05)] bg-[#080808] shrink-0">
      <NavItem to="/" icon={Home} label="Home" end />
      <NavItem to="/insights" icon={BarChart3} label="Insights" />

      {/* Add — white rounded-square raised button */}
      <div className="flex flex-1 flex-col items-center -mt-[18px]">
        <button
          onClick={() => navigate('/add')}
          className="flex items-center justify-center w-11 h-11 rounded-[14px] bg-[rgba(255,255,255,0.9)] text-[#080808] active:scale-95 transition-transform"
          aria-label="Add expense"
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
        <span className="mt-1 text-[10px] font-medium tracking-wide text-[rgba(255,255,255,0.22)]">Add</span>
      </div>

      <NavItem to="/goals" icon={Target} label="Goals" />
      <NavItem to="/settings" icon={MoreHorizontal} label="More" />
    </nav>
  )
}
