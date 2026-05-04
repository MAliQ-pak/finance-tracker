import { useEffect, useState } from 'react'
import { Sheet } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import {
  CATEGORIES,
  PAYMENT_METHODS,
  CATEGORY_ICONS,
  CATEGORY_COLORS,
  type Category,
  type PaymentMethod,
} from '@/lib/categories'
import { updateExpense, deleteExpense } from '@/db/expenses'
import type { Expense } from '@/db/db'

interface Props {
  expense: Expense | null
  onClose: () => void
}

export default function EditExpenseSheet({ expense, onClose }: Props) {
  const open = expense !== null

  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<Category | ''>('')
  const [date, setDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Card')
  const [note, setNote] = useState('')
  const [isEssential, setIsEssential] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  // Populate form when expense changes
  useEffect(() => {
    if (expense) {
      setAmount(String(expense.amount))
      setCategory(expense.category as Category)
      setDate(expense.date.slice(0, 10))
      setPaymentMethod(expense.paymentMethod as PaymentMethod)
      setNote(expense.note)
      setIsEssential(expense.isEssential)
      setDeleteConfirm(false)
    }
  }, [expense])

  const parsedAmount = parseFloat(amount)
  const canSave = category !== '' && !isNaN(parsedAmount) && parsedAmount > 0

  const handleSave = async () => {
    if (!canSave || !expense || saving) return
    setSaving(true)
    try {
      await updateExpense(expense.id, {
        amount: parsedAmount,
        category,
        note: note.trim(),
        paymentMethod,
        date,
        isEssential,
      })
      onClose()
    } catch {
      // keep open on error
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!expense) return
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }
    await deleteExpense(expense.id)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="flex flex-col gap-4 px-4 pb-8 pt-2 max-h-[88svh] overflow-y-auto">
        <h2 className="text-base font-semibold text-slate-200 text-center pb-1">Edit Expense</h2>

        {/* Amount */}
        <div className="flex flex-col items-center gap-1 py-5 bg-slate-900 rounded-2xl">
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-light text-slate-500">₨</span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="0"
              className="bg-transparent text-4xl font-bold text-slate-100 outline-none text-center placeholder:text-slate-700 min-w-[2ch]"
              style={{ width: `${Math.max(2, amount.length + 1)}ch` }}
            />
          </div>
        </div>

        {/* Category */}
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map(cat => {
            const Icon = CATEGORY_ICONS[cat]
            const color = CATEGORY_COLORS[cat]
            const selected = category === cat
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border text-left transition-all active:scale-95',
                  selected
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-800 bg-slate-900/60'
                )}
              >
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                  style={{ backgroundColor: `${color}22` }}
                >
                  <Icon size={15} style={{ color }} />
                </div>
                <span className={cn('text-sm font-medium', selected ? 'text-emerald-400' : 'text-slate-300')}>
                  {cat}
                </span>
              </button>
            )
          })}
        </div>

        {/* Date */}
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-emerald-500 transition-colors"
        />

        {/* Payment method */}
        <div className="flex bg-slate-900 rounded-xl p-1 gap-1">
          {PAYMENT_METHODS.map(method => (
            <button
              key={method}
              onClick={() => setPaymentMethod(method)}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                paymentMethod === method
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-500 active:text-slate-300'
              )}
            >
              {method}
            </button>
          ))}
        </div>

        {/* Note */}
        <Textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="What was this for?"
          rows={2}
          className="bg-slate-900 border-slate-800 text-slate-200 placeholder:text-slate-700 resize-none focus-visible:ring-emerald-500"
        />

        {/* Essential toggle */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 rounded-xl">
          <div>
            <p className="text-sm font-medium text-slate-200">Essential</p>
            <p className="text-xs text-slate-500 mt-0.5">Rent, groceries, bills</p>
          </div>
          <Switch
            checked={isEssential}
            onCheckedChange={setIsEssential}
            className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-slate-700"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={handleDelete}
            className={cn(
              'flex-1 py-3.5 rounded-xl font-semibold text-sm transition-all active:scale-95',
              deleteConfirm
                ? 'bg-red-500 text-white'
                : 'bg-slate-800 text-red-400 border border-red-400/20'
            )}
          >
            {deleteConfirm ? 'Tap again to delete' : 'Delete'}
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex-1 py-3.5 rounded-xl bg-emerald-500 text-slate-950 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
