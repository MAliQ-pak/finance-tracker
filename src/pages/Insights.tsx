import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { getExpensesForMonth } from '@/db/expenses'
import { getMonthlyIncome, getBudgetSplits } from '@/lib/preferences'
import { calculateTargets, monthPace } from '@/lib/budget'
import { generateInsights } from '@/lib/insights'
import { CATEGORY_COLORS, formatCurrency } from '@/lib/categories'
import type { Expense } from '@/db/db'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const TYPE_COLORS = { need: '#3b82f6', want: '#a855f7', savings: '#10b981' }

function pct(value: number, total: number) {
  if (total === 0) return 0
  return Math.min(100, Math.round((value / total) * 100))
}

function fmt(n: number) {
  if (n >= 100_000) return `₨${(n / 1000).toFixed(0)}k`
  if (n >= 1_000) return `₨${(n / 1000).toFixed(1)}k`
  return `₨${n.toFixed(0)}`
}

interface ProgressBarProps {
  label: string
  spent: number
  target: number
  color: string
  pace: number
}

function BudgetBar({ label, spent, target, color, pace }: ProgressBarProps) {
  const spentPct = target > 0 ? Math.min(100, (spent / target) * 100) : 0
  const pacePct = Math.min(100, pace * 100)
  const over = target > 0 && spent > target

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-xs font-semibold" style={{ color }}>{label}</span>
        <span className="text-xs text-slate-400">
          {formatCurrency(spent)}
          {target > 0 && <span className="text-slate-600"> / {formatCurrency(target)}</span>}
        </span>
      </div>
      <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{ width: `${spentPct}%`, backgroundColor: over ? '#ef4444' : color }}
        />
        {target > 0 && (
          <div
            className="absolute top-0 w-0.5 h-full bg-slate-500 opacity-60"
            style={{ left: `${pacePct}%` }}
          />
        )}
      </div>
      <div className="flex justify-between">
        <span className="text-[10px] text-slate-600">
          {target > 0 ? `${pct(spent, target)}% of budget` : 'No target set'}
        </span>
        {over && <span className="text-[10px] text-red-400">Over by {formatCurrency(spent - target)}</span>}
      </div>
    </div>
  )
}

