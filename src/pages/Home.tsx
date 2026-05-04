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
import type { Expense, ExpenseType } from '@/db/db'

const TYPE_STYLES: Record<ExpenseType, { label: string; dot: string; text: string; bg: string; border: string }> = {
  need: {
    label: 'Need',
    dot: 'bg-blue-400',
    text: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  want: {
    label: 'Want',
    dot: 'bg-purple-400',
    text: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
  savings: {
    label: 'Savings',
    dot: 'bg-emerald-400',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
}

export default function Home() {
  const navigate = useNavigate()
  const now = new Date()
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)

  const expenses = useLiveQuery(
    () => getExpensesForMonth(now.getFullYear(), now.getMonth() + 1),
    []
  ) ?? []

  const { total, needs, wants, savings, count } = useMemo(
    () => computeTotals(expenses),
    [expenses]
  )

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
              {needs > 0 && (
                <span className={`inline-flex items-center gap-1.5 ${TYPE_STYLES.need.bg} border ${TYPE_STYLES.need.border} rounded-full px-3 py-1.5`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${TYPE_STYLES.need.dot} shrink-0`} />
                  <span className={`text-xs font-medium ${TYPE_STYLES.need.text}`}>
                    Needs {formatCurrency(needs)}
                  </span>
                </span>
              )}
              {wants > 0 && (
                <span className={`inline-flex items-center gap-1.5 ${TYPE_STYLES.want.bg} border ${TYPE_STYLES.want.border} rounded-full px-3 py-1.5`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${TYPE_STYLES.want.dot} shrink-0`} />
                  <span className={`text-xs font-medium ${TYPE_STYLES.want.text}`}>
                    Wants {formatCurrency(wants)}
                  </span>
                </span>
              )}
              {savings > 0 && (
                <span className={`inline-flex items-center gap-1.5 ${TYPE_STYLES.savings.bg} border ${TYPE_STYLES.savings.border} rounded-full px-3 py-1.5`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${TYPE_STYLES.savings.dot} shrink-0`} />
                  <span className={`text-xs font-medium ${TYPE_STYLES.savings.text}`}>
                    Savings {formatCurrency(savings)}
                  </span>
                </span>
              )}
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
  const typeStyle = TYPE_STYLES[expense.type] ?? TYPE_STYLES.want

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
        <span className={`text-[10px] font-medium ${typeStyle.text} ${typeStyle.bg} px-1.5 py-0.5 rounded`}>
          {typeStyle.label}
        </span>
      </div>
    </button>
  )
}
