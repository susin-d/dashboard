import { LoaderCircle } from 'lucide-react'

export function LoadingState({
  message,
  label,
  icon: Icon = LoaderCircle,
  size = 20,
  className = '',
}) {
  const text = label || message || 'Loading…'
  return (
    <div className={`loading-state ${className}`} role="status">
      <Icon size={size} className="loading-state-spinner" aria-hidden="true" />
      {text && <span className="loading-state-text">{text}</span>}
    </div>
  )
}
