import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Download, Trash2, Tag, BarChart2 } from 'lucide-react'
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

function clamp(n: number) {
  return Math.max(0, Math.min(100, n))
}

export default function Settings() {
  const navigate = useNavigate()
  const [income, setIncome] = useState('')
  const [splits, setSplits] = useState<BudgetSplits>({ needs: 50, wants: 30, savings: 20 })
  const [showCustom, setShowCustom] = useState(false)
  const [splitsError, setSplitsError] = useState('')
  const [clearConfirm, setClearConfirm] = useState(false)
  const [saved, setSaved] = useState(false)

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
    if (incomeValid) {
      setMonthlyIncome(parsedIncome)
      flash()
    }
  }

  function handleSaveSplits() {
    if (!splitValid) {
      setSplitsError(`Percentages must sum to 100 (currently ${totalSplit.toFixed(0)})`)
      return
    }
    setBudgetSplits(splits)
    flash()
  }

  function flash() {
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
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
    <div className="flex flex-col gap-5 px-4 py-5 pb-8 overflow-y-auto">

      {/* Income */}
      <section>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Monthly Income</p>
        <div className="bg-slate-900 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-lg font-light">Rs</span>
            <input
              type="text"
              inputMode="decimal"
              value={income}
              onChange={e => setIncome(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="0"
              className="flex-1 bg-transparent text-2xl font-bold text-slate-100 outline-none placeholder:text-slate-700"
            />
          </div>
          {targets && (
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Needs {splits.needs}%</span>
                <span className="text-xs text-slate-300 font-medium">{formatCurrency(targets.needs)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">Wants {splits.wants}%</span>
                <span className="text-xs text-slate-300 font-medium">{formatCurrency(targets.wants)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Savings {splits.savings}%</span>
                <span className="text-xs text-slate-300 font-medium">{formatCurrency(targets.savings)}</span>
              </div>
            </div>
          )}
          <button
            onClick={handleSaveIncome}
            disabled={!incomeValid}
            className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-semibold text-sm disabled:opacity-35 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            {saved ? 'Saved!' : 'Save Income'}
          </button>
        </div>
      </section>

      {/* Budget splits */}
      <section>
        <button
          onClick={() => setShowCustom(v => !v)}
          className="flex items-center justify-between w-full mb-3"
        >
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Budget Split</p>
          {showCustom ? (
            <ChevronUp size={14} className="text-slate-500" />
          ) : (
            <ChevronDown size={14} className="text-slate-500" />
          )}
        </button>

        {!showCustom && (
          <div className="flex bg-slate-900 rounded-2xl overflow-hidden">
            {[
              { label: 'Needs', pct: splits.needs, color: '#3b82f6' },
              { label: 'Wants', pct: splits.wants, color: '#a855f7' },
              { label: 'Savings', pct: splits.savings, color: '#10b981' },
            ].map(({ label, pct, color }) => (
              <div
                key={label}
                className="flex-1 flex flex-col items-center py-4 gap-0.5"
                style={{ borderBottom: `3px solid ${color}` }}
              >
                <span className="text-xl font-bold text-slate-100">{pct}%</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>{label}</span>
              </div>
            ))}
          </div>
        )}

        {showCustom && (
          <div className="bg-slate-900 rounded-2xl p-4 flex flex-col gap-4">
            {(['needs', 'wants', 'savings'] as (keyof BudgetSplits)[]).map(key => {
              const colors: Record<keyof BudgetSplits, string> = {
                needs: 'text-blue-400',
                wants: 'text-purple-400',
                savings: 'text-emerald-400',
              }
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className={`text-xs font-semibold w-14 capitalize ${colors[key]}`}>{key}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={splits[key]}
                    onChange={e => handleSplitChange(key, e.target.value)}
                    className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-200 text-center outline-none focus:border-emerald-500"
                  />
                  <span className="text-slate-500 text-sm">%</span>
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, splits[key])}%`,
                        backgroundColor: key === 'needs' ? '#3b82f6' : key === 'wants' ? '#a855f7' : '#10b981',
                      }}
                    />
                  </div>
                </div>
              )
            })}

            <div className={`text-xs font-medium text-right ${splitValid ? 'text-emerald-400' : 'text-red-400'}`}>
              Total: {totalSplit.toFixed(0)}%
            </div>

            {splitsError && (
              <p className="text-xs text-red-400">{splitsError}</p>
            )}

            <button
              onClick={handleSaveSplits}
              className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-semibold text-sm transition-all active:scale-[0.98]"
            >
              {saved ? 'Saved!' : 'Save Split'}
            </button>
          </div>
        )}
      </section>

      {/* Manage */}
      <section>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Manage</p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => navigate('/manage-categories')}
            className="flex items-center gap-3 px-4 py-3.5 bg-slate-900 rounded-xl text-slate-200 text-sm font-medium active:scale-[0.98] transition-all"
          >
            <Tag size={16} className="text-emerald-400 shrink-0" />
            Manage Categories
          </button>
          <button
            onClick={() => navigate('/stats')}
            className="flex items-center gap-3 px-4 py-3.5 bg-slate-900 rounded-xl text-slate-200 text-sm font-medium active:scale-[0.98] transition-all"
          >
            <BarChart2 size={16} className="text-emerald-400 shrink-0" />
            Lifetime Stats
          </button>
        </div>
      </section>

      {/* Data */}
      <section>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Data</p>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-3 px-4 py-3.5 bg-slate-900 rounded-xl text-slate-200 text-sm font-medium active:scale-[0.98] transition-all"
          >
            <Download size={16} className="text-emerald-400 shrink-0" />
            Export as CSV
          </button>
          <button
            onClick={handleClearData}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium active:scale-[0.98] transition-all ${
              clearConfirm ? 'bg-red-500 text-white' : 'bg-slate-900 text-red-400'
            }`}
          >
            <Trash2 size={16} className="shrink-0" />
            {clearConfirm ? 'Tap again to delete all data' : 'Clear all data'}
          </button>
        </div>
      </section>

      {/* About */}
      <section>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">About</p>
        <div className="bg-slate-900 rounded-2xl px-4 py-4 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Framework</span>
            <span className="text-sm text-slate-200">50/30/20 Rule</span>
          </div>
          <div className="h-px bg-slate-800" />
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Storage</span>
            <span className="text-sm text-slate-200">Local (IndexedDB)</span>
          </div>
          <div className="h-px bg-slate-800" />
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Currency</span>
            <span className="text-sm text-slate-200">Pakistani Rupee (Rs)</span>
          </div>
          <div className="h-px bg-slate-800" />
          <p className="text-xs text-slate-600 pt-1">
            Your data stays on your device. Nothing is sent to any server.
          </p>
        </div>
      </section>
    </div>
  )
}
