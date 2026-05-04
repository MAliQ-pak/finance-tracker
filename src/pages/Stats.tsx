import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
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

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 bg-slate-900 rounded-2xl px-4 py-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-slate-100">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
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

  return (
    <div className="flex flex-col gap-4 px-4 py-5 pb-8 overflow-y-auto">
      <div>
        <button onClick={() => navigate('/settings')} className="text-xs text-slate-500 mb-1">← Settings</button>
        <h1 className="text-base font-semibold text-slate-200">Lifetime Stats</h1>
        {stats.firstEntryDate && (
          <p className="text-xs text-slate-500 mt-0.5">Tracking since {stats.firstEntryDate}</p>
        )}
      </div>

      {stats.totalExpenses === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
          <p className="text-slate-300 font-medium">No data yet</p>
          <p className="text-sm text-slate-600">Add expenses to see your lifetime stats.</p>
        </div>
      ) : (
        <>
          {/* Totals */}
          <section>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Totals</p>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Total tracked"
                value={formatCurrency(stats.totalTrackedAmount)}
                sub={`${stats.totalExpenses} transactions`}
              />
              <StatCard
                label="Total saved"
                value={formatCurrency(stats.totalSavedToGoals)}
                sub={allGoals.length > 0 ? `${allGoals.length} goal${allGoals.length !== 1 ? 's' : ''} · target ${formatCurrency(totalGoalTarget)}` : 'No goals set'}
              />
            </div>
          </section>

          {/* Best months */}
          <section>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Best months</p>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Biggest savings month"
                value={stats.biggestSavingsMonthAmount > 0 ? formatCurrency(stats.biggestSavingsMonthAmount) : '—'}
                sub={labelYM(stats.biggestSavingsMonthLabel)}
              />
              <StatCard
                label="Best savings rate"
                value={stats.bestSavingsRate > 0 ? `${Math.round(stats.bestSavingsRate * 100)}%` : '—'}
                sub={labelYM(stats.bestSavingsRateMonth)}
              />
            </div>
          </section>

          {/* Streaks */}
          <section>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">No-spend streaks</p>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Longest ever"
                value={`${stats.longestNoSpendStreak} day${stats.longestNoSpendStreak !== 1 ? 's' : ''}`}
              />
              <StatCard
                label="Total no-spend days"
                value={`${stats.totalNoSpendDays}`}
                sub={stats.totalExpenses > 0 ? `out of ${Math.round((Date.now() - new Date((stats.firstEntryDate ?? '') + 'T12:00:00').getTime()) / 86400000)} days tracked` : undefined}
              />
            </div>
          </section>

          {/* Income context */}
          {income > 0 && (
            <section>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Monthly context</p>
              <div className="bg-slate-900 rounded-2xl px-4 py-4 flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Monthly income</span>
                  <span className="text-sm text-slate-200 font-medium">{formatCurrency(income)}</span>
                </div>
                {stats.totalExpenses > 0 && stats.firstEntryDate && (
                  <>
                    <div className="h-px bg-slate-800" />
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">All-time avg. monthly spend</span>
                      <span className="text-sm text-slate-200 font-medium">
                        {(() => {
                          const days = Math.max(1, Math.round((Date.now() - new Date(stats.firstEntryDate + 'T12:00:00').getTime()) / 86400000))
                          const months = Math.max(1, days / 30)
                          return formatCurrency(stats.totalTrackedAmount / months)
                        })()}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
