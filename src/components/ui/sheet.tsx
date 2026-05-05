import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface SheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

export function Sheet({ open, onClose, children }: SheetProps) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const startYRef = useRef(0)

  useEffect(() => {
    if (open) {
      setMounted(true)
      const raf = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(raf)
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 320)
      return () => clearTimeout(t)
    }
  }, [open])

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-[var(--bg-surface)] rounded-t-2xl transition-transform duration-300 ease-out ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
        onTouchStart={e => {
          startYRef.current = e.touches[0].clientY
        }}
        onTouchEnd={e => {
          if (e.changedTouches[0].clientY - startYRef.current > 72) onClose()
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[rgba(var(--fg),0.15)]" />
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}
