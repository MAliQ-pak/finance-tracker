import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight, RotateCcw, Sparkles } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import {
  BarChart, Bar, XAxis, YAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import { getExpensesForMonth } from '@/db/expenses'
import { getMonthlyIncome, getBudgetSplits } from '@/lib/preferences'
import { calculateTargets, monthPace } from '@/lib/budget'
import { generateInsights } from '@/lib/insights'
import { formatCurrency } from '@/lib/categories'
import { generateMonthlyReviewPrompt } from '@/lib/aiPrompt'
import { detectRecurringExpenses, addIgnoredKey } from '@/lib/recurring'
import { db } from '@/db/db'
import type { Expense } from '@/db/db'
import { getWalletForMonth, calculateCurrentBalances } from '@/db/wallet'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function pct(value: number, total: number) {
  if (total === 0) return 0
  return Math.min(100, Math.round((value / total) * 100))
}

export default function Insights() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [copying, setCopying] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [ignoredKeys, setIgnoredKeys] = useState<Set<string>>(new Set())
  const { theme } = useTheme()

  // Recharts colors — must be resolved values (SVG attributes don't support CSS vars)
  const chartBarFill    = theme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.10)'
  const chartTickFill   = theme === 'dark' ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.42)'
  const chartTooltipBg  = theme === 'dark' ? '#0f0f0f' : '#ffffff'
  const chartTooltipBorder = theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const chartItemColor  = theme === 'dark' ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)'
  const chartLabelColor = theme === 'dark' ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.42)'
  const chartCursorFill = theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)'

  const income = getMonthlyIncome()
  const splits = getBudgetSplits()
  const targets = calculateTargets(income, splits)
  const pace = monthPace(year, month)

  const expenses = useLiveQuery(() => getExpensesForMonth(year, month), [year, month]) ?? []
  const allExpenses = useLiveQuery(() => db.expenses.toArray()) ?? []
  const dbCategories = useLiveQuery(() => db.categories.orderBy('order').toArray()) ?? []

  const categoryColorMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const c of dbCategories) m[c.label] = c.color
    return m
  }, [dbCategories])

  const { needs, wants, savings, total, catChartData, dailyData, topExpenses } = useMemo(() => {
    let needs = 0, wants = 0, savings = 0
    const catMap: Record<string, number> = {}
    const dailyMap: Record<string, number> = {}

    for (const e of expenses) {
      if (e.type === 'need') needs += e.amount
      else if (e.type === 'want') wants += e.amount
      else savings += e.amount
      catMap[e.category] = (catMap[e.category] ?? 0) + e.amount
      dailyMap[e.date] = (dailyMap[e.date] ?? 0) + e.amount
    }

    const total = needs + wants + savings
    const dailyData = Object.entries(dailyMap)
      .map(([date, amount]) => ({ date: date.slice(8), amount }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const topExpenses = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5)

    const catChartData = Object.entries(catMap)
      .map(([name, value]) => ({ name, value, color: categoryColorMap[name] ?? '#6b7280' }))
      .sort((a, b) => b.value - a.value)

    return { needs, wants, savings, total, catChartData, dailyData, topExpenses }
  }, [expenses, categoryColorMap])

  const insights = useMemo(
    () => generateInsights(expenses, targets, income, pace),
    [expenses, targets, income, pace]
  )

  const recurring = useMemo(() => detectRecurringExpenses(allExpenses), [allExpenses, ignoredKeys])
  const subscriptions = recurring.filter(r => r.isSubscription)
  const subscriptionTotal = subscriptions.reduce((s, r) => s + r.averageAmount, 0)

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3500)
  }

  async function handleAIReview() {
    setCopying(true)
    try {
      const prompt = await generateMonthlyReviewPrompt(year, month)
      await navigator.clipboard.writeText(prompt)
      localStorage.setItem('lastAIReview', new Date().toISOString())
      showToast('Copied! Paste into Claude.ai for your personalized review.')
    } catch {
      showToast('Could not copy — try again.')
    } finally {
      setCopying(false)
    }
  }

  function handleIgnoreRecurring(key: string) {
    addIgnoredKey(key)
    setIgnoredKeys(prev => new Set([...prev, key]))
  }

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

  const walletRecord = useLiveQuery(
    () => isCurrentMonth ? getWalletForMonth(year, month) : Promise.resolve(undefined),
    [year, month, isCurrentMonth]
  )
  const walletBalances = useLiveQuery(
    async () => {
      if (!walletRecord || !isCurrentMonth) return null
      return calculateCurrentBalances(year, month)
    },
    [walletRecord, year, month, isCurrentMonth]
  )

  // Budget row data
  const budgetRows = [
    {
      label: 'Needs',
      spent: needs,
      target: targets.needs,
      targetPct: splits.needs,
      actualPct: pct(needs, total),
      color: 'rgba(var(--rgb-need),',
    },
    {
      label: 'Wants',
      spent: wants,
      target: targets.wants,
      targetPct: splits.wants,
      actualPct: pct(wants, total),
      color: 'rgba(var(--rgb-want),',
    },
    {
      label: 'Savings',
      spent: savings,
      target: targets.savings,
      targetPct: splits.savings,
      actualPct: pct(savings, total),
      color: 'rgba(var(--rgb-savings),',
    },
  ]

  return (
    <div className="flex flex-col overflow-y-auto pb-8">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-0">
        <p className="text-[rgba(var(--fg),0.85)] text-[20px] font-[700] tracking-[-0.8px]">Insights</p>
        <button
          onClick={handleAIReview}
          disabled={copying}
          className="flex items-center gap-1.5 text-[rgba(var(--fg),0.60)] text-xs font-medium active:text-[rgba(var(--fg),0.6)] transition-colors disabled:opacity-40"
        >
          <Sparkles size={12} strokeWidth={1.5} />
          {copying ? 'Copying…' : 'AI Review ↗'}
        </button>
      </div>

      {/* Month switcher */}
      <div className="flex items-center justify-between px-6 pt-3 pb-0">
        <button onClick={prevMonth} className="text-[rgba(var(--fg),0.60)] active:text-[rgba(var(--fg),0.6)] p-1">
          <ChevronLeft size={16} strokeWidth={1.5} />
        </button>
        <span className="text-[rgba(var(--fg),0.65)] text-xs font-medium">
          {MONTH_NAMES[month - 1]} {year}
          {total > 0 && <span className="ml-2 text-[rgba(var(--fg),0.70)]">· {formatCurrency(total)}</span>}
        </span>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className="text-[rgba(var(--fg),0.60)] active:text-[rgba(var(--fg),0.6)] disabled:opacity-20 p-1"
        >
          <ChevronRight size={16} strokeWidth={1.5} />
        </button>
      </div>

      {expenses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-2">
          <p className="text-[rgba(var(--fg),0.60)] text-sm font-medium">No data for this month</p>
          <p className="text-[rgba(var(--fg),0.50)] text-xs">Add expenses to see insights</p>
        </div>
      )}

      {expenses.length > 0 && (
        <>
          {/* Budget vs actual */}
          <div className="mt-5">
            <div className="px-6 mb-3">
              <p className="section-label">Budget vs actual</p>
            </div>
            {income === 0 && (
              <div className="px-6 mb-3">
                <p className="text-[rgba(var(--fg),0.70)] text-xs">Set monthly income in Settings to see targets.</p>
              </div>
            )}
            <div className="flex flex-col">
              {budgetRows.map((row, i) => {
                const over = row.target > 0 && row.spent > row.target
                const barWidth = row.target > 0 ? Math.min(100, (row.spent / row.target) * 100) : 0
                const pctOfTarget = row.target > 0
                  ? `${row.actualPct}% of ${row.targetPct}%`
                  : `${row.actualPct}% of total`
                const deltaColor = over ? 'rgba(var(--rgb-warning),0.85)' : `${row.color}0.65)`

                return (
                  <div
                    key={row.label}
                    className={`px-6 py-4 ${i < budgetRows.length - 1 ? 'border-b border-[rgba(var(--fg),0.05)]' : ''}`}
                  >
                    <div className="flex justify-between items-baseline mb-2.5">
                      <span className="text-[rgba(var(--fg),0.70)] text-[13px] font-medium">{row.label}</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-[rgba(var(--fg),0.78)] text-[13px] font-semibold tabular">
                          {formatCurrency(row.spent)}
                        </span>
                        <span
                          className="text-[10px] font-medium"
                          style={{ color: deltaColor }}
                        >
                          {pctOfTarget}{over ? ' ↑' : ''}
                        </span>
                      </div>
                    </div>
                    {/* 2px progress bar */}
                    <div className="h-[2px] bg-[rgba(var(--fg),0.05)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: over ? 'rgba(var(--rgb-warning),0.55)' : `${row.color}0.5)`,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Wallet remaining row */}
          {walletRecord && walletBalances && income > 0 && (
            <>
              <div className="h-px bg-[rgba(var(--fg),0.05)]" />
              <div className="flex items-center justify-between px-6 py-3.5">
                <span className="text-[rgba(var(--fg),0.70)] text-[13px] font-medium">Wallet remaining</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-[rgba(var(--fg),0.78)] text-[13px] font-semibold tabular">
                    {formatCurrency(walletBalances.total)}
                  </span>
                  {walletBalances.total > 0 && income > 0 && (
                    <span className="text-[10px] font-medium text-[rgba(var(--fg),0.45)]">
                      {Math.round((walletBalances.total / income) * 100)}% of income left
                    </span>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Divider */}
          <div className="h-px bg-[rgba(var(--fg),0.05)]" />

          {/* Top categories */}
          {catChartData.length > 0 && (
            <div className="mt-5">
              <div className="px-6 mb-3">
                <p className="section-label">Top categories</p>
              </div>
              <div className="flex flex-col">
                {catChartData.slice(0, 6).map((cat, i) => {
                  const share = pct(cat.value, total)
                  const barFlex = share

                  return (
                    <div
                      key={cat.name}
                      className={`flex items-center gap-3 px-6 py-3 ${i < Math.min(catChartData.length, 6) - 1 ? 'border-b border-[rgba(var(--fg),0.04)]' : ''}`}
                    >
                      {/* Color bar indicator — varying width */}
                      <div
                        className="h-[2px] rounded-full shrink-0 transition-all"
                        style={{
                          width: `${Math.max(6, barFlex * 2)}px`,
                          backgroundColor: cat.color,
                          opacity: 0.6,
                        }}
                      />
                      <span className="text-[rgba(var(--fg),0.70)] text-[12px] flex-1 truncate">{cat.name}</span>
                      <span className="text-[rgba(var(--fg),0.7)] text-[12px] font-semibold tabular">
                        {formatCurrency(cat.value)}
                      </span>
                      <span className="text-[rgba(var(--fg),0.70)] text-[10px] w-7 text-right tabular">
                        {share}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-[rgba(var(--fg),0.05)]" />

          {/* Notice / Insights */}
          {insights.length > 0 && (
            <div className="px-6 pt-5 pb-4">
              <p className="section-label mb-3">Notice</p>
              <div className="flex flex-col gap-4">
                {insights.map(card => (
                  <div key={card.id}>
                    <p className="text-[rgba(var(--fg),0.42)] text-[12px] leading-relaxed">
                      <span
                        className="font-medium mr-1.5"
                        style={{
                          color: card.severity === 'good'
                            ? 'rgba(var(--rgb-savings),0.65)'
                            : card.severity === 'warn'
                            ? 'rgba(var(--rgb-amber),0.65)'
                            : 'rgba(var(--fg),0.4)',
                        }}
                      >
                        {card.title}.
                      </span>
                      {card.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          {insights.length > 0 && <div className="h-px bg-[rgba(var(--fg),0.05)]" />}

          {/* Recurring */}
          {recurring.length > 0 && (
            <div className="pt-5">
              <div className="px-6 mb-3 flex items-center justify-between">
                <p className="section-label">Recurring</p>
                {subscriptions.length > 0 && (
                  <span className="text-[rgba(var(--fg),0.70)] text-[10px] tabular">
                    {formatCurrency(subscriptionTotal)}/mo
                  </span>
                )}
              </div>
              <div className="flex flex-col">
                {recurring.slice(0, 6).map((item, i) => (
                  <div
                    key={item.key}
                    className={`flex items-center gap-3 px-6 py-3 ${i < Math.min(recurring.length, 6) - 1 ? 'border-b border-[rgba(var(--fg),0.04)]' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[rgba(var(--fg),0.6)] text-[13px] font-medium truncate">{item.note}</p>
                      <p className="text-[rgba(var(--fg),0.70)] text-[10px]">
                        {item.category}
                        {item.isSubscription && <span className="ml-1.5 text-[rgba(var(--rgb-want),0.5)]">sub</span>}
                        {' · '}{item.monthsSeen} months
                      </p>
                    </div>
                    <span className="text-[rgba(var(--fg),0.65)] text-[12px] font-medium tabular">
                      {formatCurrency(item.averageAmount)}/mo
                    </span>
                    <button
                      onClick={() => handleIgnoreRecurring(item.key)}
                      className="text-[rgba(var(--fg),0.15)] hover:text-[rgba(var(--fg),0.35)] transition-colors"
                      title="Not recurring"
                    >
                      <RotateCcw size={11} strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          {recurring.length > 0 && <div className="h-px bg-[rgba(var(--fg),0.05)]" />}

          {/* Daily bar chart — minimal */}
          {dailyData.length > 1 && (
            <div className="px-6 pt-5 pb-2">
              <p className="section-label mb-4">Daily spending</p>
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={dailyData} barSize={5} barCategoryGap="30%">
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: chartTickFill, fontFamily: 'Inter' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    formatter={(v: any) => [typeof v === 'number' ? formatCurrency(v) : 'Rs 0', '']}
                    contentStyle={{
                      background: chartTooltipBg,
                      border: `1px solid ${chartTooltipBorder}`,
                      borderRadius: 8,
                      fontSize: 11,
                      fontFamily: 'Inter',
                    }}
                    itemStyle={{ color: chartItemColor }}
                    labelStyle={{ color: chartLabelColor, fontSize: 10 }}
                    cursor={{ fill: chartCursorFill }}
                  />
                  <Bar dataKey="amount" fill={chartBarFill} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top 5 expenses */}
          {topExpenses.length > 0 && (
            <div className="pt-5">
              <div className="px-6 mb-3">
                <p className="section-label">Top expenses</p>
              </div>
              <div className="flex flex-col">
                {topExpenses.map((e: Expense, i: number) => (
                  <div
                    key={e.id}
                    className={`flex items-center gap-3 px-6 py-3 ${i < topExpenses.length - 1 ? 'border-b border-[rgba(var(--fg),0.04)]' : ''}`}
                  >
                    <span className="text-[rgba(var(--fg),0.15)] text-[10px] font-medium w-4 tabular">
                      #{i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[rgba(var(--fg),0.6)] text-[13px] font-medium truncate">{e.category}</p>
                      {e.note && <p className="text-[rgba(var(--fg),0.70)] text-[10px] truncate">{e.note}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span className="text-[rgba(var(--fg),0.7)] text-[13px] font-semibold tabular">
                        {formatCurrency(e.amount)}
                      </span>
                      <span className="text-[rgba(var(--fg),0.50)] text-[10px]">{e.date.slice(5)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#111] border border-[rgba(var(--fg),0.08)] text-[rgba(var(--fg),0.7)] text-xs font-medium px-4 py-3 rounded-xl shadow-xl max-w-[300px] text-center">
          {toastMsg}
        </div>
      )}
    </div>
  )
}
