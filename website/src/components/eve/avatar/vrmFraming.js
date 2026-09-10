import { useCallback, useRef } from 'react'
import { clampUserPan, clampZoom } from './avatarConstants'
import { BASE_CAMERA_DISTANCE } from './vrmLoaders'

export function useVrmFraming({ cameraRef, userPanRef, zoomRef, onTransformChange }) {
  const transformRafRef = useRef(0)

  const applyFraming = useCallback(() => {
    const camera = cameraRef.current
    if (!camera) return
    const safeZoom = clampZoom(zoomRef.current)
    const safePan = clampUserPan(userPanRef.current)
    camera.position.x = safePan.x * 0.1
    camera.position.y = 1.35 + safePan.y * 0.1
    camera.position.z = BASE_CAMERA_DISTANCE / Math.max(0.1, safeZoom)
    camera.lookAt(0, 1.35, 0)
  }, [cameraRef, userPanRef, zoomRef])

  const scheduleTransformEmit = useCallback(() => {
    if (transformRafRef.current) return
    transformRafRef.current = window.requestAnimationFrame(() => {
      transformRafRef.current = 0
      onTransformChange?.(
        clampUserPan(userPanRef.current),
        clampZoom(zoomRef.current),
      )
    })
  }, [onTransformChange, userPanRef, zoomRef])

  return { applyFraming, scheduleTransformEmit, transformRafRef }
}
