import { db } from './db'
import type { Goal, Expense } from './db'

export type GoalData = Omit<Goal, 'id' | 'createdAt' | 'completedAt'>

export async function addGoal(data: GoalData): Promise<number> {
  return db.goals.add({
    ...data,
    createdAt: new Date().toISOString(),
    completedAt: null,
  } as Goal)
}

export async function updateGoal(id: number, data: Partial<GoalData>): Promise<number> {
  return db.goals.update(id, data)
}

export async function deleteGoal(id: number): Promise<void> {
  // Unlink any expenses pointing to this goal
  await db.expenses.where('goalId').equals(id).modify({ goalId: null })
  await db.goals.delete(id)
}

export async function getGoals(): Promise<Goal[]> {
  return db.goals.orderBy('createdAt').toArray()
}

/** Returns progress amount for a goal (sum of linked savings expenses) */
export function computeGoalProgress(goalId: number, expenses: Expense[]): number {
  return expenses
    .filter(e => e.goalId === goalId && e.type === 'savings')
    .reduce((sum, e) => sum + e.amount, 0)
}

/** Monthly average contribution to a goal over the months it has data */
export function computeMonthlyRate(goalId: number, expenses: Expense[]): number {
  const linked = expenses.filter(e => e.goalId === goalId && e.type === 'savings')
  if (linked.length === 0) return 0

  const months = new Set(linked.map(e => e.date.slice(0, 7)))
  const total = linked.reduce((s, e) => s + e.amount, 0)
  return months.size > 0 ? total / months.size : 0
}

/** Projected completion date (returns null if no rate or already done) */
export function projectedCompletion(
  goal: Goal,
  currentAmount: number,
  monthlyRate: number,
): Date | null {
  if (currentAmount >= goal.targetAmount) return null
  if (monthlyRate <= 0) return null

  const remaining = goal.targetAmount - currentAmount
  const monthsNeeded = remaining / monthlyRate
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() + Math.ceil(monthsNeeded))
  return d
}
