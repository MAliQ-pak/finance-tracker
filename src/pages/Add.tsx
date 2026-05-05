import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  PRIMARY_METHODS,
  DIGITAL_METHODS,
  type PaymentMethod,
} from '@/lib/categories'
import { db } from '@/db/db'
import { addExpense } from '@/db/expenses'
import type { ExpenseType } from '@/db/db'
import { getLastPaymentMethod, setLastPaymentMethod } from '@/lib/preferences'
import { Textarea } from '@/components/ui/textarea'
import { Shield, Sparkles, PiggyBank } from 'lucide-react'
import { getIcon } from '@/lib/iconMap'

const today = new Date().toISOString().slice(0, 10)

const TYPE_OPTIONS: { value: ExpenseType; label: string; icon: typeof Shield; color: string }[] = [
  { value: 'need',    label: 'Need',    icon: Shield,    color: 'rgba(96,165,250,0.75)'  },
  { value: 'want',    label: 'Want',    icon: Sparkles,  color: 'rgba(167,139,250,0.75)' },
  { value: 'savings', label: 'Savings', icon: PiggyBank, color: 'rgba(74,222,128,0.75)'  },
]

export default function Add() {
  const navigate = useNavigate()
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [date, setDate] = useState(today)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(getLastPaymentMethod)
  const [note, setNote] = useState('')
  const [expenseType, setExpenseType] = useState<ExpenseType | null>(null)
  const [goalId, setGoalId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const categories = useLiveQuery(() => db.categories.orderBy('order').toArray()) ?? []
  const goals = useLiveQuery(() => db.goals.orderBy('createdAt').toArray()) ?? []

  const parsedAmount = parseFloat(amount)
  const canSave = category !== '' && expenseType !== null && !isNaN(parsedAmount) && parsedAmount > 0

  const handleSave = async () => {
    if (!canSave || saving || expenseType === null) return
    setSaving(true)
    try {
      await addExpense({
        amount: parsedAmount,
        category,
        note: note.trim(),
        paymentMethod,
        date,
        type: expenseType,
        goalId: expenseType === 'savings' ? goalId : null,
      })
      setLastPaymentMethod(paymentMethod)
      setSaved(true)
      setSaving(false)
      setAmount('')
      setCategory('')
      setNote('')
      setPaymentMethod(getLastPaymentMethod())
      setDate(today)
      setExpenseType(null)
      setGoalId(null)
      setTimeout(() => {
        navigate('/')
        setSaved(false)
      }, 500)
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col overflow-y-auto">
      {/* Page header */}
      <div className="px-6 pt-5 pb-0">
        <p className="text-[rgba(255,255,255,0.85)] text-[20px] font-[700] tracking-[-0.8px]">Add expense</p>
      </div>

      {/* Amount block */}
      <div className="flex flex-col items-center gap-1 py-8 px-6">
        <p className="section-label mb-4">Amount</p>
        <div className="flex items-baseline gap-2">
          <span className="text-[rgba(255,255,255,0.70)] text-2xl font-light">Rs</span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
            placeholder="0"
            autoFocus
            className="bg-transparent text-[56px] font-[800] text-[rgba(255,255,255,0.93)] outline-none text-center placeholder:text-[rgba(255,255,255,0.1)] tracking-[-2px] tabular min-w-[2ch]"
            style={{ width: `${Math.max(2, amount.length + 1)}ch` }}
          />
        </div>
        {parsedAmount > 0 && (
          <p className="text-[rgba(255,255,255,0.50)] text-xs tabular mt-1">
            Rs {parsedAmount.toLocaleString('en-PK')}
          </p>
        )}
      </div>

      <div className="h-px bg-[rgba(255,255,255,0.05)]" />

      {/* Category */}
      <div className="px-6 pt-5 pb-4">
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
                <span
                  className={cn(
                    'text-[13px] font-medium',
                    selected ? 'text-[rgba(255,255,255,0.85)]' : 'text-[rgba(255,255,255,0.65)]'
                  )}
                >
                  {cat.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="h-px bg-[rgba(255,255,255,0.05)]" />

      {/* Type */}
      <div className="px-6 pt-5 pb-4">
        <p className="section-label mb-3">Type</p>
        <div className="grid grid-cols-3 gap-2">
          {TYPE_OPTIONS.map(({ value, label, icon: Icon, color }) => {
            const selected = expenseType === value
            return (
              <button
                key={value}
                onClick={() => { setExpenseType(value); if (value !== 'savings') setGoalId(null) }}
                className={cn(
                  'flex flex-col items-center gap-2 py-3.5 rounded-xl border transition-all active:scale-[0.98]',
                  selected
                    ? 'border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.05)]'
                    : 'border-[rgba(255,255,255,0.05)] bg-transparent'
                )}
              >
                <Icon size={16} strokeWidth={1.5} style={{ color: selected ? color : 'rgba(255,255,255,0.2)' }} />
                <span
                  className="text-xs font-medium"
                  style={{ color: selected ? color : 'rgba(255,255,255,0.25)' }}
                >
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Goal picker (savings only) */}
      {expenseType === 'savings' && goals.length > 0 && (
        <>
          <div className="h-px bg-[rgba(255,255,255,0.05)]" />
          <div className="px-6 pt-5 pb-4">
            <p className="section-label mb-3">Link to Goal <span className="normal-case font-normal text-[rgba(255,255,255,0.50)]">(optional)</span></p>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => setGoalId(null)}
                className={cn(
                  'flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs transition-all text-left',
                  goalId === null
                    ? 'border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.7)]'
                    : 'border-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.60)]'
                )}
              >
                No specific goal
                {goalId === null && <Check size={12} className="text-[rgba(255,255,255,0.5)]" />}
              </button>
              {goals.map(g => {
                const Icon = getIcon(g.icon)
                return (
                  <button
                    key={g.id}
                    onClick={() => setGoalId(g.id)}
                    className={cn(
                      'flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border text-xs transition-all',
                      goalId === g.id
                        ? 'border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.7)]'
                        : 'border-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.60)]'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon size={12} style={{ color: g.color }} />
                      {g.name}
                    </div>
                    {goalId === g.id && <Check size={12} className="text-[rgba(255,255,255,0.5)]" />}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      <div className="h-px bg-[rgba(255,255,255,0.05)]" />

      {/* Date */}
      <div className="px-6 pt-5 pb-4">
        <p className="section-label mb-3">Date</p>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full bg-transparent border border-[rgba(255,255,255,0.07)] rounded-xl px-4 py-3 text-sm text-[rgba(255,255,255,0.6)] outline-none focus:border-[rgba(255,255,255,0.18)] transition-colors"
        />
      </div>

      <div className="h-px bg-[rgba(255,255,255,0.05)]" />

      {/* Payment method */}
      <div className="px-6 pt-5 pb-4">
        <p className="section-label mb-3">Payment method</p>
        {/* Primary */}
        <div className="flex bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-xl p-1 gap-1 mb-2">
          {PRIMARY_METHODS.map(method => (
            <button
              key={method}
              onClick={() => setPaymentMethod(method)}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                paymentMethod === method
                  ? 'bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.78)]'
                  : 'text-[rgba(255,255,255,0.70)]'
              )}
            >
              {method}
            </button>
          ))}
        </div>
        {/* Digital */}
        <div className="grid grid-cols-3 gap-1.5">
          {DIGITAL_METHODS.map(method => (
            <button
              key={method}
              onClick={() => setPaymentMethod(method)}
              className={cn(
                'py-2 rounded-lg text-xs font-medium border transition-all active:scale-[0.97]',
                paymentMethod === method
                  ? 'border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.7)]'
                  : 'border-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.70)]'
              )}
            >
              {method}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-[rgba(255,255,255,0.05)]" />

      {/* Note */}
      <div className="px-6 pt-5 pb-4">
        <p className="section-label mb-3">Note</p>
        <Textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="What was this for?"
          rows={2}
          className="bg-transparent border-[rgba(255,255,255,0.07)] text-[rgba(255,255,255,0.6)] placeholder:text-[rgba(255,255,255,0.15)] resize-none focus-visible:ring-0 focus-visible:border-[rgba(255,255,255,0.18)] rounded-xl"
        />
      </div>

      {/* Save button */}
      <div className="px-6 pb-8 pt-2">
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className={cn(
            'w-full py-4 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98]',
            saved
              ? 'bg-[rgba(255,255,255,0.85)] text-[#080808]'
              : 'bg-[rgba(255,255,255,0.9)] text-[#080808] disabled:opacity-25 disabled:cursor-not-allowed'
          )}
        >
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Expense'}
        </button>
      </div>
    </div>
  )
}
