import type { Expense } from '@/db/db'

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toDateStr(d)
}

/** Set of YYYY-MM-DD strings that have at least one expense */
function spendDays(expenses: Expense[]): Set<string> {
  return new Set(expenses.map(e => e.date.slice(0, 10)))
}

/**
 * Consecutive days ending yesterday (or today) with NO expenses.
 * We check backwards from yesterday so "today not yet logged" doesn't reset it.
 */
export function calculateNoSpendStreak(expenses: Expense[]): number {
  const days = spendDays(expenses)
  let streak = 0
  // Start from yesterday — today is in progress
  let i = 1
  while (true) {
    const day = daysAgo(i)
    if (days.has(day)) break
    streak++
    i++
    if (i > 365) break  // safety cap
  }
  return streak
}

/**
 * Consecutive days (ending yesterday) where daily spend was under the given daily budget.
 */
export function calculateUnderBudgetStreak(expenses: Expense[], dailyBudget: number): number {
  if (dailyBudget <= 0) return 0

  // Sum by day
  const dayTotals: Record<string, number> = {}
  for (const e of expenses) {
    const d = e.date.slice(0, 10)
    dayTotals[d] = (dayTotals[d] ?? 0) + e.amount
  }

  let streak = 0
  let i = 1
  while (true) {
    const day = daysAgo(i)
    const spent = dayTotals[day] ?? 0
    // A day with no expenses is also under budget
    if (spent > dailyBudget) break
    streak++
    i++
    if (i > 365) break
  }
  return streak
}

export interface LifetimeStats {
  totalTrackedAmount: number
  totalExpenses: number
  firstEntryDate: string | null
  biggestSavingsMonthLabel: string | null
  biggestSavingsMonthAmount: number
  bestSavingsRateMonth: string | null
  bestSavingsRate: number          // fraction 0-1
  longestNoSpendStreak: number
  totalNoSpendDays: number
  totalSavedToGoals: number        // sum of type=savings expenses
}

export function calculateLifetimeStats(expenses: Expense[]): LifetimeStats {
  if (expenses.length === 0) {
    return {
      totalTrackedAmount: 0,
      totalExpenses: 0,
      firstEntryDate: null,
      biggestSavingsMonthLabel: null,
      biggestSavingsMonthAmount: 0,
      bestSavingsRateMonth: null,
      bestSavingsRate: 0,
      longestNoSpendStreak: 0,
      totalNoSpendDays: 0,
      totalSavedToGoals: 0,
    }
  }

  const totalTrackedAmount = expenses.reduce((s, e) => s + e.amount, 0)
  const totalSavedToGoals = expenses.filter(e => e.type === 'savings').reduce((s, e) => s + e.amount, 0)

  const sorted = [...expenses].sort((a, b) => a.date.localeCompare(b.date))
  const firstEntryDate = sorted[0]?.date?.slice(0, 10) ?? null

  // Group by month
  const monthMap: Record<string, { total: number; savings: number }> = {}
  for (const e of expenses) {
    const ym = e.date.slice(0, 7)
    if (!monthMap[ym]) monthMap[ym] = { total: 0, savings: 0 }
    monthMap[ym].total += e.amount
    if (e.type === 'savings') monthMap[ym].savings += e.amount
  }

  let biggestSavingsMonthLabel: string | null = null
  let biggestSavingsMonthAmount = 0
  let bestSavingsRateMonth: string | null = null
  let bestSavingsRate = 0

  for (const [ym, { total, savings }] of Object.entries(monthMap)) {
    if (savings > biggestSavingsMonthAmount) {
      biggestSavingsMonthAmount = savings
      biggestSavingsMonthLabel = ym
    }
    const rate = total > 0 ? savings / total : 0
    if (rate > bestSavingsRate) {
      bestSavingsRate = rate
      bestSavingsRateMonth = ym
    }
  }

  // Longest no-spend streak (historical)
  const spendSet = spendDays(expenses)
  if (firstEntryDate === null) {
    return {
      totalTrackedAmount, totalExpenses: expenses.length, firstEntryDate,
      biggestSavingsMonthLabel, biggestSavingsMonthAmount,
      bestSavingsRateMonth, bestSavingsRate,
      longestNoSpendStreak: 0, totalNoSpendDays: 0, totalSavedToGoals,
    }
  }

  const start = new Date(firstEntryDate + 'T12:00:00')
  const today = new Date()
  let longestNoSpendStreak = 0
  let currentStreak = 0
  let totalNoSpendDays = 0

  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const ds = toDateStr(d)
    if (!spendSet.has(ds)) {
      currentStreak++
      totalNoSpendDays++
      longestNoSpendStreak = Math.max(longestNoSpendStreak, currentStreak)
    } else {
      currentStreak = 0
    }
  }

  return {
    totalTrackedAmount,
    totalExpenses: expenses.length,
    firstEntryDate,
    biggestSavingsMonthLabel,
    biggestSavingsMonthAmount,
    bestSavingsRateMonth,
    bestSavingsRate,
    longestNoSpendStreak,
    totalNoSpendDays,
    totalSavedToGoals,
  }
}
