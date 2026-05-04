import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronUp, ChevronDown, Trash2, Edit2, Plus, Check, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { db } from '@/db/db'
import {
  addCategory,
  updateCategory,
  deleteCategory,
  renameCategoryLabel,
  moveCategoryUp,
  moveCategoryDown,
} from '@/db/categories'
import type { CategoryRecord } from '@/db/db'
import { getIcon, PICKER_ICONS, PRESET_COLORS } from '@/lib/iconMap'

function CategoryForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<CategoryRecord>
  onSave: (data: { label: string; icon: string; color: string }) => void
  onCancel: () => void
}) {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? 'ShoppingBag')
  const [color, setColor] = useState(initial?.color ?? '#10b981')

  const canSave = label.trim().length > 0

  return (
    <div className="flex flex-col gap-4 p-4 bg-slate-900 rounded-2xl border border-slate-800">
      <input
        type="text"
        value={label}
        onChange={e => setLabel(e.target.value)}
        placeholder="Category name"
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-emerald-500"
        autoFocus
      />

      {/* Color */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Color</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn('w-8 h-8 rounded-full border-2 transition-all', color === c ? 'border-white scale-110' : 'border-transparent')}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Icon picker */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Icon</p>
        <div className="grid grid-cols-7 gap-1.5 max-h-48 overflow-y-auto">
          {PICKER_ICONS.map(({ name, icon: Icon }) => (
            <button
              key={name}
              onClick={() => setIcon(name)}
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-xl border transition-all',
                icon === name ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-800'
              )}
            >
              <Icon size={16} style={{ color: icon === name ? color : '#64748b' }} />
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="flex items-center gap-3 px-3 py-2 bg-slate-800 rounded-xl">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg" style={{ backgroundColor: `${color}22` }}>
          {(() => { const Icon = getIcon(icon); return <Icon size={17} style={{ color }} /> })()}
        </div>
        <span className="text-sm font-medium text-slate-200">{label || 'Preview'}</span>
      </div>

      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-400 text-sm font-medium">
          Cancel
        </button>
        <button
          onClick={() => canSave && onSave({ label: label.trim(), icon, color })}
          disabled={!canSave}
          className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-sm font-semibold disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  )
}

function CategoryRow({
  cat,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
}: {
  cat: CategoryRecord
  isFirst: boolean
  isLast: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const Icon = getIcon(cat.icon)
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState(cat.label)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const handleRename = async () => {
    if (newName.trim() && newName.trim() !== cat.label) {
      try {
        await renameCategoryLabel(cat.id, newName.trim())
      } catch {
        // duplicate name — reset
      }
    }
    setRenaming(false)
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0" style={{ backgroundColor: `${cat.color}22` }}>
        <Icon size={16} style={{ color: cat.color }} />
      </div>

      {renaming ? (
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false) }}
          className="flex-1 bg-slate-800 border border-emerald-500 rounded-lg px-2 py-1 text-sm text-slate-200 outline-none"
          autoFocus
        />
      ) : (
        <span className="flex-1 text-sm font-medium text-slate-200 min-w-0 truncate">{cat.label}</span>
      )}

      <div className="flex items-center gap-1 shrink-0">
        {/* Reorder */}
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-600 disabled:opacity-30 hover:text-slate-300 active:text-slate-100"
        >
          <ChevronUp size={14} />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-600 disabled:opacity-30 hover:text-slate-300 active:text-slate-100"
        >
          <ChevronDown size={14} />
        </button>

        {/* Edit (custom only) */}
        {cat.isCustom && (
          <>
            <button
              onClick={() => { if (renaming) handleRename(); else { setRenaming(true); setNewName(cat.label) }}}
              className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200"
            >
              {renaming ? <Check size={13} className="text-emerald-400" /> : <Edit2 size={13} />}
            </button>
            <button
              onClick={() => onEdit()}
              className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200"
            >
              <Edit2 size={13} />
            </button>
            <button
              onClick={() => {
                if (!deleteConfirm) { setDeleteConfirm(true); setTimeout(() => setDeleteConfirm(false), 3000) }
                else onDelete()
              }}
              className={cn(
                'flex items-center justify-center w-7 h-7 rounded-lg transition-all',
                deleteConfirm ? 'bg-red-500 text-white' : 'text-red-400/60 hover:text-red-400'
              )}
            >
              {deleteConfirm ? <X size={13} /> : <Trash2 size={13} />}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function ManageCategories() {
  const navigate = useNavigate()
  const [showAdd, setShowAdd] = useState(false)
  const [editingCat, setEditingCat] = useState<CategoryRecord | null>(null)

  const categories = useLiveQuery(() => db.categories.orderBy('order').toArray()) ?? []

  async function handleAdd(data: { label: string; icon: string; color: string }) {
    try {
      await addCategory(data)
      setShowAdd(false)
    } catch {
      // duplicate label — silently ignore for now
    }
  }

  async function handleEdit(data: { label: string; icon: string; color: string }) {
    if (!editingCat) return
    if (data.label !== editingCat.label) {
      await renameCategoryLabel(editingCat.id, data.label)
    }
    await updateCategory(editingCat.id, { icon: data.icon, color: data.color })
    setEditingCat(null)
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-5 pb-8 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate('/settings')} className="text-xs text-slate-500 mb-1">← Settings</button>
          <h1 className="text-base font-semibold text-slate-200">Manage Categories</h1>
        </div>
        {!showAdd && !editingCat && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-semibold active:scale-95"
          >
            <Plus size={14} />
            Add
          </button>
        )}
      </div>

      <p className="text-xs text-slate-600 -mt-2">
        Default categories can be reordered. Only custom categories can be renamed or deleted.
        Deleting a custom category moves its expenses to "Other".
      </p>

      {showAdd && (
        <CategoryForm onSave={handleAdd} onCancel={() => setShowAdd(false)} />
      )}
      {editingCat && (
        <CategoryForm
          initial={editingCat}
          onSave={handleEdit}
          onCancel={() => setEditingCat(null)}
        />
      )}

      <div className="bg-slate-900 rounded-2xl divide-y divide-slate-800/60">
        {categories.map((cat, idx) => (
          <CategoryRow
            key={cat.id}
            cat={cat}
            isFirst={idx === 0}
            isLast={idx === categories.length - 1}
            onMoveUp={() => moveCategoryUp(cat.id)}
            onMoveDown={() => moveCategoryDown(cat.id)}
            onEdit={() => setEditingCat(cat)}
            onDelete={() => deleteCategory(cat.id)}
          />
        ))}
      </div>
    </div>
  )
}
