import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Target, ChevronDown, ChevronUp, Trash2, Edit2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { db } from '@/db/db'
import { addGoal, updateGoal, deleteGoal, computeGoalProgress, computeMonthlyRate, projectedCompletion } from '@/db/goals'
import type { Goal } from '@/db/db'
import { formatCurrency } from '@/lib/categories'
import { getIcon, GOAL_ICONS, PRESET_COLORS } from '@/lib/iconMap'
import { generateGoalsAdvicePrompt } from '@/lib/aiPrompt'

const DEFAULT_GOAL_COLORS = PRESET_COLORS.slice(0, 8)

function GoalForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Goal>
  onSave: (data: Omit<Goal, 'id' | 'createdAt' | 'completedAt'>) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [targetAmount, setTargetAmount] = useState(initial?.targetAmount ? String(initial.targetAmount) : '')
  const [targetDate, setTargetDate] = useState(initial?.targetDate ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? 'PiggyBank')
  const [color, setColor] = useState(initial?.color ?? '#10b981')

  const parsed = parseFloat(targetAmount)
  const canSave = name.trim().length > 0 && !isNaN(parsed) && parsed > 0

  return (
    <div className="flex flex-col gap-4 p-4 bg-slate-900 rounded-2xl">
      {/* Name */}
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Goal name (e.g. Emergency Fund)"
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-emerald-500"
      />

      {/* Amount */}
      <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
        <span className="text-slate-500 text-sm">Rs</span>
        <input
          type="text"
          inputMode="decimal"
          value={targetAmount}
          onChange={e => setTargetAmount(e.target.value.replace(/[^\d.]/g, ''))}
          placeholder="Target amount"
          className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 outline-none"
        />
      </div>

      {/* Date */}
      <input
        type="date"
        value={targetDate}
        onChange={e => setTargetDate(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-emerald-500"
      />
      <p className="text-xs text-slate-600 -mt-2">Target date is optional</p>

      {/* Icon picker */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Icon</p>
        <div className="grid grid-cols-6 gap-2">
          {GOAL_ICONS.map(name => {
            const Icon = getIcon(name)
            return (
              <button
                key={name}
                onClick={() => setIcon(name)}
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-xl border transition-all',
                  icon === name ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-800'
                )}
              >
                <Icon size={18} style={{ color: icon === name ? color : '#94a3b8' }} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Color picker */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Color</p>
        <div className="flex gap-2 flex-wrap">
          {DEFAULT_GOAL_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn(
                'w-8 h-8 rounded-full border-2 transition-all',
                color === c ? 'border-white scale-110' : 'border-transparent'
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-400 text-sm font-medium"
        >
          Cancel
        </button>
        <button
          onClick={() => canSave && onSave({ name: name.trim(), targetAmount: parsed, targetDate: targetDate || null, icon, color })}
          disabled={!canSave}
          className="flex-1 py-3 rounded-xl bg-emerald-500 text-slate-950 text-sm font-semibold disabled:opacity-40"
        >
          Save Goal
        </button>
      </div>
    </div>
  )
}

function ContributionModal({
  goal,
  onClose,
}: {
  goal: Goal
  onClose: () => void
}) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)

  const parsed = parseFloat(amount)
  const canSave = !isNaN(parsed) && parsed > 0

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    await db.expenses.add({
      amount: parsed,
      category: 'Other',
      note: note.trim() || goal.name,
      paymentMethod: 'Cash',
      date,
      type: 'savings',
      goalId: goal.id,
      createdAt: new Date().toISOString(),
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-[480px] bg-slate-900 rounded-t-2xl p-4 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-1" />
        <h3 className="text-base font-semibold text-slate-200 text-center">Add contribution to {goal.name}</h3>
        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
          <span className="text-slate-500 text-sm">Rs</span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
            placeholder="Amount"
            autoFocus
            className="flex-1 bg-transparent text-lg font-bold text-slate-200 placeholder:text-slate-600 outline-none"
          />
        </div>
        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 outline-none"
        />
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none"
        />
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="w-full py-3.5 rounded-xl bg-emerald-500 text-slate-950 font-semibold text-sm disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Log Contribution'}
        </button>
      </div>
    </div>
  )
}

function GoalCard({
  goal,
  allExpenses,
  onEdit,
  onDelete,
}: {
  goal: Goal
  allExpenses: import('@/db/db').Expense[]
  onEdit: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [showContrib, setShowContrib] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const Icon = getIcon(goal.icon)
  const current = useMemo(() => computeGoalProgress(goal.id, allExpenses), [goal.id, allExpenses])
  const monthlyRate = useMemo(() => computeMonthlyRate(goal.id, allExpenses), [goal.id, allExpenses])
  const projected = useMemo(() => projectedCompletion(goal, current, monthlyRate), [goal, current, monthlyRate])

  const pct = goal.targetAmount > 0 ? Math.min(100, (current / goal.targetAmount) * 100) : 0
  const done = current >= goal.targetAmount

  const linkedExpenses = useMemo(
    () => allExpenses.filter(e => e.goalId === goal.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10),
    [allExpenses, goal.id]
  )

  let trackingLabel = ''
  let trackingColor = 'text-slate-500'
  if (goal.targetDate && projected) {
    const deadline = new Date(goal.targetDate)
    const diffMs = deadline.getTime() - projected.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays >= 30) { trackingLabel = `Ahead by ~${Math.round(diffDays / 30)} month(s)`; trackingColor = 'text-emerald-400' }
    else if (diffDays >= -30) { trackingLabel = 'On track'; trackingColor = 'text-emerald-400' }
    else { trackingLabel = `Behind by ~${Math.round(-diffDays / 30)} month(s)`; trackingColor = 'text-amber-400' }
  } else if (projected) {
    const months = Math.ceil((projected.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))
    trackingLabel = `~${months} month${months !== 1 ? 's' : ''} to go`
    trackingColor = 'text-slate-400'
  }

  return (
    <>
      <div className="bg-slate-900 rounded-2xl overflow-hidden">
        <button
          className="flex items-center gap-3 w-full px-4 py-4 text-left active:bg-slate-800/50"
          onClick={() => setExpanded(v => !v)}
        >
          <div
            className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0"
            style={{ backgroundColor: `${goal.color}22` }}
          >
            <Icon size={20} style={{ color: goal.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-slate-200 truncate">{goal.name}</p>
              <span className="text-xs font-bold text-slate-300 ml-2 shrink-0">{Math.round(pct)}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: done ? '#10b981' : goal.color }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-slate-400">{formatCurrency(current)} of {formatCurrency(goal.targetAmount)}</span>
              {trackingLabel && <span className={`text-xs font-medium ${trackingColor}`}>{trackingLabel}</span>}
            </div>
          </div>
          <div className="shrink-0 ml-1 text-slate-600">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {expanded && (
          <div className="border-t border-slate-800 px-4 py-3 flex flex-col gap-3">
            {goal.targetDate && (
              <p className="text-xs text-slate-500">Target date: {goal.targetDate}</p>
            )}
            {monthlyRate > 0 && (
              <p className="text-xs text-slate-500">
                Monthly contributions: {formatCurrency(monthlyRate)} avg
                {projected && ` · Est. completion: ${projected.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`}
              </p>
            )}

            {linkedExpenses.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Recent contributions</p>
                <div className="flex flex-col gap-1">
                  {linkedExpenses.map(e => (
                    <div key={e.id} className="flex justify-between text-xs">
                      <span className="text-slate-400">{e.date.slice(5)} · {e.note || 'Contribution'}</span>
                      <span className="text-emerald-400 font-medium">{formatCurrency(e.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowContrib(true)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-semibold text-xs active:scale-95 transition-all"
              >
                + Add contribution
              </button>
              <button
                onClick={onEdit}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800 text-slate-400"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={() => {
                  if (!deleteConfirm) { setDeleteConfirm(true); setTimeout(() => setDeleteConfirm(false), 3000) }
                  else onDelete()
                }}
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-xl transition-all',
                  deleteConfirm ? 'bg-red-500 text-white' : 'bg-slate-800 text-red-400'
                )}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {showContrib && <ContributionModal goal={goal} onClose={() => setShowContrib(false)} />}
    </>
  )
}

export default function Goals() {
  const now = new Date()
  const [showAdd, setShowAdd] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [toastMsg, setToastMsg] = useState('')
  const [copying, setCopying] = useState(false)

  const goals = useLiveQuery(() => db.goals.orderBy('createdAt').toArray()) ?? []
  const allExpenses = useLiveQuery(() => db.expenses.toArray()) ?? []

  const totalSaved = useMemo(
    () => goals.reduce((sum, g) => sum + computeGoalProgress(g.id, allExpenses), 0),
    [goals, allExpenses]
  )

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  async function handleAIAdvice() {
    setCopying(true)
    try {
      const prompt = await generateGoalsAdvicePrompt(now.getFullYear(), now.getMonth() + 1)
      await navigator.clipboard.writeText(prompt)
      showToast('Copied! Paste into Claude.ai for personalized goals advice.')
    } catch {
      showToast('Could not copy — try again.')
    } finally {
      setCopying(false)
    }
  }

  async function handleAddGoal(data: Omit<Goal, 'id' | 'createdAt' | 'completedAt'>) {
    await addGoal(data)
    setShowAdd(false)
  }

  async function handleUpdateGoal(data: Omit<Goal, 'id' | 'createdAt' | 'completedAt'>) {
    if (!editingGoal) return
    await updateGoal(editingGoal.id, data)
    setEditingGoal(null)
  }

  async function handleDeleteGoal(id: number) {
    await deleteGoal(id)
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-5 pb-8 overflow-y-auto">
      {/* Header summary */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Your Goals</p>
          {goals.length > 0 && (
            <p className="text-sm text-slate-400 mt-0.5">
              {formatCurrency(totalSaved)} saved across {goals.length} goal{goals.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-semibold active:scale-95 transition-all"
          >
            <Plus size={14} strokeWidth={2.5} />
            New goal
          </button>
        )}
      </div>

      {/* Add / Edit form */}
      {showAdd && (
        <GoalForm onSave={handleAddGoal} onCancel={() => setShowAdd(false)} />
      )}
      {editingGoal && (
        <GoalForm
          initial={editingGoal}
          onSave={handleUpdateGoal}
          onCancel={() => setEditingGoal(null)}
        />
      )}

      {/* Empty state */}
      {goals.length === 0 && !showAdd && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <Target size={32} className="text-emerald-400" />
          </div>
          <p className="text-slate-200 font-semibold">Set your first goal</p>
          <p className="text-sm text-slate-500 leading-relaxed">
            Saving Rs 1 today is a goal achieved tomorrow. Start small — an emergency fund, a gadget, a trip.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-2 px-6 py-3 rounded-xl bg-emerald-500 text-slate-950 font-semibold text-sm active:scale-95 transition-all"
          >
            Create a goal
          </button>
        </div>
      )}

      {/* Goal cards */}
      {goals.map(goal => (
        <GoalCard
          key={goal.id}
          goal={goal}
          allExpenses={allExpenses}
          onEdit={() => setEditingGoal(goal)}
          onDelete={() => handleDeleteGoal(goal.id)}
        />
      ))}

      {/* AI Goals Advice */}
      {goals.length > 0 && (
        <button
          onClick={handleAIAdvice}
          disabled={copying}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 text-emerald-400 font-semibold text-sm active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
        >
          <Sparkles size={16} />
          {copying ? 'Copying…' : '🪄 Get AI Goals Advice'}
        </button>
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium px-4 py-3 rounded-xl shadow-xl max-w-[300px] text-center">
          {toastMsg}
        </div>
      )}
    </div>
  )
}
