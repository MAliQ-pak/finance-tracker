import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  getWalletForMonth,
  getPreviousMonthEndBalances,
  setStartingBalances,
} from '@/db/wallet'
import { Sheet } from '@/components/ui/sheet'

const SKIP_KEY = 'walletRolloverSkipped'

function getSkipKey(year: number, month: number) {
  return `${SKIP_KEY}_${year}_${month}`
}

const now = new Date()
const YEAR = now.getFullYear()
const MONTH = now.getMonth() + 1

export default function WalletRolloverModal() {
  const [open, setOpen] = useState(false)
  const [cash, setCash] = useState('')
  const [digital, setDigital] = useState('')
  const [loaded, setLoaded] = useState(false)

  const currentRecord = useLiveQuery(
    () => getWalletForMonth(YEAR, MONTH),
    []
  )

  useEffect(() => {
    if (currentRecord !== undefined) setLoaded(true)
  }, [currentRecord])

  useEffect(() => {
    if (!loaded) return
    if (currentRecord) return
    if (sessionStorage.getItem(getSkipKey(YEAR, MONTH))) return

    getPreviousMonthEndBalances(YEAR, MONTH).then(prev => {
      if (!prev) return
      setCash(String(Math.round(prev.cash)))
      setDigital(String(Math.round(prev.digital)))
      setOpen(true)
    })
  }, [loaded, currentRecord])

  function handleSkip() {
    sessionStorage.setItem(getSkipKey(YEAR, MONTH), '1')
    setOpen(false)
  }

  async function handleConfirm() {
    const c = parseFloat(cash) || 0
    const d = parseFloat(digital) || 0
    await setStartingBalances(YEAR, MONTH, c, d)
    setOpen(false)
  }

  const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <Sheet open={open} onClose={handleSkip}>
      <div className="px-6 pb-4 border-b border-[rgba(var(--fg),0.05)]">
        <p className="text-[rgba(var(--fg),0.85)] text-base font-semibold">New month · {monthLabel}</p>
        <p className="text-[rgba(var(--fg),0.50)] text-xs mt-1">
          These are your estimated balances carried over from last month. Edit if needed.
        </p>
      </div>

      <div className="px-6 pt-5 flex flex-col gap-4">
        <AmountField label="Cash" value={cash} onChange={setCash} />
        <AmountField label="Digital" value={digital} onChange={setDigital} />
      </div>

      <div className="px-6 pt-6 pb-8 flex gap-3">
        <button
          onClick={handleSkip}
          className="flex-1 py-3.5 rounded-xl border border-[rgba(var(--fg),0.08)] text-[rgba(var(--fg),0.55)] text-sm font-medium active:bg-[rgba(var(--fg),0.03)] transition-colors"
        >
          Skip
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 py-3.5 rounded-xl bg-[rgba(var(--fg),0.9)] text-[var(--btn-primary-text)] text-sm font-semibold active:scale-[0.98] transition-transform"
        >
          Confirm
        </button>
      </div>
    </Sheet>
  )
}

function AmountField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
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
          placeholder="0"
          className="flex-1 bg-transparent text-sm text-[rgba(var(--fg),0.82)] placeholder:text-[rgba(var(--fg),0.30)] outline-none tabular"
        />
      </div>
    </div>
  )
}
