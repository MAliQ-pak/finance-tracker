import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { db } from '@/db/db'
import { formatCurrency } from '@/lib/categories'
import { calculateLifetimeStats } from '@/lib/streaks'
import { getMonthlyIncome } from '@/lib/preferences'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function labelYM(ym: string | null): string {
  if (!ym) return '—'
  const [y, m] = ym.split('-')
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`
}

function StatRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between px-6 py-3.5 border-b border-[rgba(255,255,255,0.05)]">
      <div>
        <p className="text-[rgba(255,255,255,0.70)] text-[13px] font-medium">{label}</p>
        {sub && <p className="text-[rgba(255,255,255,0.70)] text-[11px] mt-0.5">{sub}</p>}
      </div>
      <p className="text-[rgba(255,255,255,0.82)] text-[13px] font-semibold tabular">{value}</p>
    </div>
  )
}

export default function Stats() {
  const navigate = useNavigate()
  const income = getMonthlyIncome()

  const allExpenses = useLiveQuery(() => db.expenses.toArray()) ?? []
  const allGoals = useLiveQuery(() => db.goals.toArray()) ?? []

  const stats = useMemo(() => calculateLifetimeStats(allExpenses), [allExpenses])

  const totalGoalTarget = allGoals.reduce((s, g) => s + g.targetAmount, 0)

  const avgMonthlySpend = useMemo(() => {
    if (!stats.firstEntryDate || stats.totalExpenses === 0) return null
    const days = Math.max(1, Math.round((Date.now() - new Date(stats.firstEntryDate + 'T12:00:00').getTime()) / 86400000))
    const months = Math.max(1, days / 30)
    return stats.totalTrackedAmount / months
  }, [stats])

  return (
    <div className="flex flex-col overflow-y-auto pb-8">
      {/* Page header */}
      <div className="flex items-center gap-3 px-6 pt-5 pb-0">
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center justify-center w-8 h-8 -ml-1 rounded-full text-[rgba(255,255,255,0.60)] active:text-[rgba(255,255,255,0.6)] transition-colors"
        >
          <ChevronLeft size={18} strokeWidth={1.5} />
        </button>
        <p className="text-[rgba(255,255,255,0.85)] text-[20px] font-[700] tracking-[-0.8px]">Lifetime Stats</p>
      </div>

      {stats.firstEntryDate && (
        <p className="px-6 pt-2 text-[rgba(255,255,255,0.70)] text-xs">
          Tracking since {stats.firstEntryDate}
        </p>
      )}

      {stats.totalExpenses === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-center px-8">
          <p className="text-[rgba(255,255,255,0.5)] text-sm font-medium">No data yet</p>
          <p className="text-[rgba(255,255,255,0.50)] text-xs">Add expenses to see your lifetime stats.</p>
        </div>
      ) : (
        <>
          {/* Totals */}
          <div className="px-6 pt-5 pb-0">
            <p className="section-label mb-3">Totals</p>
          </div>
          <div className="border-t border-[rgba(255,255,255,0.05)]">
            <StatRow
              label="Total tracked"
              value={formatCurrency(stats.totalTrackedAmount)}
              sub={`${stats.totalExpenses} transactions`}
            />
            <StatRow
              label="Total saved to goals"
              value={formatCurrency(stats.totalSavedToGoals)}
              sub={allGoals.length > 0 ? `${allGoals.length} goal${allGoals.length !== 1 ? 's' : ''} · target ${formatCurrency(totalGoalTarget)}` : 'No goals set'}
            />
          </div>

          {/* Best months */}
          <div className="px-6 pt-5 pb-0">
            <p className="section-label mb-3">Best months</p>
          </div>
          <div className="border-t border-[rgba(255,255,255,0.05)]">
            <StatRow
              label="Biggest savings month"
              value={stats.biggestSavingsMonthAmount > 0 ? formatCurrency(stats.biggestSavingsMonthAmount) : '—'}
              sub={labelYM(stats.biggestSavingsMonthLabel)}
            />
            <StatRow
              label="Best savings rate"
              value={stats.bestSavingsRate > 0 ? `${Math.round(stats.bestSavingsRate * 100)}%` : '—'}
              sub={labelYM(stats.bestSavingsRateMonth)}
            />
          </div>

          {/* Streaks */}
          <div className="px-6 pt-5 pb-0">
            <p className="section-label mb-3">No-spend streaks</p>
          </div>
          <div className="border-t border-[rgba(255,255,255,0.05)]">
            <StatRow
              label="Longest ever"
              value={`${stats.longestNoSpendStreak} day${stats.longestNoSpendStreak !== 1 ? 's' : ''}`}
            />
            <StatRow
              label="Total no-spend days"
              value={`${stats.totalNoSpendDays}`}
              sub={stats.firstEntryDate
                ? `out of ${Math.round((Date.now() - new Date(stats.firstEntryDate + 'T12:00:00').getTime()) / 86400000)} days tracked`
                : undefined}
            />
          </div>

          {/* Income context */}
          {income > 0 && (
            <>
              <div className="px-6 pt-5 pb-0">
                <p className="section-label mb-3">Monthly context</p>
              </div>
              <div className="border-t border-[rgba(255,255,255,0.05)]">
                <StatRow label="Monthly income" value={formatCurrency(income)} />
                {avgMonthlySpend !== null && (
                  <StatRow label="Avg monthly spend" value={formatCurrency(avgMonthlySpend)} />
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
