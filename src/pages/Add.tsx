import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  CATEGORIES,
  PRIMARY_METHODS,
  DIGITAL_METHODS,
  CATEGORY_ICONS,
  CATEGORY_COLORS,
  type Category,
  type PaymentMethod,
} from '@/lib/categories'
import { addExpense } from '@/db/expenses'
import type { ExpenseType } from '@/db/db'
import { getLastPaymentMethod, setLastPaymentMethod } from '@/lib/preferences'
import { Textarea } from '@/components/ui/textarea'
import { Shield, Sparkles, PiggyBank } from 'lucide-react'

const today = new Date().toISOString().slice(0, 10)

const TYPE_OPTIONS: { value: ExpenseType; label: string; icon: typeof Shield; color: string }[] = [
  { value: 'need', label: 'Need', icon: Shield, color: '#3b82f6' },
  { value: 'want', label: 'Want', icon: Sparkles, color: '#a855f7' },
  { value: 'savings', label: 'Savings', icon: PiggyBank, color: '#10b981' },
]

export default function Add() {
  const navigate = useNavigate()
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<Category | ''>('')
  const [date, setDate] = useState(today)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(getLastPaymentMethod)
  const [note, setNote] = useState('')
  const [expenseType, setExpenseType] = useState<ExpenseType | ''>('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const parsedAmount = parseFloat(amount)
  const canSave = category !== '' && expenseType !== '' && !isNaN(parsedAmount) && parsedAmount > 0

  const handleSave = async () => {
    if (!canSave || saving || expenseType === '') return
    setSaving(true)
    try {
      await addExpense({
        amount: parsedAmount,
        category,
        note: note.trim(),
        paymentMethod,
        date,
        type: expenseType,
      })
      setLastPaymentMethod(paymentMethod)
      setSaved(true)
      setSaving(false)
      setAmount('')
      setCategory('')
      setNote('')
      setPaymentMethod(getLastPaymentMethod())
      setDate(today)
      setExpenseType('')
      setTimeout(() => {
        navigate('/')
        setSaved(false)
      }, 600)
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 px-4 py-5 pb-8 overflow-y-auto">
      {/* Amount */}
      <div className="flex flex-col items-center gap-1 py-6 bg-slate-900 rounded-2xl">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-2">Amount</p>
        <div className="flex items-center gap-1.5">
          <span className="text-3xl font-light text-slate-500">₨</span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
            placeholder="0"
            className="bg-transparent text-5xl font-bold text-slate-100 outline-none text-center placeholder:text-slate-700 min-w-[2ch]"
            style={{ width: `${Math.max(2, amount.length + 1)}ch` }}
            autoFocus
          />
        </div>
        {parsedAmount > 0 && (
          <p className="text-xs text-slate-600 mt-1">
            ₨ {parsedAmount.toLocaleString('en-US')}
          </p>
        )}
      </div>

      {/* Category */}
      <section>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Category</p>
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
                  className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                  style={{ backgroundColor: `${color}22` }}
                >
                  <Icon size={17} style={{ color }} />
                </div>
                <span
                  className={cn(
                    'text-sm font-medium',
                    selected ? 'text-emerald-400' : 'text-slate-300'
                  )}
                >
                  {cat}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Type */}
      <section>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Type</p>
        <div className="grid grid-cols-3 gap-2">
          {TYPE_OPTIONS.map(({ value, label, icon: Icon, color }) => {
            const selected = expenseType === value
            return (
              <button
                key={value}
                onClick={() => setExpenseType(value)}
                className={cn(
                  'flex flex-col items-center gap-2 py-3 rounded-xl border transition-all active:scale-95',
                  selected ? 'border-current bg-opacity-10' : 'border-slate-800 bg-slate-900/60'
                )}
                style={selected ? { borderColor: color, backgroundColor: `${color}18` } : undefined}
              >
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-lg"
                  style={{ backgroundColor: `${color}22` }}
                >
                  <Icon size={16} style={{ color }} />
                </div>
                <span
                  className="text-xs font-semibold"
                  style={{ color: selected ? color : '#94a3b8' }}
                >
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Date */}
      <section>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Date</p>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-emerald-500 transition-colors"
        />
      </section>

      {/* Payment method */}
      <section>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Payment method</p>
        <div className="flex bg-slate-900 rounded-xl p-1 gap-1 mb-2">
          {PRIMARY_METHODS.map(method => (
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
        <div className="grid grid-cols-3 gap-2">
          {DIGITAL_METHODS.map(method => (
            <button
              key={method}
              onClick={() => setPaymentMethod(method)}
              className={cn(
                'py-2 rounded-xl text-xs font-medium border transition-all active:scale-95',
                paymentMethod === method
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400'
              )}
            >
              {method}
            </button>
          ))}
        </div>
      </section>

      {/* Note */}
      <section>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Note</p>
        <Textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="What was this for?"
          rows={3}
          className="bg-slate-900 border-slate-800 text-slate-200 placeholder:text-slate-700 resize-none focus-visible:ring-emerald-500 focus-visible:border-transparent"
        />
      </section>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!canSave || saving}
        className={cn(
          'w-full py-4 rounded-2xl font-semibold text-base transition-all active:scale-[0.98]',
          saved
            ? 'bg-emerald-400 text-slate-950'
            : 'bg-emerald-500 text-slate-950 disabled:opacity-35 disabled:cursor-not-allowed'
        )}
      >
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Expense'}
      </button>
    </div>
  )
}
