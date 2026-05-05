import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { Settings, ChevronRight } from 'lucide-react'
import { formatCurrency, getDateLabel } from '@/lib/categories'
import { getExpensesForMonth, computeTotals } from '@/db/expenses'
import { db } from '@/db/db'
import EditExpenseSheet from '@/components/EditExpenseSheet'
import type { Expense, ExpenseType } from '@/db/db'
import { calculateNoSpendStreak, calculateUnderBudgetStreak } from '@/lib/streaks'
import { getMonthlyIncome } from '@/lib/preferences'
import { getIcon } from '@/lib/iconMap'
import { getWalletForMonth, calculateCurrentBalances } from '@/db/wallet'

const TYPE_TAG: Record<ExpenseType, { label: string; text: string; bg: string }> = {
  need:    { label: 'Need',    text: 'text-[rgba(var(--rgb-need),0.75)]',  bg: 'bg-[rgba(var(--rgb-need),0.07)]'  },
  want:    { label: 'Want',    text: 'text-[rgba(var(--rgb-want),0.75)]', bg: 'bg-[rgba(var(--rgb-want),0.07)]' },
  savings: { label: 'Savings', text: 'text-[rgba(var(--rgb-savings),0.75)]',  bg: 'bg-[rgba(var(--rgb-savings),0.07)]'  },
}

function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

