import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export function Modal({ isOpen, onClose, title, subtitle, children, className = '' }) {
  const modalRef = useRef(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!isOpen) return undefined

    const previouslyFocused = document.activeElement
    const appRoot = document.getElementById('root')
    const previousOverflow = document.body.style.overflow
    appRoot?.setAttribute('inert', '')
    document.body.style.overflow = 'hidden'

    const focusableSelector =
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const focusableElements = () =>
      Array.from(modalRef.current?.querySelectorAll(focusableSelector) ?? [])

    window.requestAnimationFrame(() => {
      const preferredFocus = modalRef.current?.querySelector('[data-modal-initial-focus]')
      ;(preferredFocus || focusableElements()[0] || modalRef.current)?.focus()
    })

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && onClose) {
        onClose()
      }
      if (event.key !== 'Tab') return

      const elements = focusableElements()
      if (!elements.length) {
        event.preventDefault()
        modalRef.current?.focus()
        return
      }

      const first = elements[0]
      const last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      appRoot?.removeAttribute('inert')
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus?.()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        ref={modalRef}
        className={`modal ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={subtitle ? descriptionId : undefined}
        data-dialog-managed="true"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        {(title || onClose) && (
          <div className="modal-heading">
            <div>
              {subtitle && <p id={descriptionId}>{subtitle}</p>}
              {title && <h2 id={titleId}>{title}</h2>}
            </div>
            {onClose && (
              <button
                type="button"
                className="icon-button"
                onClick={onClose}
                aria-label="Close dialog"
                data-modal-initial-focus
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
