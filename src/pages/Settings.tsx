import { useState, useEffect } from 'react'
import { ChevronRight, Download, Trash2, Tag, BarChart2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  getMonthlyIncome,
  setMonthlyIncome,
  getBudgetSplits,
  setBudgetSplits,
  type BudgetSplits,
} from '@/lib/preferences'
import { db } from '@/db/db'
import { formatCurrency } from '@/lib/categories'
import { cn } from '@/lib/utils'

function clamp(n: number) {
  return Math.max(0, Math.min(100, n))
}

export default function Settings() {
  const navigate = useNavigate()
  const [income, setIncome] = useState('')
  const [splits, setSplits] = useState<BudgetSplits>({ needs: 50, wants: 30, savings: 20 })
  const [editingSplits, setEditingSplits] = useState(false)
  const [splitsError, setSplitsError] = useState('')
  const [clearConfirm, setClearConfirm] = useState(false)
  const [savedIncome, setSavedIncome] = useState(false)
  const [savedSplits, setSavedSplits] = useState(false)

  useEffect(() => {
    const inc = getMonthlyIncome()
    if (inc > 0) setIncome(String(inc))
    setSplits(getBudgetSplits())
  }, [])

  const parsedIncome = parseFloat(income)
  const incomeValid = !isNaN(parsedIncome) && parsedIncome > 0

  const totalSplit = splits.needs + splits.wants + splits.savings
  const splitValid = Math.round(totalSplit) === 100

  function handleSplitChange(key: keyof BudgetSplits, value: string) {
    const n = clamp(parseFloat(value) || 0)
    setSplits(prev => ({ ...prev, [key]: n }))
    setSplitsError('')
  }

  function handleSaveIncome() {
    if (!incomeValid) return
    setMonthlyIncome(parsedIncome)
    setSavedIncome(true)
    setTimeout(() => setSavedIncome(false), 1500)
  }

  function handleSaveSplits() {
    if (!splitValid) {
      setSplitsError(`Must sum to 100 (currently ${totalSplit.toFixed(0)})`)
      return
    }
    setBudgetSplits(splits)
    setEditingSplits(false)
    setSavedSplits(true)
    setTimeout(() => setSavedSplits(false), 1500)
  }

  async function handleExportCSV() {
    const expenses = await db.expenses.toArray()
    if (expenses.length === 0) return
    const header = 'Date,Category,Type,Amount,Payment Method,Note'
    const rows = expenses.map(e =>
      [e.date, e.category, e.type, e.amount, e.paymentMethod, `"${e.note.replace(/"/g, '""')}"`].join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleClearData() {
    if (!clearConfirm) {
      setClearConfirm(true)
      setTimeout(() => setClearConfirm(false), 4000)
      return
    }
    await db.expenses.clear()
    await db.goals.clear()
    setClearConfirm(false)
  }

  const targets = incomeValid
    ? {
        needs: (parsedIncome * splits.needs) / 100,
        wants: (parsedIncome * splits.wants) / 100,
        savings: (parsedIncome * splits.savings) / 100,
      }
    : null

  return (
    <div className="flex flex-col overflow-y-auto pb-8">
      {/* Page header */}
      <div className="px-6 pt-5 pb-0">
        <p className="text-[rgba(var(--fg),0.85)] text-[20px] font-[700] tracking-[-0.8px]">Settings</p>
      </div>

      {/* Income */}
      <div className="px-6 pt-6 pb-0">
        <p className="section-label mb-4">Monthly income</p>
      </div>
      <div className="flex flex-col items-center py-5 border-y border-[rgba(var(--fg),0.05)]">
        <div className="flex items-baseline gap-2">
          <span className="text-[rgba(var(--fg),0.70)] text-xl font-light">Rs</span>
          <input
            type="text"
            inputMode="decimal"
            value={income}
            onChange={e => setIncome(e.target.value.replace(/[^\d.]/g, ''))}
            placeholder="0"
            className="bg-transparent text-[44px] font-[800] text-[rgba(var(--fg),0.93)] outline-none text-center placeholder:text-[rgba(var(--fg),0.1)] tracking-[-2px] tabular min-w-[2ch]"
            style={{ width: `${Math.max(2, income.length + 1)}ch` }}
          />
        </div>
        {parsedIncome > 0 && (
          <p className="text-[rgba(var(--fg),0.50)] text-xs tabular mt-1">
            Rs {parsedIncome.toLocaleString('en-PK')}
          </p>
        )}
      </div>
      <div className="px-6 pt-4 pb-2 border-b border-[rgba(var(--fg),0.05)]">
        <button
          onClick={handleSaveIncome}
          disabled={!incomeValid}
          className="w-full py-3.5 rounded-2xl bg-[rgba(var(--fg),0.9)] text-[var(--btn-primary-text)] font-semibold text-sm disabled:opacity-25 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
        >
          {savedIncome ? 'Saved!' : 'Save Income'}
        </button>
      </div>

      {/* Budget split */}
      <div className="px-6 pt-5 pb-0">
        <p className="section-label mb-4">Budget split</p>
      </div>

      {!editingSplits ? (
        <div className="border-b border-[rgba(var(--fg),0.05)]">
          {[
            { key: 'needs' as keyof BudgetSplits, label: 'Needs', color: 'rgba(var(--rgb-need),0.75)' },
            { key: 'wants' as keyof BudgetSplits, label: 'Wants', color: 'rgba(var(--rgb-want),0.75)' },
            { key: 'savings' as keyof BudgetSplits, label: 'Savings', color: 'rgba(var(--rgb-savings),0.75)' },
          ].map(({ key, label, color }) => (
            <div key={key} className="flex items-center justify-between px-6 py-3.5 border-b border-[rgba(var(--fg),0.03)]">
              <span className="text-[rgba(var(--fg),0.70)] text-[13px] font-medium">{label}</span>
              <div className="flex items-center gap-3">
                {targets && (
                  <span className="text-[rgba(var(--fg),0.60)] text-xs tabular">{formatCurrency(targets[key])}</span>
                )}
                <span className="text-[rgba(var(--fg),0.7)] text-[13px] font-semibold tabular w-10 text-right" style={{ color }}>
                  {splits[key]}%
                </span>
              </div>
            </div>
          ))}
          <div className="px-6 py-3">
            <button
              onClick={() => setEditingSplits(true)}
              className="text-[rgba(var(--fg),0.60)] text-xs font-medium active:text-[rgba(var(--fg),0.5)] transition-colors"
            >
              {savedSplits ? 'Saved!' : 'Edit split'}
            </button>
          </div>
        </div>
      ) : (
        <div className="border-b border-[rgba(var(--fg),0.05)]">
          {(['needs', 'wants', 'savings'] as (keyof BudgetSplits)[]).map(key => {
            const colors: Record<keyof BudgetSplits, string> = {
              needs: 'rgba(var(--rgb-need),0.75)',
              wants: 'rgba(var(--rgb-want),0.75)',
              savings: 'rgba(var(--rgb-savings),0.75)',
            }
            return (
              <div key={key} className="flex items-center gap-3 px-6 py-3 border-b border-[rgba(var(--fg),0.03)]">
                <span className="text-[rgba(var(--fg),0.65)] text-[13px] capitalize w-16">{key}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={splits[key]}
                  onChange={e => handleSplitChange(key, e.target.value)}
                  className="w-14 bg-transparent border border-[rgba(var(--fg),0.08)] rounded-lg px-2 py-1.5 text-sm text-[rgba(var(--fg),0.7)] text-center outline-none focus:border-[rgba(var(--fg),0.2)] tabular"
                />
                <span className="text-[rgba(var(--fg),0.60)] text-sm">%</span>
                <div className="flex-1 h-[2px] bg-[rgba(var(--fg),0.05)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, splits[key])}%`, backgroundColor: colors[key] }}
                  />
                </div>
              </div>
            )
          })}
          <div className="px-6 py-3">
            {splitsError && <p className="text-[rgba(var(--rgb-warning),0.8)] text-xs mb-2">{splitsError}</p>}
            <p className={cn('text-xs mb-3', splitValid ? 'text-[rgba(var(--rgb-savings),0.7)]' : 'text-[rgba(var(--rgb-warning),0.7)]')}>
              Total: {totalSplit.toFixed(0)}%
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setEditingSplits(false); setSplitsError('') }}
                className="flex-1 py-3 rounded-xl border border-[rgba(var(--fg),0.06)] text-[rgba(var(--fg),0.60)] text-sm font-medium transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSplits}
                className="flex-1 py-3 rounded-xl bg-[rgba(var(--fg),0.9)] text-[var(--btn-primary-text)] text-sm font-semibold active:scale-[0.98] transition-all"
              >
                Save Split
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage */}
      <div className="px-6 pt-5 pb-0">
        <p className="section-label mb-3">Manage</p>
      </div>
      <div className="border-t border-[rgba(var(--fg),0.05)]">
        <button
          onClick={() => navigate('/manage-categories')}
          className="flex items-center gap-4 w-full px-6 py-4 border-b border-[rgba(var(--fg),0.05)] active:bg-[rgba(var(--fg),0.02)] transition-colors"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[rgba(var(--fg),0.04)]">
            <Tag size={14} strokeWidth={1.5} className="text-[rgba(var(--fg),0.65)]" />
          </div>
          <span className="flex-1 text-[rgba(var(--fg),0.65)] text-[13px] font-medium text-left">Categories</span>
          <ChevronRight size={14} strokeWidth={1.5} className="text-[rgba(var(--fg),0.50)]" />
        </button>
        <button
          onClick={() => navigate('/stats')}
          className="flex items-center gap-4 w-full px-6 py-4 border-b border-[rgba(var(--fg),0.05)] active:bg-[rgba(var(--fg),0.02)] transition-colors"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[rgba(var(--fg),0.04)]">
            <BarChart2 size={14} strokeWidth={1.5} className="text-[rgba(var(--fg),0.65)]" />
          </div>
          <span className="flex-1 text-[rgba(var(--fg),0.65)] text-[13px] font-medium text-left">Lifetime Stats</span>
          <ChevronRight size={14} strokeWidth={1.5} className="text-[rgba(var(--fg),0.50)]" />
        </button>
      </div>

      {/* Data */}
      <div className="px-6 pt-5 pb-0">
        <p className="section-label mb-3">Data</p>
      </div>
      <div className="border-t border-[rgba(var(--fg),0.05)]">
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-4 w-full px-6 py-4 border-b border-[rgba(var(--fg),0.05)] active:bg-[rgba(var(--fg),0.02)] transition-colors"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[rgba(var(--fg),0.04)]">
            <Download size={14} strokeWidth={1.5} className="text-[rgba(var(--fg),0.65)]" />
          </div>
          <span className="flex-1 text-[rgba(var(--fg),0.65)] text-[13px] font-medium text-left">Export as CSV</span>
        </button>
        <button
          onClick={handleClearData}
          className={cn(
            'flex items-center gap-4 w-full px-6 py-4 border-b border-[rgba(var(--fg),0.05)] transition-colors active:scale-[0.99]',
            clearConfirm ? 'bg-[rgba(var(--rgb-warning),0.07)]' : 'active:bg-[rgba(var(--fg),0.02)]'
          )}
        >
          <div className={cn(
            'flex items-center justify-center w-8 h-8 rounded-lg',
            clearConfirm ? 'bg-[rgba(var(--rgb-warning),0.12)]' : 'bg-[rgba(var(--fg),0.04)]'
          )}>
            <Trash2 size={14} strokeWidth={1.5} className={clearConfirm ? 'text-[rgba(var(--rgb-warning),0.8)]' : 'text-[rgba(var(--fg),0.65)]'} />
          </div>
          <span className={cn(
            'flex-1 text-[13px] font-medium text-left',
            clearConfirm ? 'text-[rgba(var(--rgb-warning),0.85)]' : 'text-[rgba(var(--fg),0.65)]'
          )}>
            {clearConfirm ? 'Tap again to delete all data' : 'Clear all data'}
          </span>
        </button>
      </div>

      {/* About */}
      <div className="px-6 pt-5 pb-0">
        <p className="section-label mb-3">About</p>
      </div>
      <div className="border-t border-[rgba(var(--fg),0.05)]">
        {[
          { label: 'Framework', value: '50/30/20 Rule' },
          { label: 'Storage', value: 'Local (IndexedDB)' },
          { label: 'Currency', value: 'Pakistani Rupee (Rs)' },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center px-6 py-3.5 border-b border-[rgba(var(--fg),0.05)]">
            <span className="text-[rgba(var(--fg),0.60)] text-[13px]">{label}</span>
            <span className="text-[rgba(var(--fg),0.6)] text-[13px]">{value}</span>
          </div>
        ))}
        <p className="px-6 py-4 text-[rgba(var(--fg),0.50)] text-xs">
          Your data stays on your device. Nothing is sent to any server.
        </p>
      </div>
    </div>
  )
}