export default function Insights() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const income = getMonthlyIncome()
  const splits = getBudgetSplits()
  const targets = calculateTargets(income, splits)
  const pace = monthPace(year, month)

  const expenses = useLiveQuery(
    () => getExpensesForMonth(year, month),
    [year, month]
  ) ?? []

  const { needs, wants, savings, total, categoryMap, dailyData, topExpenses, typeData } = useMemo(() => {
    let needs = 0, wants = 0, savings = 0
    const categoryMap: Record<string, number> = {}
    const dailyMap: Record<string, number> = {}

    for (const e of expenses) {
      if (e.type === 'need') needs += e.amount
      else if (e.type === 'want') wants += e.amount
      else savings += e.amount
      categoryMap[e.category] = (categoryMap[e.category] ?? 0) + e.amount
      dailyMap[e.date] = (dailyMap[e.date] ?? 0) + e.amount
    }

    const total = needs + wants + savings

    const dailyData = Object.entries(dailyMap)
      .map(([date, amount]) => ({ date: date.slice(8), amount }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const topExpenses = [...expenses]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)

    const typeData = [
      { name: 'Needs', value: needs, color: TYPE_COLORS.need },
      { name: 'Wants', value: wants, color: TYPE_COLORS.want },
      { name: 'Savings', value: savings, color: TYPE_COLORS.savings },
    ].filter(d => d.value > 0)

    return { needs, wants, savings, total, categoryMap, dailyData, topExpenses, typeData }
  }, [expenses])

  const insights = useMemo(
    () => generateInsights(expenses, targets, income, pace),
    [expenses, targets, income, pace]
  )

  const catChartData = useMemo(() =>
    Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value, color: CATEGORY_COLORS[name as keyof typeof CATEGORY_COLORS] ?? '#6b7280' }))
      .sort((a, b) => b.value - a.value),
    [categoryMap]
  )

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
    if (isCurrentMonth) return
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  return (
    <div className="flex flex-col gap-5 px-4 py-5 pb-8 overflow-y-auto">

      {/* Month switcher */}
      <div className="flex items-center justify-between bg-slate-900 rounded-2xl px-4 py-3">
        <button onClick={prevMonth} className="p-1 text-slate-400 active:text-slate-200">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <p className="text-base font-semibold text-slate-100">{MONTH_NAMES[month - 1]} {year}</p>
          <p className="text-xs text-slate-500">{formatCurrency(total)} total</p>
        </div>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className="p-1 text-slate-400 active:text-slate-200 disabled:opacity-30"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {expenses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <p className="text-slate-300 font-medium">No data for this month</p>
          <p className="text-sm text-slate-600">Add expenses to see insights</p>
        </div>
      )}

      {expenses.length > 0 && (
        <>
          {/* 50/30/20 Budget bars */}
          <section>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">50 / 30 / 20 Budget</p>
            {income === 0 && (
              <p className="text-xs text-slate-600 mb-3">Set your monthly income in Settings to see targets.</p>
            )}
            <div className="bg-slate-900 rounded-2xl p-4 flex flex-col gap-4">
              <BudgetBar label="Needs" spent={needs} target={targets.needs} color={TYPE_COLORS.need} pace={pace} />
              <BudgetBar label="Wants" spent={wants} target={targets.wants} color={TYPE_COLORS.want} pace={pace} />
              <BudgetBar label="Savings" spent={savings} target={targets.savings} color={TYPE_COLORS.savings} pace={pace} />
            </div>
          </section>

          {/* Smart insights */}
          {insights.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Insights</p>
              <div className="flex flex-col gap-2">
                {insights.map(card => (
                  <div
                    key={card.id}
                    className={`flex gap-3 p-3.5 rounded-xl border ${
                      card.severity === 'good'
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : card.severity === 'warn'
                        ? 'bg-amber-500/5 border-amber-500/20'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <span className="text-lg shrink-0">{card.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{card.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{card.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Category donut */}
          {catChartData.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">By Category</p>
              <div className="bg-slate-900 rounded-2xl p-4">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={catChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {catChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), '']}
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                      itemStyle={{ color: '#cbd5e1' }}
                      labelStyle={{ color: '#94a3b8' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
                  {catChartData.map(({ name, value, color }) => (
                    <div key={name} className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-xs text-slate-400 truncate">{name}</span>
                      <span className="text-xs text-slate-300 ml-auto shrink-0">{pct(value, total)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Type split bar */}
          {typeData.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Needs / Wants / Savings</p>
              <div className="bg-slate-900 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                  {typeData.map(({ name, value, color }) => (
                    <div
                      key={name}
                      style={{ width: `${pct(value, total)}%`, backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex gap-4">
                  {typeData.map(({ name, value, color }) => (
                    <div key={name} className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>{name}</span>
                      <span className="text-sm font-bold text-slate-200">{pct(value, total)}%</span>
                      <span className="text-xs text-slate-500">{fmt(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Daily trend */}
          {dailyData.length > 1 && (
            <section>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Daily Spending</p>
              <div className="bg-slate-900 rounded-2xl p-4">
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={dailyData} barSize={8}>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      formatter={(v: number) => [formatCurrency(v), 'Spent']}
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                      itemStyle={{ color: '#cbd5e1' }}
                      labelStyle={{ color: '#94a3b8' }}
                    />
                    <Bar dataKey="amount" fill="#10b981" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* Top 5 expenses */}
          {topExpenses.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Top Expenses</p>
              <div className="bg-slate-900 rounded-2xl overflow-hidden">
                {topExpenses.map((e: Expense, i: number) => (
                  <div
                    key={e.id}
                    className={`flex items-center gap-3 px-4 py-3 ${i < topExpenses.length - 1 ? 'border-b border-slate-800/60' : ''}`}
                  >
                    <span className="text-xs font-bold text-slate-600 w-4">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200">{e.category}</p>
                      {e.note && <p className="text-xs text-slate-500 truncate">{e.note}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span className="text-sm font-semibold text-slate-100">{formatCurrency(e.amount)}</span>
                      <span className="text-[10px] text-slate-600">{e.date.slice(5)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
