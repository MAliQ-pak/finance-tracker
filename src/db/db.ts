import Dexie, { type EntityTable } from 'dexie'

export type ExpenseType = 'need' | 'want' | 'savings'

export interface Expense {
  id: number
  amount: number
  category: string
  note: string
  paymentMethod: string
  date: string
  type: ExpenseType
  goalId: number | null
  createdAt: string
}

export interface CategoryRecord {
  id: number
  label: string      // unique — also used as expense.category value
  icon: string       // lucide component name e.g. 'UtensilsCrossed'
  color: string      // hex
  order: number
  isCustom: boolean
}

export interface Goal {
  id: number
  name: string
  targetAmount: number
  targetDate: string | null   // YYYY-MM-DD or null
  icon: string                // lucide name
  color: string
  createdAt: string
  completedAt: string | null
}

export interface WalletAdjustment {
  id: string        // nanoid
  amount: number    // positive = inflow, negative = outflow
  note: string
  method: 'cash' | 'digital'
  createdAt: string
  transferGroupId?: string  // present on both halves of a Cash↔Digital transfer
}

export interface WalletBalance {
  id: number
  year: number
  month: number     // 1-12
  startingCash: number
  startingDigital: number
  adjustments: WalletAdjustment[]
  confirmedAt: string | null
}

const db = new Dexie('FinanceTrackerDB') as Dexie & {
  expenses: EntityTable<Expense, 'id'>
  categories: EntityTable<CategoryRecord, 'id'>
  goals: EntityTable<Goal, 'id'>
  walletBalances: EntityTable<WalletBalance, 'id'>
}

db.version(1).stores({
  expenses: '++id, amount, category, paymentMethod, date, isEssential, createdAt',
})

db.version(2).stores({
  expenses: '++id, amount, category, paymentMethod, date, isEssential, createdAt',
}).upgrade(tx =>
  tx.table('expenses')
    .where('paymentMethod').equals('UPI')
    .modify({ paymentMethod: 'Other' })
)

db.version(3).stores({
  expenses: '++id, amount, category, paymentMethod, date, type, createdAt',
}).upgrade(tx =>
  tx.table('expenses').toCollection().modify((e: Record<string, unknown>) => {
    e.type = e.isEssential ? 'need' : 'want'
    delete e.isEssential
  })
)

db.version(4).stores({
  expenses: '++id, amount, category, paymentMethod, date, type, goalId, createdAt',
  categories: '++id, &label, order',
  goals: '++id',
}).upgrade(tx =>
  tx.table('expenses').toCollection().modify((e: Record<string, unknown>) => {
    if (e.goalId === undefined) e.goalId = null
  })
)

db.version(5).stores({
  expenses: '++id, amount, category, paymentMethod, date, type, goalId, createdAt',
  categories: '++id, &label, order, isCustom',
  goals: '++id, name, createdAt, completedAt, targetDate',
})

db.version(6).stores({
  expenses: '++id, amount, category, paymentMethod, date, type, goalId, createdAt',
  categories: '++id, &label, order, isCustom',
  goals: '++id, name, createdAt, completedAt, targetDate',
  walletBalances: '++id, &[year+month], year, month, confirmedAt',
}).upgrade(tx =>
  tx.table('walletBalances').toCollection().modify(() => {})
)

export { db }
