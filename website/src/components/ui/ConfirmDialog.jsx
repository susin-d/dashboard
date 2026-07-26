import { Modal } from './Modal'

export function ConfirmDialog({
  isOpen,
  title = 'Confirm action',
  message,
  confirmLabel = 'Confirm',
  destructive = true,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} subtitle="Please confirm">
      <p>{message}</p>
      <div className="modal-actions">
        <button type="button" className="secondary-button" onClick={onCancel} data-modal-initial-focus>Cancel</button>
        <button
          type="button"
          className={destructive ? 'danger-button' : 'primary-button'}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
