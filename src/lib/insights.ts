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
  const catMap: Record<string, number> = {}
  for (const e of expenses) {
    if (e.type === 'need') needs += e.amount
    else if (e.type === 'want') wants += e.amount
    else savings += e.amount
    catMap[e.category] = (catMap[e.category] ?? 0) + e.amount
  }
  const total = needs + wants + savings

  // Day of month derived from pace (pace = currentDay / daysInMonth, so currentDay ≈ pace * 31)
  // We use pace > 0.5 as "past halfway" and pace > (15/31) as "past day 15"
  const pastDay15 = pace > 15 / 31

  // Needs hard overspend (always show regardless of day)
  if (income > 0 && targets.needs > 0 && needs > targets.needs) {
    cards.push({
      id: 'needs-over',
      icon: '🚨',
      title: 'Needs over budget',
      body: `You've spent ₨ ${needs.toLocaleString('en-US')} on needs — ₨ ${(needs - targets.needs).toLocaleString('en-US')} over your ${Math.round((targets.needs / income) * 100)}% target.`,
      severity: 'warn',
    })
  }

  // Needs pacing — only after day 15, project month-end and show projected overspend
  if (
    income > 0 &&
    targets.needs > 0 &&
    needs <= targets.needs &&   // not already over (that's handled above)
    pastDay15 &&
    pace > 0
  ) {
    const projected = needs / pace
    if (projected > targets.needs * 1.1) {
      const overshoot = Math.round(projected - targets.needs)
      cards.push({
        id: 'needs-pace',
        icon: '⚡',
        title: 'Needs on track to overspend',
        body: `At this rate you'll spend ₨ ${Math.round(projected).toLocaleString('en-US')} on needs by month-end — about ₨ ${overshoot.toLocaleString('en-US')} over your target.`,
        severity: 'warn',
      })
    }
  }

  // Wants overspend
  if (income > 0 && targets.wants > 0 && wants > targets.wants) {
    cards.push({
      id: 'wants-over',
      icon: '💸',
      title: 'Wants over budget',
      body: `Discretionary spending hit ₨ ${wants.toLocaleString('en-US')} vs your ₨ ${targets.wants.toLocaleString('en-US')} target. Consider cutting back.`,
      severity: 'warn',
    })
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

  // No savings recorded past halfway
  if (income > 0 && savings === 0 && pace > 0.5) {
    cards.push({
      id: 'no-savings',
      icon: '🐷',
      title: 'No savings logged yet',
      body: `You're past the halfway mark with no savings recorded. Try to set aside at least ₨ ${targets.savings.toLocaleString('en-US')}.`,
      severity: 'warn',
    })
  }

  // High "Other" category usage
  if (total > 0 && catMap['Other']) {
    const otherPct = Math.round((catMap['Other'] / total) * 100)
    if (otherPct >= 30) {
      cards.push({
        id: 'high-other',
        icon: '🏷️',
        title: `${otherPct}% of spending is in 'Other'`,
        body: `Consider using more specific categories — Committee, Family, or others — for clearer tracking.`,
        severity: 'info',
      })
    }
  }

  // Top spending category (only if it's not Other and dominates)
  const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]
  if (topCat && topCat[0] !== 'Other' && total > 0) {
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
