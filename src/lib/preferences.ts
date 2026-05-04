import { PAYMENT_METHODS, type PaymentMethod } from './categories'

const KEY_PAYMENT = 'lastPaymentMethod'
const KEY_INCOME = 'monthlyIncome'
const KEY_SPLITS = 'budgetSplits'

export function getLastPaymentMethod(): PaymentMethod {
  try {
    const stored = localStorage.getItem(KEY_PAYMENT)
    if (stored && (PAYMENT_METHODS as readonly string[]).includes(stored)) {
      return stored as PaymentMethod
    }
  } catch {
    // localStorage unavailable
  }
  return 'Cash'
}

export function setLastPaymentMethod(method: PaymentMethod): void {
  try {
    localStorage.setItem(KEY_PAYMENT, method)
  } catch {
    // ignore
  }
}

export function getMonthlyIncome(): number {
  try {
    const v = localStorage.getItem(KEY_INCOME)
    if (v) {
      const n = parseFloat(v)
      if (!isNaN(n) && n > 0) return n
    }
  } catch {
    // ignore
  }
  return 0
}

export function setMonthlyIncome(amount: number): void {
  try {
    localStorage.setItem(KEY_INCOME, String(amount))
  } catch {
    // ignore
  }
}

export interface BudgetSplits {
  needs: number   // percentage 0-100
  wants: number
  savings: number
}

const DEFAULT_SPLITS: BudgetSplits = { needs: 50, wants: 30, savings: 20 }

export function getBudgetSplits(): BudgetSplits {
  try {
    const raw = localStorage.getItem(KEY_SPLITS)
    if (raw) {
      const parsed = JSON.parse(raw) as BudgetSplits
      if (
        typeof parsed.needs === 'number' &&
        typeof parsed.wants === 'number' &&
        typeof parsed.savings === 'number' &&
        Math.round(parsed.needs + parsed.wants + parsed.savings) === 100
      ) {
        return parsed
      }
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SPLITS }
}

export function setBudgetSplits(splits: BudgetSplits): void {
  try {
    localStorage.setItem(KEY_SPLITS, JSON.stringify(splits))
  } catch {
    // ignore
  }
}
