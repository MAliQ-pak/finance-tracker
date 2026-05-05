import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { PRIMARY_METHODS, DIGITAL_METHODS, type PaymentMethod } from '@/lib/categories'
import { updateExpense, deleteExpense } from '@/db/expenses'
import { db } from '@/db/db'
import type { Expense, ExpenseType } from '@/db/db'
import { Shield, Sparkles, PiggyBank } from 'lucide-react'
import { getIcon } from '@/lib/iconMap'

const TYPE_OPTIONS: { value: ExpenseType; label: string; icon: typeof Shield; color: string }[] = [
  { value: 'need',    label: 'Need',    icon: Shield,    color: 'rgba(96,165,250,0.75)'  },
  { value: 'want',    label: 'Want',    icon: Sparkles,  color: 'rgba(167,139,250,0.75)' },
  { value: 'savings', label: 'Savings', icon: PiggyBank, color: 'rgba(74,222,128,0.75)'  },
]

interface Props {
  expense: Expense | null
  onClose: () => void
}

export default function EditExpenseSheet({ expense, onClose }: Props) {
  const open = expense !== null

  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [date, setDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Card')
  const [note, setNote] = useState('')
  const [expenseType, setExpenseType] = useState<ExpenseType>('need')
  const [goalId, setGoalId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const categories = useLiveQuery(() => db.categories.orderBy('order').toArray()) ?? []
  const goals = useLiveQuery(() => db.goals.orderBy('createdAt').toArray()) ?? []

  useEffect(() => {
    if (expense) {
      setAmount(String(expense.amount))
      setCategory(expense.category)
      setDate(expense.date.slice(0, 10))
      setPaymentMethod(expense.paymentMethod as PaymentMethod)
      setNote(expense.note)
      setExpenseType(expense.type)
      setGoalId(expense.goalId ?? null)
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
        type: expenseType,
        goalId: expenseType === 'savings' ? goalId : null,
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
    if (!deleteConfirm) { setDeleteConfirm(true); return }
    await deleteExpense(expense.id)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="flex flex-col gap-0 pb-8 pt-2 max-h-[88svh] overflow-y-auto">
        <h2 className="text-[rgba(255,255,255,0.55)] text-xs font-semibold text-center tracking-widest uppercase pb-4 px-6">
          Edit Expense
        </h2>

        {/* Amount */}
        <div className="flex flex-col items-center py-6 px-6 border-b border-[rgba(255,255,255,0.05)]">
          <div className="flex items-baseline gap-2">
            <span className="text-[rgba(255,255,255,0.25)] text-xl font-light">Rs</span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="0"
              className="bg-transparent text-[44px] font-[800] text-[rgba(255,255,255,0.93)] outline-none text-center placeholder:text-[rgba(255,255,255,0.1)] tracking-[-2px] tabular min-w-[2ch]"
              style={{ width: `${Math.max(2, amount.length + 1)}ch` }}
            />
          </div>
        </div>

        {/* Category */}
        <div className="px-6 pt-5 pb-4 border-b border-[rgba(255,255,255,0.05)]">
          <p className="section-label mb-3">Category</p>
          <div className="grid grid-cols-2 gap-2">
            {categories.map(cat => {
              const Icon = getIcon(cat.icon)
              const selected = category === cat.label
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.label)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border text-left transition-all active:scale-[0.98]',
                    selected
                      ? 'border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.05)]'
                      : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]'
                  )}
                >
                  <div
                    className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                    style={{ backgroundColor: `${cat.color}18` }}
                  >
                    <Icon size={15} strokeWidth={1.5} style={{ color: selected ? cat.color : `${cat.color}99` }} />
                  </div>
                  <span className={cn('text-[13px] font-medium', selected ? 'text-[rgba(255,255,255,0.85)]' : 'text-[rgba(255,255,255,0.45)]')}>
                    {cat.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Type */}
        <div className="px-6 pt-5 pb-4 border-b border-[rgba(255,255,255,0.05)]">
          <p className="section-label mb-3">Type</p>
          <div className="grid grid-cols-3 gap-2">
            {TYPE_OPTIONS.map(({ value, label, icon: Icon, color }) => {
              const selected = expenseType === value
              return (
                <button
                  key={value}
                  onClick={() => { setExpenseType(value); if (value !== 'savings') setGoalId(null) }}
                  className={cn(
                    'flex flex-col items-center gap-2 py-3 rounded-xl border transition-all active:scale-[0.98]',
                    selected
                      ? 'border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.05)]'
                      : 'border-[rgba(255,255,255,0.05)] bg-transparent'
                  )}
                >
                  <Icon size={15} strokeWidth={1.5} style={{ color: selected ? color : 'rgba(255,255,255,0.2)' }} />
                  <span className="text-xs font-medium" style={{ color: selected ? color : 'rgba(255,255,255,0.25)' }}>
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Goal picker */}
        {expenseType === 'savings' && goals.length > 0 && (
          <div className="px-6 pt-5 pb-4 border-b border-[rgba(255,255,255,0.05)]">
            <p className="section-label mb-3">Link to Goal <span className="normal-case font-normal text-[rgba(255,255,255,0.18)]">(optional)</span></p>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => setGoalId(null)}
                className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-xl border text-xs transition-all',
                  goalId === null
                    ? 'border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.7)]'
                    : 'border-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.3)]'
                )}
              >
                No specific goal
                {goalId === null && <Check size={11} className="text-[rgba(255,255,255,0.4)]" />}
              </button>
              {goals.map(g => {
                const Icon = getIcon(g.icon)
                return (
                  <button
                    key={g.id}
                    onClick={() => setGoalId(g.id)}
                    className={cn(
                      'flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs transition-all',
                      goalId === g.id
                        ? 'border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.7)]'
                        : 'border-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.3)]'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon size={11} style={{ color: g.color }} />
                      {g.name}
                    </div>
                    {goalId === g.id && <Check size={11} className="text-[rgba(255,255,255,0.4)]" />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Date */}
        <div className="px-6 pt-4 pb-4 border-b border-[rgba(255,255,255,0.05)]">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full bg-transparent border border-[rgba(255,255,255,0.07)] rounded-xl px-4 py-3 text-sm text-[rgba(255,255,255,0.6)] outline-none focus:border-[rgba(255,255,255,0.18)] transition-colors"
          />
        </div>

        {/* Payment method */}
        <div className="px-6 pt-4 pb-4 border-b border-[rgba(255,255,255,0.05)]">
          <div className="flex bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-xl p-1 gap-1 mb-2">
            {PRIMARY_METHODS.map(method => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                  paymentMethod === method
                    ? 'bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.78)]'
                    : 'text-[rgba(255,255,255,0.28)]'
                )}
              >
                {method}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {DIGITAL_METHODS.map(method => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={cn(
                  'py-2 rounded-lg text-xs font-medium border transition-all active:scale-[0.97]',
                  paymentMethod === method
                    ? 'border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.7)]'
                    : 'border-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.25)]'
                )}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="px-6 pt-4 pb-4 border-b border-[rgba(255,255,255,0.05)]">
          <Textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="What was this for?"
            rows={2}
            className="bg-transparent border-[rgba(255,255,255,0.07)] text-[rgba(255,255,255,0.6)] placeholder:text-[rgba(255,255,255,0.15)] resize-none focus-visible:ring-0 focus-visible:border-[rgba(255,255,255,0.18)] rounded-xl"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pt-4">
          <button
            onClick={handleDelete}
            className={cn(
              'flex-1 py-3.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]',
              deleteConfirm
                ? 'bg-[rgba(248,113,113,0.15)] text-[rgba(248,113,113,0.9)] border border-[rgba(248,113,113,0.3)]'
                : 'border border-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.3)]'
            )}
          >
            {deleteConfirm ? 'Confirm delete' : 'Delete'}
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex-1 py-3.5 rounded-xl bg-[rgba(255,255,255,0.9)] text-[#080808] font-semibold text-sm disabled:opacity-25 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
