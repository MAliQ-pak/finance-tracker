import {
  UtensilsCrossed,
  Car,
  Receipt,
  ShoppingBag,
  Film,
  HeartPulse,
  ShoppingCart,
  MoreHorizontal,
  PiggyBank,
  Heart,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const CATEGORIES = [
  'Food',
  'Transport',
  'Bills',
  'Shopping',
  'Entertainment',
  'Health',
  'Groceries',
  'Committee',
  'Family',
  'Other',
] as const

export type Category = (typeof CATEGORIES)[number]

export const PRIMARY_METHODS = ['Cash', 'Card'] as const
export const DIGITAL_METHODS = ['JazzCash', 'EasyPaisa', 'SadaPay', 'NayaPay', 'Raast', 'Other'] as const
export const PAYMENT_METHODS = [...PRIMARY_METHODS, ...DIGITAL_METHODS] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  Food: UtensilsCrossed,
  Transport: Car,
  Bills: Receipt,
  Shopping: ShoppingBag,
  Entertainment: Film,
  Health: HeartPulse,
  Groceries: ShoppingCart,
  Committee: PiggyBank,
  Family: Heart,
  Other: MoreHorizontal,
}

export const CATEGORY_COLORS: Record<Category, string> = {
  Food: '#f97316',
  Transport: '#3b82f6',
  Bills: '#ef4444',
  Shopping: '#a855f7',
  Entertainment: '#ec4899',
  Health: '#22c55e',
  Groceries: '#14b8a6',
  Committee: '#06b6d4',
  Family: '#f43f5e',
  Other: '#6b7280',
}

export function formatCurrency(amount: number): string {
  return `₨ ${amount.toLocaleString('en-US')}`
}

export function getDateLabel(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10)
  const yd = new Date()
  yd.setDate(yd.getDate() - 1)
  const yesterday = yd.toISOString().slice(0, 10)

  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'

  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
