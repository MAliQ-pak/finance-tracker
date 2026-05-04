import { db } from '@/db/db'
import { getMonthlyIncome, getBudgetSplits } from './preferences'
import { calculateTargets } from './budget'
import { computeGoalProgress, computeMonthlyRate } from '@/db/goals'

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

function fmt(n: number): string {
  return `Rs ${Math.round(n).toLocaleString('en-US')}`
}

function pct(n: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((n / total) * 100)}%`
}

async function getMonthExpenses(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const nm = month === 12 ? 1 : month + 1
  const ny = month === 12 ? year + 1 : year
  const end = `${ny}-${String(nm).padStart(2, '0')}-01`
  return db.expenses.where('date').between(start, end, true, false).toArray()
}

export async function generateMonthlyReviewPrompt(year: number, month: number): Promise<string> {
  const income = getMonthlyIncome()
  const splits = getBudgetSplits()
  const targets = calculateTargets(income, splits)

  const expenses = await getMonthExpenses(year, month)
  const allExpenses = await db.expenses.toArray()
  const goals = await db.goals.toArray()

  let needs = 0, wants = 0, savings = 0
  const catMap: Record<string, { amount: number; count: number }> = {}

  for (const e of expenses) {
    if (e.type === 'need') needs += e.amount
    else if (e.type === 'want') wants += e.amount
    else savings += e.amount

    if (!catMap[e.category]) catMap[e.category] = { amount: 0, count: 0 }
    catMap[e.category].amount += e.amount
    catMap[e.category].count++
  }

  const total = needs + wants + savings

  const topCategories = Object.entries(catMap)
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, 7)
    .map(([cat, { amount, count }]) =>
      `  - ${cat}: ${fmt(amount)} (${pct(amount, total)}, ${count} transaction${count > 1 ? 's' : ''})`
    ).join('\n')

  const allTransactions = [...expenses]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e =>
      `  ${e.date} | ${e.category} | ${e.type} | ${fmt(e.amount)}${e.note ? ` | "${e.note}"` : ''} | ${e.paymentMethod}`
    ).join('\n')

  // Previous month
  const pm = month === 1 ? 12 : month - 1
  const py = month === 1 ? year - 1 : year
  const prevExpenses = await getMonthExpenses(py, pm)
  let prevSection: string
  if (prevExpenses.length === 0) {
    prevSection = 'No data for previous month (first month tracking)'
  } else {
    let pn = 0, pw = 0, ps = 0
    for (const e of prevExpenses) {
      if (e.type === 'need') pn += e.amount
      else if (e.type === 'want') pw += e.amount
      else ps += e.amount
    }
    const pt = pn + pw + ps
    prevSection = `${MONTH_NAMES[pm - 1]} ${py}: Total ${fmt(pt)} | Needs ${fmt(pn)} | Wants ${fmt(pw)} | Savings ${fmt(ps)}`
  }

  // Goals section
  let goalsSection: string
  if (goals.length === 0) {
    goalsSection = 'No goals set yet'
  } else {
    goalsSection = goals.map(g => {
      const current = computeGoalProgress(g.id, allExpenses)
      const rate = computeMonthlyRate(g.id, allExpenses)
      const remaining = g.targetAmount - current
      const pctDone = g.targetAmount > 0 ? Math.round((current / g.targetAmount) * 100) : 0
      const deadline = g.targetDate ? ` | Deadline: ${g.targetDate}` : ''
      const monthsNeeded = rate > 0 ? Math.ceil(remaining / rate) : null
      const projection = monthsNeeded !== null
        ? ` | At current rate: done in ~${monthsNeeded} months`
        : ' | No contributions yet'
      return `  - ${g.name}: ${fmt(current)} / ${fmt(g.targetAmount)} (${pctDone}%)${deadline}${projection}`
    }).join('\n')
  }

  const incomeSection = income > 0
    ? `- Monthly income: ${fmt(income)}
- Targets: Needs ${fmt(targets.needs)} (${splits.needs}%), Wants ${fmt(targets.wants)} (${splits.wants}%), Savings ${fmt(targets.savings)} (${splits.savings}%)`
    : '- Monthly income: Not set\n- Targets: Not set (configure in Settings)'

  return `You are my personal financial coach. I'm sharing my finances using the 50/30/20 budgeting framework. Please review this month and give me honest, specific, actionable feedback.

## My Setup
${incomeSection}

