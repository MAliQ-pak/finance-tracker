import Dexie, { type EntityTable } from 'dexie'

interface Expense {
  id: number
  amount: number
  category: string
  note: string
  paymentMethod: string
  date: string
  isEssential: boolean
  createdAt: string
}

const db = new Dexie('FinanceTrackerDB') as Dexie & {
  expenses: EntityTable<Expense, 'id'>
}

db.version(1).stores({
  expenses: '++id, amount, category, paymentMethod, date, isEssential, createdAt',
})

export type { Expense }
export { db }
