import { db } from './db'
import type { Expense } from './db'

export type ExpenseData = Omit<Expense, 'id' | 'createdAt'>

export async function addExpense(data: ExpenseData): Promise<number> {
  return db.expenses.add({
    ...data,
    createdAt: new Date().toISOString(),
  } as Expense)
}

export async function updateExpense(id: number, data: Partial<ExpenseData>): Promise<number> {
  return db.expenses.update(id, data)
}

export async function deleteExpense(id: number): Promise<void> {
  return db.expenses.delete(id)
}

export async function getExpensesForMonth(year: number, month: number): Promise<Expense[]> {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const end = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

  const expenses = await db.expenses
    .where('date')
    .between(start, end, true, false)
    .toArray()

  return expenses.sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
  )
}

export async function getExpensesForRange(start: string, end: string): Promise<Expense[]> {
  const expenses = await db.expenses
    .where('date')
    .between(start, end, true, true)
    .toArray()
  return expenses.sort((a, b) => b.date.localeCompare(a.date))
}

export async function getMonthsWithData(): Promise<{ year: number; month: number }[]> {
  const all = await db.expenses.orderBy('date').keys()
  const seen = new Set<string>()
  const result: { year: number; month: number }[] = []
  for (const key of all as string[]) {
    const ym = key.slice(0, 7)
    if (!seen.has(ym)) {
      seen.add(ym)
      result.push({ year: Number(ym.slice(0, 4)), month: Number(ym.slice(5, 7)) })
    }
  }
  return result.reverse()
}

export async function getCategoryBreakdown(expenses: Expense[]): Promise<Record<string, number>> {
  const map: Record<string, number> = {}
  for (const e of expenses) {
    map[e.category] = (map[e.category] ?? 0) + e.amount
  }
  return map
}

export async function getDailyTotals(expenses: Expense[]): Promise<{ date: string; amount: number }[]> {
  const map: Record<string, number> = {}
  for (const e of expenses) {
    map[e.date] = (map[e.date] ?? 0) + e.amount
  }
  return Object.entries(map)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function getTypeTotals(expenses: Expense[]): Promise<{ needs: number; wants: number; savings: number }> {
  let needs = 0, wants = 0, savings = 0
  for (const e of expenses) {
    if (e.type === 'need') needs += e.amount
    else if (e.type === 'want') wants += e.amount
    else savings += e.amount
  }
  return { needs, wants, savings }
}

export interface MonthTotals {
  total: number
  needs: number
  wants: number
  savings: number
  count: number
}

export function computeTotals(expenses: Expense[]): MonthTotals {
  let needs = 0, wants = 0, savings = 0
  for (const e of expenses) {
    if (e.type === 'need') needs += e.amount
    else if (e.type === 'want') wants += e.amount
    else savings += e.amount
  }
  const total = needs + wants + savings
  return { total, needs, wants, savings, count: expenses.length }
}