## This Month (${MONTH_NAMES[month - 1]} ${year})
- Total spent: ${fmt(total)}${income > 0 ? ` (${pct(total, income)} of income)` : ''}
- Needs: ${fmt(needs)} (${pct(needs, total)})
- Wants: ${fmt(wants)} (${pct(wants, total)})
- Savings: ${fmt(savings)} (${pct(savings, total)})

## Top Categories
${topCategories || '  No transactions yet'}

## All Transactions
${allTransactions || '  No transactions'}

## My Goals
${goalsSection}

## Last Month Comparison
${prevSection}

---

Please give me:

1. **Honest assessment** — How am I doing on the 50/30/20 split? What's working, what's not?

2. **The 3 expenses I should reconsider** — Look at my Wants in particular. Which ones could I have skipped? Be specific (e.g., "The Rs 5,333 Netflix — was it really necessary?"). Don't be preachy, just direct.

3. **The 3 expenses I should feel good about** — What was money well spent? Essentials handled, savings made, value purchases.

4. **One pattern you noticed** — Something I might not see myself. (e.g., "You spent on dining out 4 times in the first week, then nothing — looks like budget burnout pattern.")

5. **Specific savings target for next month** — Based on what I could realistically trim, what should I aim to save? Give me a Rs number and explain the math.

6. **One small experiment for next month** — A specific, low-effort change to try (e.g., "Try a no-spend Sunday once a week — could save Rs 6,000-8,000/month based on your weekend pattern.")

Be direct, specific, and use my actual numbers. Skip generic financial advice. Treat me like a friend who wants the truth, not a client you're trying to keep happy.`
}

export async function generateGoalsAdvicePrompt(year: number, month: number): Promise<string> {
  const income = getMonthlyIncome()
  const splits = getBudgetSplits()
  const targets = calculateTargets(income, splits)

  const expenses = await db.expenses.toArray()
  const goals = await db.goals.toArray()

  const monthExpenses = await getMonthExpenses(year, month)
  let wants = 0
  const wantsCatMap: Record<string, number> = {}
  for (const e of monthExpenses) {
    if (e.type === 'want') {
      wants += e.amount
      wantsCatMap[e.category] = (wantsCatMap[e.category] ?? 0) + e.amount
    }
  }

  const topWants = Object.entries(wantsCatMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, amt]) => `  - ${cat}: ${fmt(amt)}`)
    .join('\n')

  const goalsSection = goals.length === 0
    ? 'No goals set yet'
    : goals.map(g => {
        const current = computeGoalProgress(g.id, expenses)
        const rate = computeMonthlyRate(g.id, expenses)
        const remaining = g.targetAmount - current
        const pctDone = g.targetAmount > 0 ? Math.round((current / g.targetAmount) * 100) : 0
        const deadline = g.targetDate ? g.targetDate : 'No deadline'
        let monthsRemaining: string
        if (g.targetDate) {
          const now = new Date()
          const tgt = new Date(g.targetDate)
          const months = Math.ceil((tgt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30))
          const required = months > 0 ? remaining / months : remaining
          monthsRemaining = `${months} months left | Need ${fmt(required)}/month`
        } else {
          monthsRemaining = rate > 0 ? `~${Math.ceil(remaining / rate)} months at current rate` : 'No contributions yet'
        }
        return `  - ${g.name}: ${fmt(current)} / ${fmt(g.targetAmount)} (${pctDone}%) | Deadline: ${deadline} | ${monthsRemaining}`
      }).join('\n')

  const incomeSection = income > 0
    ? `- Monthly income: ${fmt(income)}
- Targets: Needs ${fmt(targets.needs)} (${splits.needs}%), Wants ${fmt(targets.wants)} (${splits.wants}%), Savings ${fmt(targets.savings)} (${splits.savings}%)`
    : '- Monthly income: Not set'

  return `You are my financial coach. Help me hit my savings goals faster.

## My Income & Targets (50/30/20)
${incomeSection}

## My Goals
${goalsSection}

## This Month's Spending (${MONTH_NAMES[month - 1]} ${year})
- Total Wants: ${fmt(wants)}
- Top Wants categories:
${topWants || '  No want expenses this month'}

---

Please:
1. Tell me which goals are realistic at my current savings rate, which need adjustment.
2. For my top 3 Wants categories, suggest specific cuts (Rs amounts) and which goals that would accelerate.
3. Suggest if I should reorder my goal priorities based on deadlines and amounts.
4. Give me one specific challenge for the next 30 days that would boost my savings rate.

Be specific with rupee amounts. No generic advice.`
}
