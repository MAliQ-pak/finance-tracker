import { useState, useMemo, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight, RotateCcw, Sparkles } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import {
  BarChart, Bar, XAxis, YAxis,
  ResponsiveContainer, Tooltip,
  PieChart, Pie, Cell,
  ComposedChart, Area, Line,
} from 'recharts'
import { getChartColors } from '@/lib/chartColors'
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

function ProgressRing({
  value, target, color, warn, ringBg, label, spent,
}: {
  value: number; target: number; color: string; warn: string; ringBg: string; label: string; spent: number;
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

  const p = target > 0 ? (value / target) * 100 : 0
  const size = 88, strokeW = 8, r = (size - strokeW) / 2
  const circ = 2 * Math.PI * r
  const isOver = p > 100
  const offset = circ * (1 - (mounted ? Math.min(p, 100) / 100 : 0))
  const strokeColor = isOver ? warn : color

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ringBg} strokeWidth={strokeW} />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={`${circ}`}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-bold tabular" style={{ color: strokeColor }}>
            {target > 0 ? `${Math.round(p)}%` : '—'}
          </span>
        </div>
      </div>
      <span className="text-[rgba(var(--fg),0.82)] text-[11px] font-semibold">{label}</span>
      <span className="text-[rgba(var(--fg),0.45)] text-[10px] tabular">{formatCurrency(spent)}</span>
      {target > 0 && (
        <span className="text-[rgba(var(--fg),0.28)] text-[9px] tabular">of {formatCurrency(target)}</span>
      )}
    </div>
  )
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 60, h = 20
  if (data.length === 0) return <div style={{ width: w, height: h }} />
  const max = Math.max(...data, 1)
  const bw = Math.max(1, (w / data.length) - 0.5)
  return (
    <svg width={w} height={h}>
      {data.map((v, i) => {
        const bh = Math.max(1, (v / max) * h)
        return (
          <rect
            key={i}
            x={i * (w / data.length)}
            y={h - bh}
            width={bw}
            height={bh}
            fill={color}
            opacity={0.65}
            rx={0.5}
          />
        )
      })}
    </svg>
  )
}

function getCellColor(amount: number, maxAmount: number): string {
  if (amount === 0) return 'transparent'
  const ratio = maxAmount > 0 ? amount / maxAmount : 0
  if (ratio < 0.33) return 'rgba(34,197,94,0.50)'
  if (ratio < 0.67) return 'rgba(251,191,36,0.55)'
  return 'rgba(239,68,68,0.60)'
}

