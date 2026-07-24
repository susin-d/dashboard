import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export function Modal({ isOpen, onClose, title, subtitle, children, className = '' }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isOpen && onClose) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal ${className}`} onClick={(e) => e.stopPropagation()}>
        {(title || onClose) && (
          <div className="modal-heading">
            <div>
              {subtitle && <p>{subtitle}</p>}
              {title && <h2>{title}</h2>}
            </div>
            {onClose && (
              <button
                type="button"
                className="icon-button"
                onClick={onClose}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}
