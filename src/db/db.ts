import Dexie, { type EntityTable } from 'dexie'

export type ExpenseType = 'need' | 'want' | 'savings'

interface Expense {
  id: number
  amount: number
  category: string
  note: string
  paymentMethod: string
  date: string
  type: ExpenseType
  createdAt: string
}

const db = new Dexie('FinanceTrackerDB') as Dexie & {
  expenses: EntityTable<Expense, 'id'>
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

export type { Expense }
export { db }
