import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import {
  getWalletForMonth,
  setStartingBalances,
  addAdjustment,
  removeAdjustment,
  calculateCurrentBalances,
  type CurrentBalances,
} from '@/db/wallet'
import { formatCurrency } from '@/lib/categories'
import { cn } from '@/lib/utils'
import { Sheet } from '@/components/ui/sheet'
import type { WalletAdjustment } from '@/db/db'

const now = new Date()
const YEAR = now.getFullYear()
const MONTH = now.getMonth() + 1

const MONTH_LABEL = now.toLocaleString('default', { month: 'long', year: 'numeric' })

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

  const [setupOpen, setSetupOpen] = useState(false)
  const [adjOpen, setAdjOpen] = useState(false)

  if (walletRecord === undefined) {
    // still loading
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
          <p className="hero-amount">{formatCurrency(balances?.total ?? 0)}</p>
        </div>

        {/* Divider */}
        <div className="h-px bg-[rgba(var(--fg),0.05)]" />

        {/* Breakdown */}
        <div className="px-6 pt-5 pb-2">
          <p className="section-label mb-3">Breakdown</p>
        </div>

        <BalanceRow label="Cash" value={balances?.cash ?? 0} />
        <BalanceRow label="Digital" value={balances?.digital ?? 0} />

        {/* Divider */}
        <div className="mt-4 h-px bg-[rgba(var(--fg),0.05)]" />

        {/* Adjustments */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
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
          <p className="px-6 py-3 text-[rgba(var(--fg),0.40)] text-xs">
            No adjustments yet — use these for cash received, transfers, etc.
          </p>
        ) : (
          <AdjustmentList
            adjustments={walletRecord.adjustments}
            year={YEAR}
            month={MONTH}
          />
        )}

        {/* Starting balances info */}
        <div className="mt-4 h-px bg-[rgba(var(--fg),0.05)]" />
        <div className="px-6 py-4">
          <p className="section-label mb-3">Starting balances</p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[rgba(var(--fg),0.55)] text-xs">Cash</span>
              <span className="text-[rgba(var(--fg),0.70)] text-xs tabular">
                {formatCurrency(walletRecord.startingCash)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[rgba(var(--fg),0.55)] text-xs">Digital</span>
              <span className="text-[rgba(var(--fg),0.70)] text-xs tabular">
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

      <AddAdjustmentSheet
        open={adjOpen}
        onClose={() => setAdjOpen(false)}
        year={YEAR}
        month={MONTH}
      />
    </>
  )
}

function WalletEmpty({ onSetup }: { onSetup: () => void }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-6 pt-5 pb-0">
        <span className="text-[rgba(var(--fg),0.65)] text-xs font-medium">{MONTH_LABEL}</span>
      </div>

      <div className="flex flex-col items-center justify-center gap-4 py-24 px-8 text-center">
        <p className="text-[rgba(var(--fg),0.80)] text-sm font-medium">No wallet set up yet</p>
        <p className="text-[rgba(var(--fg),0.50)] text-xs leading-relaxed">
          Enter your starting cash and digital balances to track how much money you have left this month.
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
        {negative ? '−' : ''}{formatCurrency(Math.abs(value))}
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
            <p className="text-[rgba(var(--fg),0.78)] text-[13px] font-medium leading-snug truncate">
              {adj.note || (adj.method === 'cash' ? 'Cash adjustment' : 'Digital adjustment')}
            </p>
            <p className="text-[rgba(var(--fg),0.45)] text-[11px] capitalize">{adj.method}</p>
          </div>

          <span
            className={cn(
              'text-[13px] font-semibold tabular',
              adj.amount < 0
                ? 'text-[rgba(var(--rgb-warn),0.80)]'
                : 'text-[rgba(var(--rgb-savings),0.80)]'
            )}
          >
            {adj.amount >= 0 ? '+' : '−'}{formatCurrency(Math.abs(adj.amount))}
          </span>

          <button
            onClick={() => handleDelete(adj.id)}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-[rgba(var(--fg),0.35)] active:text-[rgba(var(--rgb-warn),0.70)] active:bg-[rgba(var(--rgb-warn),0.05)] transition-colors shrink-0"
            aria-label="Remove adjustment"
          >
            <Trash2 size={13} strokeWidth={1.5} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Sheets ──────────────────────────────────────────────────────────────────

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
  const [cash, setCash] = useState(String(initialCash || ''))
  const [digital, setDigital] = useState(String(initialDigital || ''))

  // sync when sheet reopens with fresh values
  useMemo(() => {
    setCash(initialCash ? String(initialCash) : '')
    setDigital(initialDigital ? String(initialDigital) : '')
  }, [initialCash, initialDigital, open])

  async function handleSave() {
    const c = parseFloat(cash) || 0
    const d = parseFloat(digital) || 0
    await setStartingBalances(year, month, c, d)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="px-6 pb-4 border-b border-[rgba(var(--fg),0.05)]">
        <p className="text-[rgba(var(--fg),0.85)] text-base font-semibold">Starting balances</p>
      </div>

      <div className="px-6 pt-5 flex flex-col gap-4">
        <AmountField label="Cash" value={cash} onChange={setCash} placeholder="0" />
        <AmountField label="Digital" value={digital} onChange={setDigital} placeholder="0" />
      </div>

      <div className="px-6 pt-6 pb-8">
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
        <p className="text-[rgba(var(--fg),0.85)] text-base font-semibold">Add adjustment</p>
      </div>

      <div className="px-6 pt-5 flex flex-col gap-4">
        {/* In / Out toggle */}
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

        {/* Cash / Digital toggle */}
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
            placeholder="e.g. salary received, ATM top-up"
            className="w-full bg-[rgba(var(--fg),0.03)] border border-[rgba(var(--fg),0.06)] rounded-xl px-4 py-3 text-sm text-[rgba(var(--fg),0.82)] placeholder:text-[rgba(var(--fg),0.30)] outline-none focus:border-[rgba(var(--fg),0.15)] transition-colors"
          />
        </div>
      </div>

      <div className="px-6 pt-6 pb-8">
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
        <span className="text-[rgba(var(--fg),0.40)] text-sm">Rs</span>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-[rgba(var(--fg),0.82)] placeholder:text-[rgba(var(--fg),0.30)] outline-none tabular"
        />
      </div>
    </div>
  )
}
