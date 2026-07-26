import { Modal } from './Modal'

export function ConfirmDialog({ isOpen, title = 'Confirm action', message, onConfirm, onCancel }) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} subtitle="Please confirm">
      <p>{message}</p>
      <div className="modal-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
        <button type="button" className="primary-button" onClick={onConfirm}>Confirm</button>
      </div>
    </Modal>
  )
}
