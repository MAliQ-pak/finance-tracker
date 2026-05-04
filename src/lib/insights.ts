import type { Expense } from '@/db/db'
import type { BudgetTargets } from './budget'

export interface InsightCard {
  id: string
  icon: string
  title: string
  body: string
  severity: 'good' | 'warn' | 'info'
}

export function generateInsights(
  expenses: Expense[],
  targets: BudgetTargets,
  income: number,
  pace: number,
): InsightCard[] {
  if (expenses.length === 0) return []

  const cards: InsightCard[] = []

  let needs = 0, wants = 0, savings = 0
  for (const e of expenses) {
    if (e.type === 'need') needs += e.amount
    else if (e.type === 'want') wants += e.amount
    else savings += e.amount
  }
  const total = needs + wants + savings

  // Needs overspend
  if (income > 0 && targets.needs > 0) {
    const paced = targets.needs * pace
    if (needs > targets.needs) {
      cards.push({
        id: 'needs-over',
        icon: '🚨',
        title: 'Needs over budget',
        body: `You've spent ₨ ${needs.toLocaleString('en-US')} on needs — ₨ ${(needs - targets.needs).toLocaleString('en-US')} over your ${Math.round((targets.needs / income) * 100)}% target.`,
        severity: 'warn',
      })
    } else if (needs > paced * 1.2) {
      cards.push({
        id: 'needs-pace',
        icon: '⚡',
        title: 'Needs spending ahead of pace',
        body: `You're ${Math.round(((needs - paced) / paced) * 100)}% ahead of where you should be this far into the month.`,
        severity: 'warn',
      })
    }
  }

  // Wants overspend
  if (income > 0 && targets.wants > 0) {
    if (wants > targets.wants) {
      cards.push({
        id: 'wants-over',
        icon: '💸',
        title: 'Wants over budget',
        body: `Discretionary spending hit ₨ ${wants.toLocaleString('en-US')} vs your ₨ ${targets.wants.toLocaleString('en-US')} target. Consider cutting back.`,
        severity: 'warn',
      })
    }
  }

  // Savings on track
  if (income > 0 && targets.savings > 0 && savings >= targets.savings) {
    cards.push({
      id: 'savings-good',
      icon: '🎯',
      title: 'Savings target met',
      body: `You've set aside ₨ ${savings.toLocaleString('en-US')} for savings this month. Great work!`,
      severity: 'good',
    })
  }

  // No savings recorded
  if (income > 0 && savings === 0 && pace > 0.5) {
    cards.push({
      id: 'no-savings',
      icon: '🐷',
      title: 'No savings logged yet',
      body: `You're past the halfway mark with no savings recorded. Try to set aside at least ₨ ${targets.savings.toLocaleString('en-US')}.`,
      severity: 'warn',
    })
  }

  // Top spending category
  const catMap: Record<string, number> = {}
  for (const e of expenses) catMap[e.category] = (catMap[e.category] ?? 0) + e.amount
  const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]
  if (topCat && total > 0) {
    const pct = Math.round((topCat[1] / total) * 100)
    if (pct >= 40) {
      cards.push({
        id: 'top-category',
        icon: '📊',
        title: `${topCat[0]} is ${pct}% of spending`,
        body: `₨ ${topCat[1].toLocaleString('en-US')} went to ${topCat[0]} this month — your biggest category by far.`,
        severity: 'info',
      })
    }
  }

  // Good overall
  if (income > 0 && total <= income * pace * 0.9 && cards.length === 0) {
    cards.push({
      id: 'on-track',
      icon: '✅',
      title: 'Spending looks healthy',
      body: `You've spent ₨ ${total.toLocaleString('en-US')} so far — well within your monthly budget pace.`,
      severity: 'good',
    })
  }

  return cards.slice(0, 5)
}
