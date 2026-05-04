import type { Expense } from '@/db/db'

export interface RecurringItem {
  key: string                      // category::normalizedNote
  category: string
  note: string
  averageAmount: number
  frequency: 'monthly' | 'weekly'
  lastSeen: string                 // YYYY-MM-DD
  monthsSeen: number
  totalSpent: number
  transactionCount: number
  isSubscription: boolean
}

function normalizeNote(note: string): string {
  return note.trim().toLowerCase().replace(/\s+/g, ' ')
}

const SUBSCRIPTION_KEYWORDS = [
  'subscription', 'monthly', 'weekly', 'plan', 'premium',
  'membership', 'renewal', 'auto', 'recurring',
]

function looksLikeSubscription(note: string, amounts: number[]): boolean {
  const lower = note.toLowerCase()
  if (SUBSCRIPTION_KEYWORDS.some(kw => lower.includes(kw))) return true
  if (amounts.length < 2) return false
  // Same amount within ±10%
  const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length
  return amounts.every(a => Math.abs(a - avg) / avg <= 0.1)
}

/** Ignore stored false-positive keys (stored in localStorage) */
function getIgnoredKeys(): Set<string> {
  try {
    const raw = localStorage.getItem('recurringIgnored')
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch { return new Set() }
}

export function addIgnoredKey(key: string): void {
  try {
    const s = getIgnoredKeys()
    s.add(key)
    localStorage.setItem('recurringIgnored', JSON.stringify([...s]))
  } catch { /* ignore */ }
}

export function detectRecurringExpenses(expenses: Expense[]): RecurringItem[] {
  const ignored = getIgnoredKeys()

  // Group by category + normalized note
  const groups: Record<string, Expense[]> = {}
  for (const e of expenses) {
    const nn = normalizeNote(e.note)
    if (!nn) continue   // skip blank notes — can't detect pattern
    const key = `${e.category}::${nn}`
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  }

  const results: RecurringItem[] = []

  for (const [key, group] of Object.entries(groups)) {
    if (ignored.has(key)) continue

    const months = new Set(group.map(e => e.date.slice(0, 7)))
    if (months.size < 2) continue   // must appear in 2+ months

    const amounts = group.map(e => e.amount)
    const totalSpent = amounts.reduce((s, a) => s + a, 0)
    const averageAmount = totalSpent / amounts.length
    const lastSeen = group.map(e => e.date).sort().at(-1) ?? ''
    const note = group[0].note
    const category = group[0].category

    // Frequency: weekly if 4+ times per month on average
    const avgPerMonth = group.length / months.size
    const frequency: 'monthly' | 'weekly' = avgPerMonth >= 3.5 ? 'weekly' : 'monthly'

    results.push({
      key,
      category,
      note,
      averageAmount,
      frequency,
      lastSeen,
      monthsSeen: months.size,
      totalSpent,
      transactionCount: group.length,
      isSubscription: looksLikeSubscription(note, amounts),
    })
  }

  // Sort: subscriptions first, then by total spent desc
  return results.sort((a, b) => {
    if (a.isSubscription !== b.isSubscription) return a.isSubscription ? -1 : 1
    return b.totalSpent - a.totalSpent
  })
}
