import type { BudgetSplits } from './preferences'

export interface BudgetTargets {
  needs: number
  wants: number
  savings: number
}

export interface BudgetActuals {
  needs: number
  wants: number
  savings: number
}

export function calculateTargets(income: number, splits: BudgetSplits): BudgetTargets {
  return {
    needs: (income * splits.needs) / 100,
    wants: (income * splits.wants) / 100,
    savings: (income * splits.savings) / 100,
  }
}

/** Pace factor: how far through the month we are (0–1) */
export function monthPace(year: number, month: number): number {
  const now = new Date()
  const daysInMonth = new Date(year, month, 0).getDate()
  const currentDay = now.getFullYear() === year && now.getMonth() + 1 === month
    ? now.getDate()
    : daysInMonth
  return currentDay / daysInMonth
}

/** Expected spend at this point in the month given a target */
export function pacedTarget(target: number, pace: number): number {
  return target * pace
}
