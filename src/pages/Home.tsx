import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  CATEGORY_ICONS,
  CATEGORY_COLORS,
  formatCurrency,
  getDateLabel,
  type Category,
} from '@/lib/categories'
import { getExpensesForMonth, computeTotals } from '@/db/expenses'
import EditExpenseSheet from '@/components/EditExpenseSheet'
import type { Expense } from '@/db/db'

export default function Home() {
  const navigate = useNavigate()
  const now = new Date()
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)

  const expenses = useLiveQuery(
    () => getExpensesForMonth(now.getFullYear(), now.getMonth() + 1),
    []
  ) ?? []

  const { total, essential, discretionary, count } = useMemo(
    () => computeTotals(expenses),
    [expenses]
  )

  // Group by date string (YYYY-MM-DD), sorted newest first
  const { grouped, days } = useMemo(() => {
    const grouped: Record<string, Expense[]> = {}
    for (const e of expenses) {
      const day = e.date.slice(0, 10)
      ;(grouped[day] ??= []).push(e)
    }
    const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a))
    return { grouped, days }
  }, [expenses])

  return (
    <>
      <div className="flex flex-col gap-0">
        {/* Month summary */}
        <div className="px-4 pt-5 pb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
            This month
          </p>
          <p className="text-4xl font-bold text-slate-100 tabular-nums">
            {formatCurrency(total)}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {count} transaction{count !== 1 ? 's' : ''}
          </p>

          {count > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-emerald-400">
                  Essential {formatCurrency(essential)}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-full px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                <span className="text-xs font-medium text-slate-400">
                  Discretionary {formatCurrency(discretionary)}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-800 mx-4" />

        {/* Empty state */}
        {count === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 px-8">
            <p className="text-slate-300 font-medium">No expenses yet</p>
            <p className="text-sm text-slate-500 text-center leading-relaxed">
              Tap the{' '}
              <button
                onClick={() => navigate('/add')}
                className="inline-flex items-center gap-1 text-emerald-400 font-medium"
              >
                <Plus size={13} strokeWidth={2.5} />
                Add
              </button>{' '}
              button below to log your first expense
            </p>
          </div>
        )}

        {/* Expense list grouped by date */}
        {days.map(day => (
          <div key={day}>
            <div className="px-4 pt-4 pb-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                {getDateLabel(day)}
              </p>
            </div>
            <div className="divide-y divide-slate-800/60">
              {grouped[day].map(expense => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  onPress={() => setSelectedExpense(expense)}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Bottom padding for nav clearance */}
        <div className="h-4" />
      </div>

      <EditExpenseSheet
        expense={selectedExpense}
        onClose={() => setSelectedExpense(null)}
      />
    </>
  )
}

function ExpenseRow({
  expense,
  onPress,
}: {
  expense: Expense
  onPress: () => void
}) {
  const Icon = CATEGORY_ICONS[expense.category as Category] ?? CATEGORY_ICONS['Other']
  const color = CATEGORY_COLORS[expense.category as Category] ?? CATEGORY_COLORS['Other']

  return (
    <button
      onClick={onPress}
      className="flex items-center gap-3 w-full px-4 py-3 text-left active:bg-slate-900/60 transition-colors"
    >
      <div
        className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
        style={{ backgroundColor: `${color}22` }}
      >
        <Icon size={18} style={{ color }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200">{expense.category}</p>
        {expense.note ? (
          <p className="text-xs text-slate-500 truncate">{expense.note}</p>
        ) : (
          <p className="text-xs text-slate-700">{expense.paymentMethod}</p>
        )}
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <p className="text-sm font-semibold text-slate-100 tabular-nums">
          {formatCurrency(expense.amount)}
        </p>
        {expense.note && (
          <span className="text-[10px] font-medium text-slate-600 bg-slate-800/80 px-1.5 py-0.5 rounded">
            {expense.paymentMethod}
          </span>
        )}
      </div>
    </button>
  )
}
