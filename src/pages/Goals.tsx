import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Target, ChevronDown, ChevronUp, Trash2, Edit2, Sparkles, Check } from 'lucide-react'
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
    <div className="flex flex-col gap-0 border-t border-[rgba(var(--fg),0.05)]">
      <h3 className="text-[rgba(var(--fg),0.70)] text-xs font-semibold uppercase tracking-widest text-center py-4 border-b border-[rgba(var(--fg),0.05)]">
        {initial?.name ? 'Edit Goal' : 'New Goal'}
      </h3>

      {/* Name */}
      <div className="px-6 py-4 border-b border-[rgba(var(--fg),0.05)]">
        <p className="section-label mb-2">Name</p>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Emergency Fund"
          className="w-full bg-transparent border border-[rgba(var(--fg),0.07)] rounded-xl px-4 py-3 text-sm text-[rgba(var(--fg),0.75)] placeholder:text-[rgba(var(--fg),0.15)] outline-none focus:border-[rgba(var(--fg),0.18)] transition-colors"
        />
      </div>

      {/* Amount */}
      <div className="px-6 py-4 border-b border-[rgba(var(--fg),0.05)]">
        <p className="section-label mb-2">Target amount</p>
        <div className="flex items-center gap-2 border border-[rgba(var(--fg),0.07)] rounded-xl px-4 py-3 focus-within:border-[rgba(var(--fg),0.18)] transition-colors">
          <span className="text-[rgba(var(--fg),0.70)] text-sm">Rs</span>
          <input
            type="text"
            inputMode="decimal"
            value={targetAmount}
            onChange={e => setTargetAmount(e.target.value.replace(/[^\d.]/g, ''))}
            placeholder="0"
            className="flex-1 bg-transparent text-sm text-[rgba(var(--fg),0.75)] placeholder:text-[rgba(var(--fg),0.15)] outline-none tabular"
          />
        </div>
      </div>

      {/* Date */}
      <div className="px-6 py-4 border-b border-[rgba(var(--fg),0.05)]">
        <p className="section-label mb-2">Target date <span className="normal-case font-normal text-[rgba(var(--fg),0.50)]">(optional)</span></p>
        <input
          type="date"
          value={targetDate}
          onChange={e => setTargetDate(e.target.value)}
          className="w-full bg-transparent border border-[rgba(var(--fg),0.07)] rounded-xl px-4 py-3 text-sm text-[rgba(var(--fg),0.6)] outline-none focus:border-[rgba(var(--fg),0.18)] transition-colors"
        />
      </div>

      {/* Icon picker */}
      <div className="px-6 py-4 border-b border-[rgba(var(--fg),0.05)]">
        <p className="section-label mb-3">Icon</p>
        <div className="grid grid-cols-6 gap-2">
          {GOAL_ICONS.map(iconName => {
            const Icon = getIcon(iconName)
            const selected = icon === iconName
            return (
              <button
                key={iconName}
                onClick={() => setIcon(iconName)}
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-xl border transition-all',
                  selected
                    ? 'border-[rgba(var(--fg),0.2)] bg-[rgba(var(--fg),0.05)]'
                    : 'border-[rgba(var(--fg),0.06)] bg-transparent'
                )}
              >
                <Icon size={16} strokeWidth={1.5} style={{ color: selected ? color : 'rgba(var(--fg),0.3)' }} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Color picker */}
      <div className="px-6 py-4 border-b border-[rgba(var(--fg),0.05)]">
        <p className="section-label mb-3">Color</p>
        <div className="flex gap-2.5 flex-wrap">
          {DEFAULT_GOAL_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="relative w-7 h-7 rounded-full transition-all active:scale-95"
              style={{ backgroundColor: c }}
            >
              {color === c && (
                <Check size={12} className="absolute inset-0 m-auto text-[var(--btn-primary-text)]" strokeWidth={2.5} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 px-6 py-4">
        <button
          onClick={onCancel}
          className="flex-1 py-3.5 rounded-xl border border-[rgba(var(--fg),0.06)] text-[rgba(var(--fg),0.60)] text-sm font-semibold transition-all active:scale-[0.98]"
        >
          Cancel
        </button>
        <button
          onClick={() => canSave && onSave({ name: name.trim(), targetAmount: parsed, targetDate: targetDate || null, icon, color })}
          disabled={!canSave}
          className="flex-1 py-3.5 rounded-xl bg-[rgba(var(--fg),0.9)] text-[var(--btn-primary-text)] text-sm font-semibold disabled:opacity-25 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
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
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-[480px] bg-[var(--bg-surface)] rounded-t-2xl flex flex-col pb-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-8 h-[3px] bg-[rgba(var(--fg),0.12)] rounded-full mx-auto mt-3 mb-1" />
        <p className="text-[rgba(var(--fg),0.70)] text-xs font-semibold uppercase tracking-widest text-center py-3 border-b border-[rgba(var(--fg),0.05)]">
          Contribute to {goal.name}
        </p>

        {/* Amount */}
        <div className="flex flex-col items-center py-6 border-b border-[rgba(var(--fg),0.05)]">
          <div className="flex items-baseline gap-2">
            <span className="text-[rgba(var(--fg),0.70)] text-xl font-light">Rs</span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="0"
              autoFocus
              className="bg-transparent text-[44px] font-[800] text-[rgba(var(--fg),0.93)] outline-none text-center placeholder:text-[rgba(var(--fg),0.1)] tracking-[-2px] tabular min-w-[2ch]"
              style={{ width: `${Math.max(2, amount.length + 1)}ch` }}
            />
          </div>
        </div>

        {/* Note */}
        <div className="px-6 py-4 border-b border-[rgba(var(--fg),0.05)]">
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="w-full bg-transparent border border-[rgba(var(--fg),0.07)] rounded-xl px-4 py-3 text-sm text-[rgba(var(--fg),0.6)] placeholder:text-[rgba(var(--fg),0.15)] outline-none focus:border-[rgba(var(--fg),0.18)] transition-colors"
          />
        </div>

        {/* Date */}
        <div className="px-6 py-4 border-b border-[rgba(var(--fg),0.05)]">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full bg-transparent border border-[rgba(var(--fg),0.07)] rounded-xl px-4 py-3 text-sm text-[rgba(var(--fg),0.6)] outline-none focus:border-[rgba(var(--fg),0.18)] transition-colors"
          />
        </div>

        {/* Save */}
        <div className="px-6 pt-4">
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="w-full py-4 rounded-2xl bg-[rgba(var(--fg),0.9)] text-[var(--btn-primary-text)] font-semibold text-sm disabled:opacity-25 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
          >
            {saving ? 'Saving…' : 'Log Contribution'}
          </button>
        </div>
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
    () => allExpenses.filter(e => e.goalId === goal.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [allExpenses, goal.id]
  )

  let trackingLabel = ''
  let trackingColor = 'rgba(var(--fg),0.35)'
  if (goal.targetDate && projected) {
    const deadline = new Date(goal.targetDate)
    const diffDays = Math.round((deadline.getTime() - projected.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays >= 30) { trackingLabel = `Ahead ~${Math.round(diffDays / 30)}mo`; trackingColor = 'rgba(var(--rgb-savings),0.75)' }
    else if (diffDays >= -30) { trackingLabel = 'On track'; trackingColor = 'rgba(var(--rgb-savings),0.75)' }
    else { trackingLabel = `Behind ~${Math.round(-diffDays / 30)}mo`; trackingColor = 'rgba(var(--rgb-amber),0.75)' }
  } else if (projected) {
    const months = Math.ceil((projected.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))
    trackingLabel = `~${months}mo to go`
  }

  return (
    <>
      <div className="border-b border-[rgba(var(--fg),0.05)]">
        <button
          className="flex items-center gap-4 w-full px-6 py-4 text-left active:bg-[rgba(var(--fg),0.01)] transition-colors"
          onClick={() => setExpanded(v => !v)}
        >
          <div
            className="flex items-center justify-center w-10 h-10 rounded-[10px] shrink-0"
            style={{ backgroundColor: `${goal.color}14` }}
          >
            <Icon size={18} strokeWidth={1.5} style={{ color: `${goal.color}CC` }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <p className="text-[rgba(var(--fg),0.78)] text-[13px] font-medium truncate">{goal.name}</p>
              <span className="text-[rgba(var(--fg),0.60)] text-[11px] tabular shrink-0">{Math.round(pct)}%</span>
            </div>
            <div className="h-[2px] bg-[rgba(var(--fg),0.05)] rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: done ? 'rgba(var(--rgb-savings),0.75)' : goal.color }}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[rgba(var(--fg),0.60)] text-[11px] tabular">
                {formatCurrency(current)} of {formatCurrency(goal.targetAmount)}
              </span>
              {trackingLabel && (
                <span className="text-[10px] font-medium" style={{ color: trackingColor }}>{trackingLabel}</span>
              )}
            </div>
          </div>

          <div className="shrink-0 text-[rgba(var(--fg),0.50)]">
            {expanded ? <ChevronUp size={14} strokeWidth={1.5} /> : <ChevronDown size={14} strokeWidth={1.5} />}
          </div>
        </button>

        {expanded && (
          <div className="border-t border-[rgba(var(--fg),0.05)]">
            {/* Stats */}
            {(goal.targetDate || monthlyRate > 0) && (
              <div className="px-6 py-3 border-b border-[rgba(var(--fg),0.05)]">
                {goal.targetDate && (
                  <p className="text-[rgba(var(--fg),0.60)] text-xs">Target date: {goal.targetDate}</p>
                )}
                {monthlyRate > 0 && (
                  <p className="text-[rgba(var(--fg),0.60)] text-xs mt-0.5">
                    Avg monthly: {formatCurrency(monthlyRate)}
                    {projected && ` · Est. done ${projected.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`}
                  </p>
                )}
              </div>
            )}

            {/* Recent contributions */}
            {linkedExpenses.length > 0 && (
              <div className="border-b border-[rgba(var(--fg),0.05)]">
                <div className="px-6 pt-3 pb-1">
                  <p className="section-label">Recent contributions</p>
                </div>
                {linkedExpenses.map(e => (
                  <div key={e.id} className="flex justify-between items-center px-6 py-2.5 border-b border-[rgba(var(--fg),0.03)]">
                    <span className="text-[rgba(var(--fg),0.60)] text-[11px]">{e.date.slice(5)} · {e.note || 'Contribution'}</span>
                    <span className="text-[rgba(var(--rgb-savings),0.7)] text-[11px] font-medium tabular">{formatCurrency(e.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 px-6 py-3">
              <button
                onClick={() => setShowContrib(true)}
                className="flex-1 py-2.5 rounded-xl bg-[rgba(var(--fg),0.9)] text-[var(--btn-primary-text)] font-semibold text-xs active:scale-[0.98] transition-all"
              >
                + Contribute
              </button>
              <button
                onClick={onEdit}
                className="flex items-center justify-center w-10 h-10 rounded-xl border border-[rgba(var(--fg),0.06)] text-[rgba(var(--fg),0.60)] active:bg-[rgba(var(--fg),0.03)] transition-all"
              >
                <Edit2 size={13} strokeWidth={1.5} />
              </button>
              <button
                onClick={() => {
                  if (!deleteConfirm) { setDeleteConfirm(true); setTimeout(() => setDeleteConfirm(false), 3000) }
                  else onDelete()
                }}
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-xl border transition-all active:scale-[0.98]',
                  deleteConfirm
                    ? 'border-[rgba(var(--rgb-warning),0.3)] bg-[rgba(var(--rgb-warning),0.1)] text-[rgba(var(--rgb-warning),0.8)]'
                    : 'border-[rgba(var(--fg),0.06)] text-[rgba(var(--fg),0.70)]'
                )}
              >
                <Trash2 size={13} strokeWidth={1.5} />
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
    <div className="flex flex-col overflow-y-auto">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-0">
        <p className="text-[rgba(var(--fg),0.85)] text-[20px] font-[700] tracking-[-0.8px]">Goals</p>
        <div className="flex items-center gap-3">
          {goals.length > 0 && (
            <button
              onClick={handleAIAdvice}
              disabled={copying}
              className="flex items-center gap-1.5 text-[rgba(var(--fg),0.60)] text-xs font-medium disabled:opacity-50 active:text-[rgba(var(--fg),0.55)] transition-colors"
            >
              <Sparkles size={12} strokeWidth={1.5} />
              {copying ? 'Copying…' : 'AI Advice ↗'}
            </button>
          )}
          {!showAdd && !editingGoal && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center justify-center w-7 h-7 rounded-full bg-[rgba(var(--fg),0.07)] text-[rgba(var(--fg),0.5)] active:bg-[rgba(var(--fg),0.1)] transition-colors"
              aria-label="New goal"
            >
              <Plus size={14} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      {goals.length > 0 && !showAdd && !editingGoal && (
        <div className="px-6 pt-5 pb-6">
          <p className="section-label mb-2">Total saved</p>
          <p className="hero-amount">{formatCurrency(totalSaved)}</p>
          <p className="text-[rgba(var(--fg),0.70)] text-xs mt-1.5">
            across {goals.length} goal{goals.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      <div className="h-px bg-[rgba(var(--fg),0.05)]" />

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
        <div className="flex flex-col items-center justify-center py-20 gap-4 px-8 text-center">
          <div
            className="flex items-center justify-center w-14 h-14 rounded-2xl"
            style={{ backgroundColor: 'rgba(var(--rgb-savings),0.07)' }}
          >
            <Target size={24} strokeWidth={1.5} style={{ color: 'rgba(var(--rgb-savings),0.5)' }} />
          </div>
          <div>
            <p className="text-[rgba(var(--fg),0.6)] text-sm font-medium mb-1.5">Set your first goal</p>
            <p className="text-[rgba(var(--fg),0.70)] text-xs leading-relaxed">
              An emergency fund, a gadget, a trip. Start small — every rupee counts.
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-1 px-6 py-3 rounded-2xl bg-[rgba(var(--fg),0.9)] text-[var(--btn-primary-text)] font-semibold text-sm active:scale-[0.98] transition-all"
          >
            Create a goal
          </button>
        </div>
      )}

      {/* Goal list */}
      {!showAdd && !editingGoal && goals.map(goal => (
        <GoalCard
          key={goal.id}
          goal={goal}
          allExpenses={allExpenses}
          onEdit={() => setEditingGoal(goal)}
          onDelete={() => handleDeleteGoal(goal.id)}
        />
      ))}

      <div className="h-8" />

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[var(--bg-elevated)] border border-[rgba(var(--fg),0.08)] text-[rgba(var(--fg),0.7)] text-xs font-medium px-4 py-3 rounded-xl shadow-xl max-w-[300px] text-center">
          {toastMsg}
        </div>
      )}
    </div>
  )
}
