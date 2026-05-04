import { db } from './db'
import type { CategoryRecord } from './db'

export type CategoryData = Omit<CategoryRecord, 'id'>

const DEFAULT_CATEGORIES: CategoryData[] = [
  { label: 'Food',          icon: 'UtensilsCrossed', color: '#f97316', order: 0,  isCustom: false },
  { label: 'Transport',     icon: 'Car',             color: '#3b82f6', order: 1,  isCustom: false },
  { label: 'Bills',         icon: 'Receipt',         color: '#ef4444', order: 2,  isCustom: false },
  { label: 'Shopping',      icon: 'ShoppingBag',     color: '#a855f7', order: 3,  isCustom: false },
  { label: 'Entertainment', icon: 'Film',            color: '#ec4899', order: 4,  isCustom: false },
  { label: 'Health',        icon: 'HeartPulse',      color: '#22c55e', order: 5,  isCustom: false },
  { label: 'Groceries',     icon: 'ShoppingCart',    color: '#14b8a6', order: 6,  isCustom: false },
  { label: 'Committee',     icon: 'PiggyBank',       color: '#06b6d4', order: 7,  isCustom: false },
  { label: 'Family',        icon: 'Heart',           color: '#f43f5e', order: 8,  isCustom: false },
  { label: 'Other',         icon: 'MoreHorizontal',  color: '#6b7280', order: 9,  isCustom: false },
]

export async function initializeCategories(): Promise<void> {
  const count = await db.categories.count()
  if (count === 0) {
    await db.categories.bulkAdd(DEFAULT_CATEGORIES as CategoryRecord[])
  }
}

export async function getCategories(): Promise<CategoryRecord[]> {
  return db.categories.orderBy('order').toArray()
}

export async function addCategory(data: Omit<CategoryData, 'order' | 'isCustom'>): Promise<number> {
  const all = await db.categories.orderBy('order').toArray()
  const maxOrder = all.length > 0 ? Math.max(...all.map(c => c.order)) : -1
  return db.categories.add({
    ...data,
    order: maxOrder + 1,
    isCustom: true,
  } as CategoryRecord)
}

export async function updateCategory(id: number, data: Partial<CategoryData>): Promise<number> {
  return db.categories.update(id, data)
}

export async function deleteCategory(id: number): Promise<void> {
  const cat = await db.categories.get(id)
  if (!cat || !cat.isCustom) return  // protect defaults

  // Migrate expenses in this category to 'Other'
  await db.expenses
    .where('category').equals(cat.label)
    .modify({ category: 'Other' })

  await db.categories.delete(id)
}

export async function renameCategoryLabel(id: number, newLabel: string): Promise<void> {
  const cat = await db.categories.get(id)
  if (!cat) return

  const oldLabel = cat.label

  // Check uniqueness
  const existing = await db.categories.where('label').equals(newLabel).first()
  if (existing && existing.id !== id) throw new Error('Category name already exists')

  await db.categories.update(id, { label: newLabel })
  await db.expenses
    .where('category').equals(oldLabel)
    .modify({ category: newLabel })
}

export async function moveCategoryUp(id: number): Promise<void> {
  const all = await db.categories.orderBy('order').toArray()
  const idx = all.findIndex(c => c.id === id)
  if (idx <= 0) return
  const prev = all[idx - 1]
  const curr = all[idx]
  await db.categories.update(curr.id, { order: prev.order })
  await db.categories.update(prev.id, { order: curr.order })
}

export async function moveCategoryDown(id: number): Promise<void> {
  const all = await db.categories.orderBy('order').toArray()
  const idx = all.findIndex(c => c.id === id)
  if (idx < 0 || idx >= all.length - 1) return
  const next = all[idx + 1]
  const curr = all[idx]
  await db.categories.update(curr.id, { order: next.order })
  await db.categories.update(next.id, { order: curr.order })
}
