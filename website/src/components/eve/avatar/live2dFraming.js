import { useCallback, useRef } from 'react'
import { clampUserPan, clampZoom } from './avatarConstants'

export function useLive2dFraming({ modelRef, sizeRef, baseScaleRef, zoomRef, panRef, onTransformChange }) {
  const rafRef = useRef(0)

  const applyTransform = useCallback(() => {
    const m = modelRef.current
    if (!m) return
    const { w, h } = sizeRef.current
    const safeZoom = clampZoom(zoomRef.current)
    const safePan = clampUserPan(panRef.current)
    try {
      m.scale.set(baseScaleRef.current * safeZoom)
      m.x = w / 2 + safePan.x
      m.y = h / 2 + safePan.y
    } catch {}
  }, [modelRef, sizeRef, baseScaleRef, zoomRef, panRef])

  const scheduleTransformEmit = useCallback(() => {
    if (rafRef.current) return
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = 0
      onTransformChange?.(
        clampUserPan(panRef.current),
        clampZoom(zoomRef.current),
      )
    })
  }, [onTransformChange, panRef, zoomRef])

  return { applyTransform, scheduleTransformEmit, rafRef }
}
