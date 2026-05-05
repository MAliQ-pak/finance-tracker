import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronUp, ChevronDown, Trash2, Edit2, Plus, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
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
  const SelectedIcon = getIcon(icon)

  return (
    <div className="border-t border-[rgba(255,255,255,0.05)]">
      <h3 className="text-[rgba(255,255,255,0.55)] text-xs font-semibold uppercase tracking-widest text-center py-4 border-b border-[rgba(255,255,255,0.05)]">
        {initial?.label ? 'Edit Category' : 'New Category'}
      </h3>

      {/* Preview */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-[rgba(255,255,255,0.05)]">
        <div
          className="flex items-center justify-center w-9 h-9 rounded-[10px] shrink-0"
          style={{ backgroundColor: `${color}18` }}
        >
          <SelectedIcon size={16} strokeWidth={1.5} style={{ color }} />
        </div>
        <span className="text-[rgba(255,255,255,0.6)] text-[13px] font-medium">{label || 'Preview'}</span>
      </div>

      {/* Name */}
      <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.05)]">
        <p className="section-label mb-2">Name</p>
        <input
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="Category name"
          autoFocus
          className="w-full bg-transparent border border-[rgba(255,255,255,0.07)] rounded-xl px-4 py-3 text-sm text-[rgba(255,255,255,0.75)] placeholder:text-[rgba(255,255,255,0.15)] outline-none focus:border-[rgba(255,255,255,0.18)] transition-colors"
        />
      </div>

      {/* Color */}
      <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.05)]">
        <p className="section-label mb-3">Color</p>
        <div className="flex flex-wrap gap-2.5">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="relative w-7 h-7 rounded-full transition-all active:scale-95"
              style={{ backgroundColor: c }}
            >
              {color === c && (
                <Check size={12} className="absolute inset-0 m-auto text-[#080808]" strokeWidth={2.5} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Icon picker */}
      <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.05)]">
        <p className="section-label mb-3">Icon</p>
        <div className="grid grid-cols-7 gap-1.5 max-h-48 overflow-y-auto">
          {PICKER_ICONS.map(({ name, icon: Icon }) => {
            const selected = icon === name
            return (
              <button
                key={name}
                onClick={() => setIcon(name)}
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-xl border transition-all',
                  selected
                    ? 'border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.05)]'
                    : 'border-[rgba(255,255,255,0.06)] bg-transparent'
                )}
              >
                <Icon size={15} strokeWidth={1.5} style={{ color: selected ? color : 'rgba(255,255,255,0.3)' }} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 px-6 py-4">
        <button
          onClick={onCancel}
          className="flex-1 py-3.5 rounded-xl border border-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.3)] text-sm font-semibold transition-all active:scale-[0.98]"
        >
          Cancel
        </button>
        <button
          onClick={() => canSave && onSave({ label: label.trim(), icon, color })}
          disabled={!canSave}
          className="flex-1 py-3.5 rounded-xl bg-[rgba(255,255,255,0.9)] text-[#080808] text-sm font-semibold disabled:opacity-25 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
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
    <div className="flex items-center gap-3 px-6 py-3.5 border-b border-[rgba(255,255,255,0.05)]">
      <div
        className="flex items-center justify-center w-9 h-9 rounded-[10px] shrink-0"
        style={{ backgroundColor: `${cat.color}14` }}
      >
        <Icon size={15} strokeWidth={1.5} style={{ color: `${cat.color}CC` }} />
      </div>

      {renaming ? (
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={e => {
            if (e.key === 'Enter') handleRename()
            if (e.key === 'Escape') setRenaming(false)
          }}
          className="flex-1 bg-transparent border-b border-[rgba(255,255,255,0.18)] pb-0.5 text-[13px] text-[rgba(255,255,255,0.75)] outline-none"
          autoFocus
        />
      ) : (
        <span className="flex-1 text-[rgba(255,255,255,0.65)] text-[13px] font-medium min-w-0 truncate">{cat.label}</span>
      )}

      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className="flex items-center justify-center w-7 h-7 rounded-lg text-[rgba(255,255,255,0.2)] disabled:opacity-20 active:text-[rgba(255,255,255,0.5)]"
        >
          <ChevronUp size={13} strokeWidth={1.5} />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className="flex items-center justify-center w-7 h-7 rounded-lg text-[rgba(255,255,255,0.2)] disabled:opacity-20 active:text-[rgba(255,255,255,0.5)]"
        >
          <ChevronDown size={13} strokeWidth={1.5} />
        </button>

        {cat.isCustom && (
          <>
            <button
              onClick={() => {
                if (renaming) handleRename()
                else { setRenaming(true); setNewName(cat.label) }
              }}
              className="flex items-center justify-center w-7 h-7 rounded-lg text-[rgba(255,255,255,0.25)] active:text-[rgba(255,255,255,0.5)]"
            >
              {renaming ? <Check size={12} strokeWidth={2} className="text-[rgba(74,222,128,0.7)]" /> : <Edit2 size={12} strokeWidth={1.5} />}
            </button>
            <button
              onClick={() => onEdit()}
              className="flex items-center justify-center w-7 h-7 rounded-lg text-[rgba(255,255,255,0.25)] active:text-[rgba(255,255,255,0.5)]"
            >
              <Edit2 size={12} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => {
                if (!deleteConfirm) { setDeleteConfirm(true); setTimeout(() => setDeleteConfirm(false), 3000) }
                else onDelete()
              }}
              className={cn(
                'flex items-center justify-center w-7 h-7 rounded-lg transition-all',
                deleteConfirm ? 'text-[rgba(248,113,113,0.8)]' : 'text-[rgba(255,255,255,0.2)] active:text-[rgba(248,113,113,0.6)]'
              )}
            >
              <Trash2 size={12} strokeWidth={1.5} />
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
      // duplicate label
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
    <div className="flex flex-col overflow-y-auto pb-8">
      {/* Page header */}
      <div className="flex items-center gap-3 px-6 pt-5 pb-0">
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center justify-center w-8 h-8 -ml-1 rounded-full text-[rgba(255,255,255,0.35)] active:text-[rgba(255,255,255,0.6)] transition-colors"
        >
          <ChevronLeft size={18} strokeWidth={1.5} />
        </button>
        <p className="text-[rgba(255,255,255,0.85)] text-[20px] font-[700] tracking-[-0.8px] flex-1">Categories</p>
        {!showAdd && !editingCat && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center justify-center w-7 h-7 rounded-full bg-[rgba(255,255,255,0.07)] text-[rgba(255,255,255,0.5)] active:bg-[rgba(255,255,255,0.1)] transition-colors"
            aria-label="Add category"
          >
            <Plus size={14} strokeWidth={2} />
          </button>
        )}
      </div>

      <p className="px-6 pt-2 pb-5 text-[rgba(255,255,255,0.2)] text-xs leading-relaxed">
        Default categories can be reordered. Only custom categories can be renamed or deleted.
      </p>

      <div className="h-px bg-[rgba(255,255,255,0.05)]" />

      {/* Form */}
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

      {/* Category list */}
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
  )
}