export default function Home() {
  const navigate = useNavigate()
  const now = new Date()
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)

  const income = getMonthlyIncome()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dailyBudget = income > 0 ? income / daysInMonth : 0

  const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' })

  const expenses = useLiveQuery(
    () => getExpensesForMonth(now.getFullYear(), now.getMonth() + 1),
    []
  ) ?? []

  const allExpenses = useLiveQuery(() => db.expenses.toArray()) ?? []
  const dbCategories = useLiveQuery(() => db.categories.orderBy('order').toArray()) ?? []

  const categoryMap = useMemo(() => {
    const m: Record<string, { icon: string; color: string }> = {}
    for (const c of dbCategories) m[c.label] = { icon: c.icon, color: c.color }
    return m
  }, [dbCategories])

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

  const noSpendStreak = useMemo(() => calculateNoSpendStreak(allExpenses), [allExpenses])
  const underBudgetStreak = useMemo(
    () => calculateUnderBudgetStreak(allExpenses, dailyBudget),
    [allExpenses, dailyBudget]
  )

  const walletRecord = useLiveQuery(
    () => getWalletForMonth(now.getFullYear(), now.getMonth() + 1),
    []
  )
  const walletBalances = useLiveQuery(
    async () => {
      if (!walletRecord) return null
      return calculateCurrentBalances(now.getFullYear(), now.getMonth() + 1)
    },
    [walletRecord]
  )

  const needsPct   = pct(needs, total)
  const wantsPct   = pct(wants, total)
  const savingsPct = pct(savings, total)

  return (
    <>
      <div className="flex flex-col">
        {/* Page header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <span className="text-[rgba(var(--fg),0.65)] text-xs font-medium">{monthLabel}</span>
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-[rgba(var(--fg),0.05)] text-[rgba(var(--fg),0.60)] active:bg-[rgba(var(--fg),0.08)] transition-colors"
            aria-label="Settings"
          >
            <Settings size={14} strokeWidth={1.5} />
          </button>
        </div>

        {/* Hero */}
        <div className="px-6 pt-5 pb-6">
          <p className="section-label mb-3">Spent this month</p>
          <p className="hero-amount">{formatCurrency(total)}</p>
          <p className="text-[rgba(var(--fg),0.70)] text-xs mt-2 tabular">
            {count} transaction{count !== 1 ? 's' : ''}
          </p>

          {/* 3-segment thin bar */}
          {count > 0 && (
            <>
              <div className="flex gap-[2px] mt-5 h-[2px] rounded-sm overflow-hidden">
                {needs > 0 && (
                  <div style={{ flex: needs }} className="bg-[rgba(var(--rgb-need),0.55)] rounded-sm" />
                )}
                {wants > 0 && (
                  <div style={{ flex: wants }} className="bg-[rgba(var(--rgb-want),0.55)] rounded-sm" />
                )}
                {savings > 0 && (
                  <div style={{ flex: savings }} className="bg-[rgba(var(--rgb-savings),0.55)] rounded-sm" />
                )}
              </div>
              <div className="flex gap-4 mt-2.5">
                {needs > 0 && (
                  <span className="text-[10px] font-medium text-[rgba(var(--rgb-need),0.6)]">
                    Needs {needsPct}%
                  </span>
                )}
                {wants > 0 && (
                  <span className="text-[10px] font-medium text-[rgba(var(--rgb-want),0.6)]">
                    Wants {wantsPct}%
                  </span>
                )}
                {savings > 0 && (
                  <span className="text-[10px] font-medium text-[rgba(var(--rgb-savings),0.6)]">
                    Savings {savingsPct}%
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-[rgba(var(--fg),0.05)]" />

        {/* Streak rows */}
        {noSpendStreak > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-b border-[rgba(var(--fg),0.05)]">
            <span className="section-label">Streak</span>
            <span className="text-[rgba(var(--fg),0.70)] text-xs">
              No-spend · {noSpendStreak} day{noSpendStreak !== 1 ? 's' : ''} running
            </span>
          </div>
        )}
        {underBudgetStreak > 0 && dailyBudget > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-b border-[rgba(var(--fg),0.05)]">
            <span className="section-label">Budget</span>
            <span className="text-[rgba(var(--fg),0.70)] text-xs">
              Under budget · {underBudgetStreak} day{underBudgetStreak !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Wallet remaining row */}
        {walletRecord && walletBalances && (
          <button
            onClick={() => navigate('/wallet')}
            className="flex items-center justify-between px-6 py-3 border-b border-[rgba(var(--fg),0.05)] active:bg-[rgba(var(--fg),0.02)] transition-colors w-full"
          >
            <span className="section-label">Wallet</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[rgba(var(--fg),0.70)] text-xs tabular">
                Remaining {formatCurrency(walletBalances.total)}
              </span>
              <ChevronRight size={12} strokeWidth={1.5} className="text-[rgba(var(--fg),0.35)]" />
            </div>
          </button>
        )}

        {/* Empty state */}
        {count === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-24">
            <p className="text-[rgba(var(--fg),0.65)] text-sm font-medium">No expenses yet</p>
            <p className="text-[rgba(var(--fg),0.50)] text-xs">Tap + to log your first</p>
          </div>
        )}

        {/* Expense list grouped by date */}
        {days.map(day => (
          <div key={day}>
            <div className="px-6 pt-5 pb-2">
              <p className="section-label">{getDateLabel(day)}</p>
            </div>
            <div>
              {grouped[day].map(expense => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  categoryMap={categoryMap}
                  onPress={() => setSelectedExpense(expense)}
                />
              ))}
            </div>
          </div>
        ))}

        <div className="h-6" />
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
  categoryMap,
  onPress,
}: {
  expense: Expense
  categoryMap: Record<string, { icon: string; color: string }>
  onPress: () => void
}) {
  const catData = categoryMap[expense.category]
  const Icon = getIcon(catData?.icon ?? 'MoreHorizontal')
  const color = catData?.color ?? '#6b7280'
  const tag = TYPE_TAG[expense.type] ?? TYPE_TAG.want

  return (
    <button
      onClick={onPress}
      className="flex items-center gap-4 w-full px-6 py-3.5 text-left border-b border-[rgba(var(--fg),0.05)] active:bg-[rgba(var(--fg),0.02)] transition-colors"
    >
      {/* Icon */}
      <div
        className="flex items-center justify-center w-9 h-9 rounded-[10px] shrink-0"
        style={{ backgroundColor: `${color}14` }}
      >
        <Icon size={16} strokeWidth={1.5} style={{ color: `${color}CC` }} />
      </div>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <p className="text-[rgba(var(--fg),0.78)] text-[13px] font-medium leading-snug">
          {expense.category}
        </p>
        <p className="text-[rgba(var(--fg),0.70)] text-[11px] truncate">
          {expense.note || expense.paymentMethod}
        </p>
      </div>

      {/* Amount + tag */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <p className="text-[rgba(var(--fg),0.82)] text-[13px] font-semibold tabular">
          {formatCurrency(expense.amount)}
        </p>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-sm ${tag.bg} ${tag.text}`}>
          {tag.label}
        </span>
      </div>
    </button>
  )
}