export default function Insights() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [copying, setCopying] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [ignoredKeys, setIgnoredKeys] = useState<Set<string>>(new Set())
  const { theme } = useTheme()

  const clr = getChartColors(theme)

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

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay()

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

  const {
    needs, wants, savings, total,
    catChartData,
    stackedDailyData,
    cumulativeData,
    dayAmountMap,
    topExpenses,
  } = useMemo(() => {
    let needs = 0, wants = 0, savings = 0
    const catMap: Record<string, { value: number; dailyMap: Record<number, number> }> = {}
    const dayNeedMap: Record<number, number> = {}
    const dayWantMap: Record<number, number> = {}
    const daySavMap: Record<number, number> = {}
    const dayAmountMap: Record<number, number> = {}

    for (const e of expenses) {
      const day = parseInt(e.date.slice(8), 10)
      const amt = e.amount

      if (e.type === 'need') {
        needs += amt
        dayNeedMap[day] = (dayNeedMap[day] ?? 0) + amt
      } else if (e.type === 'want') {
        wants += amt
        dayWantMap[day] = (dayWantMap[day] ?? 0) + amt
      } else {
        savings += amt
        daySavMap[day] = (daySavMap[day] ?? 0) + amt
      }
      dayAmountMap[day] = (dayAmountMap[day] ?? 0) + amt

      if (!catMap[e.category]) catMap[e.category] = { value: 0, dailyMap: {} }
      catMap[e.category].value += amt
      catMap[e.category].dailyMap[day] = (catMap[e.category].dailyMap[day] ?? 0) + amt
    }

    const total = needs + wants + savings
    const todayDay = isCurrentMonth ? now.getDate() : daysInMonth

    const stackedDailyData = Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1
      return {
        day: String(d),
        need: dayNeedMap[d] ?? 0,
        want: dayWantMap[d] ?? 0,
        savings: daySavMap[d] ?? 0,
      }
    })

    let cumulative = 0
    const cumulativeData = Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1
      cumulative += dayAmountMap[d] ?? 0
      return {
        day: d,
        actual: d <= todayDay ? cumulative : null,
        pace: income > 0 ? income * (d / daysInMonth) : 0,
      }
    })

    const catChartData = Object.entries(catMap)
      .map(([name, { value, dailyMap }]) => ({
        name,
        value,
        color: categoryColorMap[name] ?? '#6b7280',
        dailyData: Array.from({ length: daysInMonth }, (_, i) => dailyMap[i + 1] ?? 0),
      }))
      .sort((a, b) => b.value - a.value)

    const topExpenses = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5)

    return { needs, wants, savings, total, catChartData, stackedDailyData, cumulativeData, dayAmountMap, topExpenses }
  }, [expenses, categoryColorMap, daysInMonth, isCurrentMonth, income])

  const donutData = [
    { name: 'Needs', value: needs, color: clr.need },
    { name: 'Wants', value: wants, color: clr.want },
    { name: 'Savings', value: savings, color: clr.savings },
  ].filter(d => d.value > 0)

  const maxDayAmount = Math.max(...Object.values(dayAmountMap), 1)

  const insights = useMemo(
    () => generateInsights(expenses, targets, income, pace),
    [expenses, targets, income, pace]
  )

  const recurring = useMemo(() => detectRecurringExpenses(allExpenses), [allExpenses, ignoredKeys])
  const subscriptions = recurring.filter(r => r.isSubscription)
  const subscriptionTotal = subscriptions.reduce((s, r) => s + r.averageAmount, 0)

  // Monday-first heatmap offset
  const heatmapCells = useMemo(() => {
    const offset = (firstDayOfMonth + 6) % 7
    return [
      ...Array<null>(offset).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]
  }, [firstDayOfMonth, daysInMonth])

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
    if (isCurrentMonth) return
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  return (
    <div className="flex flex-col overflow-y-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-0">
        <p className="text-[rgba(var(--fg),0.85)] text-[20px] font-[700] tracking-[-0.8px]">Insights</p>
        <button
          onClick={handleAIReview}
          disabled={copying}
          className="flex items-center gap-1.5 text-[rgba(var(--fg),0.60)] text-xs font-medium transition-colors disabled:opacity-40"
        >
          <Sparkles size={12} strokeWidth={1.5} />
          {copying ? 'Copying…' : 'AI Review ↗'}
        </button>
      </div>

      {/* Month switcher */}
      <div className="flex items-center justify-between px-6 pt-3 pb-0">
        <button onClick={prevMonth} className="text-[rgba(var(--fg),0.60)] p-1">
          <ChevronLeft size={16} strokeWidth={1.5} />
        </button>
        <span className="text-[rgba(var(--fg),0.65)] text-xs font-medium">
          {MONTH_NAMES[month - 1]} {year}
          {total > 0 && <span className="ml-2 text-[rgba(var(--fg),0.70)]">· {formatCurrency(total)}</span>}
        </span>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className="text-[rgba(var(--fg),0.60)] disabled:opacity-20 p-1"
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
          {/* Progress Rings */}
          <div key={`rings-${year}-${month}`} className="mt-6 px-6">
            <p className="section-label mb-4">Budget split</p>
            <div className="flex justify-around">
              <ProgressRing
                value={needs} target={targets.needs}
                color={clr.need} warn={clr.warn} ringBg={clr.ringBg}
                label="Needs" spent={needs}
              />
              <ProgressRing
                value={wants} target={targets.wants}
                color={clr.want} warn={clr.warn} ringBg={clr.ringBg}
                label="Wants" spent={wants}
              />
              <ProgressRing
                value={savings} target={targets.savings}
                color={clr.savings} warn={clr.warn} ringBg={clr.ringBg}
                label="Savings" spent={savings}
              />
            </div>
            {income === 0 && (
              <p className="text-[rgba(var(--fg),0.35)] text-[10px] text-center mt-3">
                Set monthly income in Settings to see targets
              </p>
            )}
          </div>

          <div className="h-px bg-[rgba(var(--fg),0.05)] mt-6" />

          {/* Donut Chart */}
          {donutData.length > 0 && (
            <div className="px-6 pt-5 pb-2">
              <p className="section-label mb-4">Breakdown</p>
              <div className="flex items-center gap-6">
                <div className="relative shrink-0" style={{ width: 120, height: 120 }}>
                  <PieChart width={120} height={120}>
                    <Pie
                      data={donutData}
                      cx={60}
                      cy={60}
                      innerRadius={36}
                      outerRadius={52}
                      dataKey="value"
                      strokeWidth={0}
                      paddingAngle={2}
                      startAngle={90}
                      endAngle={-270}
                    >
                      {donutData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[rgba(var(--fg),0.82)] text-[11px] font-bold tabular leading-none">
                      {formatCurrency(total)}
                    </span>
                    <span className="text-[rgba(var(--fg),0.35)] text-[9px] mt-0.5">total</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2.5 flex-1">
                  {donutData.map(d => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-[rgba(var(--fg),0.55)] text-[12px] flex-1">{d.name}</span>
                      <span className="text-[rgba(var(--fg),0.72)] text-[12px] font-semibold tabular">
                        {formatCurrency(d.value)}
                      </span>
                      <span className="text-[rgba(var(--fg),0.35)] text-[10px] w-7 text-right tabular">
                        {pct(d.value, total)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Wallet remaining */}
          {walletRecord && walletBalances && income > 0 && (
            <>
              <div className="h-px bg-[rgba(var(--fg),0.05)] mt-2" />
              <div className="flex items-center justify-between px-6 py-3.5">
                <span className="text-[rgba(var(--fg),0.70)] text-[13px] font-medium">Wallet remaining</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-[rgba(var(--fg),0.78)] text-[13px] font-semibold tabular">
                    {formatCurrency(walletBalances.total)}
                  </span>
                  {walletBalances.total > 0 && (
                    <span className="text-[10px] font-medium text-[rgba(var(--fg),0.45)]">
                      {Math.round((walletBalances.total / income) * 100)}% of income left
                    </span>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="h-px bg-[rgba(var(--fg),0.05)]" />

          {/* Stacked Daily Bar Chart */}
          <div className="px-6 pt-5 pb-2">
            <p className="section-label mb-4">Daily spending</p>
            <ResponsiveContainer width="100%" height={110}>
              <BarChart data={stackedDailyData} barSize={5} barCategoryGap="20%">
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 8, fill: clr.tick, fontFamily: 'Inter' }}
                  axisLine={false}
                  tickLine={false}
                  interval={4}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(v: unknown, name: unknown) => {
                    if (typeof v !== 'number' || v === 0) return [null, '']
                    const n = String(name)
                    return [formatCurrency(v), n.charAt(0).toUpperCase() + n.slice(1)]
                  }}
                  contentStyle={{
                    background: clr.tooltip.bg,
                    border: `1px solid ${clr.tooltip.border}`,
                    borderRadius: 8,
                    fontSize: 11,
                    fontFamily: 'Inter',
                  }}
                  itemStyle={{ color: clr.tooltip.text }}
                  labelStyle={{ color: clr.tooltip.label, fontSize: 10 }}
                  cursor={{ fill: clr.cursor }}
                />
                <Bar dataKey="need"    stackId="a" fill={clr.need}    radius={[0, 0, 0, 0]} />
                <Bar dataKey="want"    stackId="a" fill={clr.want}    radius={[0, 0, 0, 0]} />
                <Bar dataKey="savings" stackId="a" fill={clr.savings} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="h-px bg-[rgba(var(--fg),0.05)]" />

          {/* Trend Line vs Budget Pace */}
          {income > 0 && (
            <div className="px-6 pt-5 pb-2">
              <p className="section-label mb-1">Spending pace</p>
              <p className="text-[rgba(var(--fg),0.35)] text-[10px] mb-3">— budget · — actual</p>
              <ResponsiveContainer width="100%" height={110}>
                <ComposedChart data={cumulativeData}>
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 8, fill: clr.tick, fontFamily: 'Inter' }}
                    axisLine={false}
                    tickLine={false}
                    interval={6}
                  />
                  <YAxis hide />
                  <Tooltip
                    formatter={(v: unknown, name: unknown) => {
                      if (v == null) return [null, '']
                      return [formatCurrency(v as number), name === 'actual' ? 'Spent' : 'Budget']
                    }}
                    contentStyle={{
                      background: clr.tooltip.bg,
                      border: `1px solid ${clr.tooltip.border}`,
                      borderRadius: 8,
                      fontSize: 11,
                      fontFamily: 'Inter',
                    }}
                    itemStyle={{ color: clr.tooltip.text }}
                    labelStyle={{ color: clr.tooltip.label, fontSize: 10 }}
                    cursor={{ fill: clr.cursor }}
                  />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke={clr.need}
                    fill={clr.need}
                    fillOpacity={0.08}
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="pace"
                    stroke={clr.pace}
                    strokeWidth={1}
                    strokeDasharray="4 3"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {income > 0 && <div className="h-px bg-[rgba(var(--fg),0.05)]" />}

          {/* Top Categories with Sparklines */}
          {catChartData.length > 0 && (
            <div className="pt-5">
              <div className="px-6 mb-3">
                <p className="section-label">Top categories</p>
              </div>
              <div className="flex flex-col">
                {catChartData.slice(0, 6).map((cat, i) => (
                  <div
                    key={cat.name}
                    className={`flex items-center gap-3 px-6 py-3 ${i < Math.min(catChartData.length, 6) - 1 ? 'border-b border-[rgba(var(--fg),0.04)]' : ''}`}
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-[rgba(var(--fg),0.70)] text-[12px] flex-1 truncate">{cat.name}</span>
                    <Sparkline data={cat.dailyData} color={cat.color} />
                    <span className="text-[rgba(var(--fg),0.72)] text-[12px] font-semibold tabular ml-2">
                      {formatCurrency(cat.value)}
                    </span>
                    <span className="text-[rgba(var(--fg),0.35)] text-[10px] w-7 text-right tabular">
                      {pct(cat.value, total)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="h-px bg-[rgba(var(--fg),0.05)]" />

          {/* Spending Calendar Heatmap */}
          <div className="px-6 pt-5 pb-4">
            <p className="section-label mb-3">Spending calendar</p>
            <div className="flex gap-1 mb-1.5">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <div key={i} className="flex-1 text-center text-[9px] text-[rgba(var(--fg),0.25)]">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {heatmapCells.map((day, i) => {
                if (day === null) return <div key={`e-${i}`} className="aspect-square" />
                const amt = dayAmountMap[day] ?? 0
                const isToday = isCurrentMonth && day === now.getDate()
                const cellBg = amt > 0 ? getCellColor(amt, maxDayAmount) : 'rgba(var(--fg),0.04)'
                return (
                  <div
                    key={day}
                    className="aspect-square rounded-[3px] flex items-center justify-center"
                    style={{
                      backgroundColor: cellBg,
                      outline: isToday ? `1.5px solid ${clr.pace}` : undefined,
                    }}
                    title={amt > 0 ? `${day}: ${formatCurrency(amt)}` : `${day}`}
                  >
                    <span className="text-[8px] font-medium" style={{ color: amt > 0 ? clr.fgHigh : clr.fgLow }}>
                      {day}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="h-px bg-[rgba(var(--fg),0.05)]" />

          {/* Notice */}
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

          {insights.length > 0 && <div className="h-px bg-[rgba(var(--fg),0.05)]" />}

          {/* Top Expenses */}
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
                      {e.note && <p className="text-[rgba(var(--fg),0.40)] text-[10px] truncate">{e.note}</p>}
                    </div>
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
                      style={{
                        color: e.type === 'need' ? clr.need : e.type === 'want' ? clr.want : clr.savings,
                        backgroundColor: e.type === 'need'
                          ? `${clr.need}20`
                          : e.type === 'want'
                          ? `${clr.want}20`
                          : `${clr.savings}20`,
                      }}
                    >
                      {e.type}
                    </span>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span className="text-[rgba(var(--fg),0.7)] text-[13px] font-semibold tabular">
                        {formatCurrency(e.amount)}
                      </span>
                      <span className="text-[rgba(var(--fg),0.35)] text-[10px]">{e.date.slice(5)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {topExpenses.length > 0 && <div className="h-px bg-[rgba(var(--fg),0.05)]" />}

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
                      <p className="text-[rgba(var(--fg),0.40)] text-[10px]">
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
