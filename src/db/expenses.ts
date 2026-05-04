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

export interface MonthTotals {
  total: number
  essential: number
  discretionary: number
  count: number
}

export function computeTotals(expenses: Expense[]): MonthTotals {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0)
  const essential = expenses.filter(e => e.isEssential).reduce((sum, e) => sum + e.amount, 0)
  return { total, essential, discretionary: total - essential, count: expenses.length }
}
