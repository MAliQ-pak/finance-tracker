import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import {
  getWalletForMonth,
  setStartingBalances,
  addAdjustment,
  removeAdjustment,
  calculateCurrentBalances,
  DIGITAL_METHODS,
  type CurrentBalances,
} from '@/db/wallet'
import { db } from '@/db/db'
import { formatCurrency } from '@/lib/categories'
import { cn } from '@/lib/utils'
import { Sheet } from '@/components/ui/sheet'
import type { WalletAdjustment } from '@/db/db'

const now = new Date()
const YEAR = now.getFullYear()
const MONTH = now.getMonth() + 1
const MONTH_STR = `${YEAR}-${String(MONTH).padStart(2, '0')}`
const MONTH_LABEL = now.toLocaleString('default', { month: 'long', year: 'numeric' })

interface ActivityItem {
  date: string
  amount: number
  method: 'cash' | 'digital'
  label: string
}

export default function Wallet() {
  const walletRecord = useLiveQuery(
    () => getWalletForMonth(YEAR, MONTH),
    []
  )

  const balances = useLiveQuery<CurrentBalances | null>(
    async () => {
      if (!walletRecord) return null
      return calculateCurrentBalances(YEAR, MONTH)
    },
    [walletRecord]
  )

  const monthExpenses = useLiveQuery(
    () => db.expenses.where('date').startsWith(MONTH_STR).toArray(),
    []
  ) ?? []

  const activityItems = useMemo<ActivityItem[]>(() => {
    if (!walletRecord) return []

    const items: ActivityItem[] = []

    for (const adj of walletRecord.adjustments) {
      items.push({
        date: adj.createdAt.slice(0, 10),
        amount: adj.amount,
        method: adj.method,
        label: adj.note || (adj.amount >= 0 ? 'Income deposit' : 'Adjustment'),
      })
    }

    for (const e of monthExpenses) {
      if (e.paymentMethod === 'Cash') {
        items.push({
          date: e.date,
          amount: -e.amount,
          method: 'cash',
          label: e.note ? `${e.category}: ${e.note}` : e.category,
        })
      } else if (DIGITAL_METHODS.includes(e.paymentMethod)) {
        items.push({
          date: e.date,
          amount: -e.amount,
          method: 'digital',
          label: e.note ? `${e.category}: ${e.note}` : e.category,
        })
      }
    }

    return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
  }, [walletRecord, monthExpenses])

  const [setupOpen, setSetupOpen] = useState(false)
  const [incomeOpen, setIncomeOpen] = useState(false)
  const [adjOpen, setAdjOpen] = useState(false)

  if (walletRecord === undefined) {
    return <div className="flex-1" />
  }

  if (!walletRecord) {
    return (
      <>
        <WalletEmpty onSetup={() => setSetupOpen(true)} />
        <SetupSheet
          open={setupOpen}
          onClose={() => setSetupOpen(false)}
          initialCash={0}
          initialDigital={0}
          year={YEAR}
          month={MONTH}
        />
      </>
    )
  }

  const total = balances?.total ?? 0
  const totalNegative = total < 0

  return (
    <>
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <span className="text-[rgba(var(--fg),0.65)] text-xs font-medium">{MONTH_LABEL}</span>
          <button
            onClick={() => setSetupOpen(true)}
            className="flex items-center gap-1 text-[rgba(var(--fg),0.55)] text-xs active:text-[rgba(var(--fg),0.80)] transition-colors"
            aria-label="Edit starting balances"
          >
            <Pencil size={11} strokeWidth={1.5} />
            Edit
          </button>
        </div>

        {/* Hero */}
        <div className="px-6 pt-5 pb-6">
          <p className="section-label mb-3">Remaining in wallet</p>
          <p className="hero-amount">
            <span className={totalNegative ? 'text-[rgba(var(--rgb-warn),0.85)]' : ''}>
              {totalNegative
                ? `${formatCurrency(Math.abs(total))} over`
                : formatCurrency(total)}
            </span>
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-[rgba(var(--fg),0.05)]" />

        {/* Cash / Digital breakdown */}
        <div className="px-6 pt-4 pb-2">
          <p className="section-label">Breakdown</p>
        </div>
        <BalanceRow label="Cash" value={balances?.cash ?? 0} />
        <BalanceRow label="Digital" value={balances?.digital ?? 0} />

        {/* Income deposit button */}
        <div className="px-6 pt-4 pb-3">
          <button
            onClick={() => setIncomeOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[rgba(var(--fg),0.10)] text-[rgba(var(--fg),0.75)] text-sm font-medium active:bg-[rgba(var(--fg),0.03)] transition-colors"
          >
            <Plus size={13} strokeWidth={2} />
            Income deposit
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-[rgba(var(--fg),0.05)]" />

        {/* Recent activity */}
        {activityItems.length > 0 && (
          <>
            <div className="px-6 pt-4 pb-2">
              <p className="section-label">Recent activity</p>
            </div>
            {activityItems.map((item, i) => (
              <ActivityRow key={i} item={item} />
            ))}
            <div className="mt-2 h-px bg-[rgba(var(--fg),0.05)]" />
          </>
        )}

        {/* Adjustments */}
        <div className="flex items-center justify-between px-6 pt-4 pb-2">
          <p className="section-label">Adjustments</p>
          <button
            onClick={() => setAdjOpen(true)}
            className="flex items-center gap-1 text-[rgba(var(--fg),0.55)] text-xs active:text-[rgba(var(--fg),0.80)] transition-colors"
          >
            <Plus size={12} strokeWidth={2} />
            Add
          </button>
        </div>

        {walletRecord.adjustments.length === 0 ? (
          <p className="px-6 pb-3 text-[rgba(var(--fg),0.35)] text-xs">
            No adjustments yet — income deposits and corrections appear here.
          </p>
        ) : (
          <AdjustmentList adjustments={walletRecord.adjustments} year={YEAR} month={MONTH} />
        )}

        {/* Starting balances */}
        <div className="mt-3 h-px bg-[rgba(var(--fg),0.05)]" />
        <div className="px-6 py-4">
          <p className="section-label mb-3">Starting balances</p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[rgba(var(--fg),0.55)] text-xs">Cash</span>
              <span className="text-[rgba(var(--fg),0.65)] text-xs tabular">
                {formatCurrency(walletRecord.startingCash)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[rgba(var(--fg),0.55)] text-xs">Digital</span>
              <span className="text-[rgba(var(--fg),0.65)] text-xs tabular">
                {formatCurrency(walletRecord.startingDigital)}
              </span>
            </div>
          </div>
        </div>

        <div className="h-6" />
      </div>

      <SetupSheet
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        initialCash={walletRecord.startingCash}
        initialDigital={walletRecord.startingDigital}
        year={YEAR}
        month={MONTH}
      />

      <IncomeDepositSheet
        open={incomeOpen}
        onClose={() => setIncomeOpen(false)}
        year={YEAR}
        month={MONTH}
      />

      <AddAdjustmentSheet
        open={adjOpen}
        onClose={() => setAdjOpen(false)}
        year={YEAR}
        month={MONTH}
      />
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function WalletEmpty({ onSetup }: { onSetup: () => void }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-6 pt-5 pb-0">
        <span className="text-[rgba(var(--fg),0.65)] text-xs font-medium">{MONTH_LABEL}</span>
      </div>

      <div className="flex flex-col items-center justify-center gap-4 py-20 px-8 text-center">
        <p className="text-[rgba(var(--fg),0.80)] text-sm font-semibold">Set up your wallet</p>
        <p className="text-[rgba(var(--fg),0.48)] text-xs leading-relaxed max-w-[260px]">
          Enter what you currently have in cash and in your bank/mobile accounts. This is your starting point — you'll add salary and other income separately.
        </p>
        <button
          onClick={onSetup}
          className="mt-2 px-6 py-2.5 rounded-xl bg-[rgba(var(--fg),0.9)] text-[var(--btn-primary-text)] text-sm font-semibold active:scale-95 transition-transform"
        >
          Set up wallet
        </button>
      </div>
    </div>
  )
}

function BalanceRow({ label, value }: { label: string; value: number }) {
  const negative = value < 0
  return (
    <div className="flex items-center justify-between px-6 py-3.5 border-b border-[rgba(var(--fg),0.05)]">
      <span className="text-[rgba(var(--fg),0.65)] text-sm">{label}</span>
      <span
        className={cn(
          'text-sm font-semibold tabular',
          negative ? 'text-[rgba(var(--rgb-warn),0.80)]' : 'text-[rgba(var(--fg),0.82)]'
        )}
      >
        {negative
          ? `${formatCurrency(Math.abs(value))} over`
          : formatCurrency(value)}
      </span>
    </div>
  )
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const positive = item.amount >= 0
  const dateStr = new Date(item.date + 'T00:00:00').toLocaleDateString('default', {
    month: 'short',
    day: 'numeric',
  })
  return (
    <div className="flex items-center gap-4 px-6 py-3 border-b border-[rgba(var(--fg),0.04)]">
      <div className="flex-1 min-w-0">
        <p className="text-[rgba(var(--fg),0.75)] text-[13px] font-medium leading-snug truncate">
          {item.label}
        </p>
        <p className="text-[rgba(var(--fg),0.38)] text-[11px] capitalize">
          {dateStr} · {item.method}
        </p>
      </div>
      <span
        className={cn(
          'text-[13px] font-semibold tabular shrink-0',
          positive ? 'text-[rgba(var(--rgb-savings),0.75)]' : 'text-[rgba(var(--fg),0.60)]'
        )}
      >
        {positive ? '+' : '−'}{formatCurrency(Math.abs(item.amount))}
      </span>
    </div>
  )
}

function AdjustmentList({
  adjustments,
  year,
  month,
}: {
  adjustments: WalletAdjustment[]
  year: number
  month: number
}) {
  async function handleDelete(id: string) {
    await removeAdjustment(year, month, id)
  }

  return (
    <div>
      {adjustments.map(adj => (
        <div
          key={adj.id}
          className="flex items-center gap-4 px-6 py-3.5 border-b border-[rgba(var(--fg),0.05)]"
        >
          <div className="flex-1 min-w-0">
            <p className="text-[rgba(var(--fg),0.75)] text-[13px] font-medium leading-snug truncate">
              {adj.note || (adj.amount >= 0 ? 'Income deposit' : 'Adjustment')}
            </p>
            <p className="text-[rgba(var(--fg),0.38)] text-[11px] capitalize">{adj.method}</p>
          </div>

          <span
            className={cn(
              'text-[13px] font-semibold tabular',
              adj.amount >= 0 ? 'text-[rgba(var(--rgb-savings),0.75)]' : 'text-[rgba(var(--rgb-warn),0.75)]'
            )}
          >
            {adj.amount >= 0 ? '+' : '−'}{formatCurrency(Math.abs(adj.amount))}
          </span>

          <button
            onClick={() => handleDelete(adj.id)}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-[rgba(var(--fg),0.30)] active:text-[rgba(var(--rgb-warn),0.70)] active:bg-[rgba(var(--rgb-warn),0.05)] transition-colors shrink-0"
            aria-label="Remove adjustment"
          >
            <Trash2 size={13} strokeWidth={1.5} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Sheets ───────────────────────────────────────────────────────────────────

function SetupSheet({
  open,
  onClose,
  initialCash,
  initialDigital,
  year,
  month,
}: {
  open: boolean
  onClose: () => void
  initialCash: number
  initialDigital: number
  year: number
  month: number
}) {
  const [cash, setCash] = useState(initialCash ? String(initialCash) : '')
  const [digital, setDigital] = useState(initialDigital ? String(initialDigital) : '')

  useMemo(() => {
    setCash(initialCash ? String(initialCash) : '')
    setDigital(initialDigital ? String(initialDigital) : '')
  }, [initialCash, initialDigital, open])

  async function handleSave() {
    await setStartingBalances(year, month, parseFloat(cash) || 0, parseFloat(digital) || 0)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="px-6 pb-4 border-b border-[rgba(var(--fg),0.05)]">
        <p className="text-[rgba(var(--fg),0.85)] text-base font-semibold">Starting balances</p>
        <p className="text-[rgba(var(--fg),0.45)] text-xs mt-1">
          How much do you have right now, at the start of the month?
        </p>
      </div>

      <div className="px-6 pt-5 flex flex-col gap-5">
        <div>
          <AmountField label="Cash on hand" value={cash} onChange={setCash} placeholder="0" />
          <p className="mt-1.5 text-[rgba(var(--fg),0.38)] text-[11px]">Notes and coins in your wallet right now</p>
        </div>
        <div>
          <AmountField label="Digital balance" value={digital} onChange={setDigital} placeholder="0" />
          <p className="mt-1.5 text-[rgba(var(--fg),0.38)] text-[11px]">
            Total across bank accounts, JazzCash, EasyPaisa, etc. right now
          </p>
        </div>
        <p className="text-[rgba(var(--fg),0.38)] text-[11px] leading-relaxed -mt-1">
          Salary arriving this month? Add it via the Income deposit button after setup.
        </p>
      </div>

      <div className="px-6 pt-5 pb-8">
        <button
          onClick={handleSave}
          className="w-full py-3.5 rounded-xl bg-[rgba(var(--fg),0.9)] text-[var(--btn-primary-text)] text-sm font-semibold active:scale-[0.98] transition-transform"
        >
          Save
        </button>
      </div>
    </Sheet>
  )
}

function IncomeDepositSheet({
  open,
  onClose,
  year,
  month,
}: {
  open: boolean
  onClose: () => void
  year: number
  month: number
}) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [method, setMethod] = useState<'cash' | 'digital'>('digital')

  function reset() {
    setAmount('')
    setNote('')
    setMethod('digital')
  }

  async function handleSave() {
    const raw = parseFloat(amount)
    if (!raw || isNaN(raw) || raw <= 0) return
    await addAdjustment(year, month, { amount: Math.abs(raw), note, method })
    reset()
    onClose()
  }

  function handleClose() {
    reset()
    onClose()
  }

  return (
    <Sheet open={open} onClose={handleClose}>
      <div className="px-6 pb-4 border-b border-[rgba(var(--fg),0.05)]">
        <p className="text-[rgba(var(--fg),0.85)] text-base font-semibold">Income deposit</p>
        <p className="text-[rgba(var(--fg),0.45)] text-xs mt-1">
          Record salary, freelance payment, or any money coming in
        </p>
      </div>

      <div className="px-6 pt-5 flex flex-col gap-4">
        <div>
          <p className="section-label mb-2">Deposited into</p>
          <div className="flex bg-[rgba(var(--fg),0.03)] border border-[rgba(var(--fg),0.06)] rounded-xl p-1 gap-1">
            {(['digital', 'cash'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize',
                  method === m
                    ? 'bg-[rgba(var(--fg),0.08)] text-[rgba(var(--fg),0.85)]'
                    : 'text-[rgba(var(--fg),0.40)]'
                )}
              >
                {m === 'digital' ? 'Bank / Mobile' : 'Cash'}
              </button>
            ))}
          </div>
        </div>

        <AmountField label="Amount" value={amount} onChange={setAmount} placeholder="0" />

        <div>
          <p className="section-label mb-2">Note (optional)</p>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. May salary, freelance payment"
            className="w-full bg-[rgba(var(--fg),0.03)] border border-[rgba(var(--fg),0.06)] rounded-xl px-4 py-3 text-sm text-[rgba(var(--fg),0.82)] placeholder:text-[rgba(var(--fg),0.28)] outline-none focus:border-[rgba(var(--fg),0.15)] transition-colors"
          />
        </div>
      </div>

      <div className="px-6 pt-5 pb-8">
        <button
          onClick={handleSave}
          disabled={!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0}
          className="w-full py-3.5 rounded-xl bg-[rgba(var(--fg),0.9)] text-[var(--btn-primary-text)] text-sm font-semibold active:scale-[0.98] transition-transform disabled:opacity-40"
        >
          Save deposit
        </button>
      </div>
    </Sheet>
  )
}

function AddAdjustmentSheet({
  open,
  onClose,
  year,
  month,
}: {
  open: boolean
  onClose: () => void
  year: number
  month: number
}) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [method, setMethod] = useState<'cash' | 'digital'>('cash')
  const [sign, setSign] = useState<'in' | 'out'>('in')

  function reset() {
    setAmount('')
    setNote('')
    setMethod('cash')
    setSign('in')
  }

  async function handleAdd() {
    const raw = parseFloat(amount)
    if (!raw || isNaN(raw)) return
    const finalAmount = sign === 'out' ? -Math.abs(raw) : Math.abs(raw)
    await addAdjustment(year, month, { amount: finalAmount, note, method })
    reset()
    onClose()
  }

  function handleClose() {
    reset()
    onClose()
  }

  return (
    <Sheet open={open} onClose={handleClose}>
      <div className="px-6 pb-4 border-b border-[rgba(var(--fg),0.05)]">
        <p className="text-[rgba(var(--fg),0.85)] text-base font-semibold">Manual adjustment</p>
      </div>

      <div className="px-6 pt-5 flex flex-col gap-4">
        <div>
          <p className="section-label mb-2">Direction</p>
          <div className="flex bg-[rgba(var(--fg),0.03)] border border-[rgba(var(--fg),0.06)] rounded-xl p-1 gap-1">
            {(['in', 'out'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSign(s)}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                  sign === s
                    ? 'bg-[rgba(var(--fg),0.08)] text-[rgba(var(--fg),0.85)]'
                    : 'text-[rgba(var(--fg),0.40)]'
                )}
              >
                {s === 'in' ? 'Inflow (+)' : 'Outflow (−)'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="section-label mb-2">Method</p>
          <div className="flex bg-[rgba(var(--fg),0.03)] border border-[rgba(var(--fg),0.06)] rounded-xl p-1 gap-1">
            {(['cash', 'digital'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize',
                  method === m
                    ? 'bg-[rgba(var(--fg),0.08)] text-[rgba(var(--fg),0.85)]'
                    : 'text-[rgba(var(--fg),0.40)]'
                )}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <AmountField label="Amount" value={amount} onChange={setAmount} placeholder="0" />

        <div>
          <p className="section-label mb-2">Note (optional)</p>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. ATM withdrawal, cash top-up"
            className="w-full bg-[rgba(var(--fg),0.03)] border border-[rgba(var(--fg),0.06)] rounded-xl px-4 py-3 text-sm text-[rgba(var(--fg),0.82)] placeholder:text-[rgba(var(--fg),0.28)] outline-none focus:border-[rgba(var(--fg),0.15)] transition-colors"
          />
        </div>
      </div>

      <div className="px-6 pt-5 pb-8">
        <button
          onClick={handleAdd}
          disabled={!amount || isNaN(parseFloat(amount))}
          className="w-full py-3.5 rounded-xl bg-[rgba(var(--fg),0.9)] text-[var(--btn-primary-text)] text-sm font-semibold active:scale-[0.98] transition-transform disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </Sheet>
  )
}

function AmountField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div>
      <p className="section-label mb-2">{label}</p>
      <div className="flex items-center bg-[rgba(var(--fg),0.03)] border border-[rgba(var(--fg),0.06)] rounded-xl px-4 py-3 gap-2 focus-within:border-[rgba(var(--fg),0.15)] transition-colors">
        <span className="text-[rgba(var(--fg),0.38)] text-sm">Rs</span>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-[rgba(var(--fg),0.82)] placeholder:text-[rgba(var(--fg),0.28)] outline-none tabular"
        />
      </div>
    </div>
  )
}
