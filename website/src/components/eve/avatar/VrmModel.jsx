import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm'

export function VrmModel({ url, mouthOpen = 0, lookAt = { x: 0, y: 0 }, isBlinking = false, emotion = 'idle', onReady, onError }) {
  const mountRef = useRef(null)
  const sceneRef = useRef(null)
  const rendererRef = useRef(null)
  const vrmRef = useRef(null)
  const rafRef = useRef(0)
  const mouthRef = useRef(0)
  const lookRef = useRef({ x: 0, y: 0 })
  const blinkRef = useRef(false)
  const emotionRef = useRef(emotion)
  const [status, setStatus] = useState('loading')
  const [loadError, setLoadError] = useState('')

  mouthRef.current = mouthOpen
  lookRef.current = lookAt
  blinkRef.current = isBlinking
  emotionRef.current = emotion

  const handleReady = useCallback(() => {
    setStatus('ready')
    onReady?.()
  }, [onReady])

  const handleFail = useCallback((message) => {
    setStatus('fallback')
    setLoadError(message || 'Could not load VRM')
    onError?.(message)
    // still signal ready so outer doesn't stay in timeout
    onReady?.()
  }, [onError, onReady])

  useEffect(() => {
    if (!mountRef.current) return undefined
    const mount = mountRef.current
    // Ensure mount has size even before layout (Avatar Studio preview 360px)
    const rect = mount.getBoundingClientRect()
    const width = Math.max(320, rect.width || mount.clientWidth || 320)
    const height = Math.max(240, rect.height || mount.clientHeight || 280)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)
    scene.background = null
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 20)
    camera.position.set(0, 1.35, 1.1)

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false })
    } catch {
      setStatus('fallback')
      handleReady()
      return undefined
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8))
    renderer.setSize(width, height)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    rendererRef.current = renderer
    // Clear any prior canvas
    mount.innerHTML = ''
    mount.appendChild(renderer.domElement)
    // Ensure canvas fills mount
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'

    const ambient = new THREE.HemisphereLight(0xffffff, 0x222222, 1.2)
    const dir = new THREE.DirectionalLight(0xffffff, 1.0)
    dir.position.set(1, 2, 2)
    scene.add(ambient, dir)

    // fallback procedural torso/head when no url
    const placeholder = new THREE.Group()
    const headGeo = new THREE.SphereGeometry(0.28, 24, 18)
    const headMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.7 })
    const head = new THREE.Mesh(headGeo, headMat)
    head.position.set(0, 1.45, 0)
    head.name = 'fallback-head'
    placeholder.add(head)
    scene.add(placeholder)

    const clock = new THREE.Clock()

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate)
      const delta = clock.getDelta()

      // VRM update
      const vrm = vrmRef.current
      if (vrm) {
        // mouth: map to VRM blendShapes (aa, ih, ee, oh) and jaw
        const mouth = THREE.MathUtils.clamp(mouthRef.current, 0, 1)
        // smooth
        vrm.expressionManager?.setValue('aa', mouth * 0.9)
        vrm.expressionManager?.setValue('oh', mouth * 0.35)
        // lookAt via VRM lookAt
        if (vrm.lookAt) {
          // head bone drives lookAt when VRM lookAt rig exists
          // approximate: rotate head via humanoid bone
          const headBone = vrm.humanoid?.getNormalizedBoneNode('head')
          if (headBone) {
            headBone.rotation.y = THREE.MathUtils.lerp(headBone.rotation.y, lookRef.current.x * 0.45, 0.08)
            headBone.rotation.x = THREE.MathUtils.lerp(headBone.rotation.x, -lookRef.current.y * 0.3, 0.08)
          }
          // blink
          vrm.expressionManager?.setValue('blink', blinkRef.current ? 1 : 0)
          vrm.expressionManager?.setValue('blinkLeft', blinkRef.current ? 1 : 0)
          vrm.expressionManager?.setValue('blinkRight', blinkRef.current ? 1 : 0)
        }
        // emotion → expression
        const emo = emotionRef.current
        if (emo === 'tool') {
          vrm.expressionManager?.setValue('happy', 0.35)
        } else if (emo === 'error') {
          vrm.expressionManager?.setValue('angry', 0.5)
        } else if (emo === 'thinking') {
          vrm.expressionManager?.setValue('relaxed', 0.4)
        }
        vrm.update(delta)
      } else {
        // fallback head bob + mouth scale morph
        const mouth = THREE.MathUtils.clamp(mouthRef.current, 0, 1)
        head.scale.y = 1 + mouth * 0.18
        head.scale.x = 1 - mouth * 0.06
        // subtle breathe when not speaking
        if (emotionRef.current === 'idle' && mouth < 0.05) {
          head.position.y = 1.45 + Math.sin(performance.now() * 0.0012) * 0.015
        }
        // look
        head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, lookRef.current.x * 0.35, 0.06)
        head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, -lookRef.current.y * 0.22, 0.06)
        // blink via scale
        const targetScaleY = blinkRef.current ? 0.08 : 1
        head.scale.y *= THREE.MathUtils.lerp(1, targetScaleY, blinkRef.current ? 0.9 : 0.12)
      }

      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      const w = mount.clientWidth || 320
      const h = mount.clientHeight || 240
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(mount)

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      try { mount.removeChild(renderer.domElement) } catch {}
      renderer.dispose()
      if (vrmRef.current) {
        VRMUtils.deepDispose(vrmRef.current.scene)
        vrmRef.current = null
      }
    }
  }, [])

  // load VRM/GLB when url changes
  useEffect(() => {
    if (!url) {
      setStatus('fallback')
      handleReady()
      return
    }
    // Bundled anime VRMs — fetch HEAD then load; fallback to CSS avatar if missing
    const bundled = ['/avatars/vrm/eve-mono.vrm', '/avatars/vrm/eve-duo.vrm', '/avatars/vrm/eve-anime.vrm', '/avatars/vrm/eve-mono.glb', '/avatars/vrm/eve-duo.glb']
    if (bundled.includes(url)) {
      fetch(url, { method: 'HEAD' }).then((r) => {
        if (!r.ok) {
          setStatus('fallback')
          handleReady()
        } else {
          doLoad(url)
        }
      }).catch(() => {
        setStatus('fallback')
        handleReady()
      })
      return
    }
    doLoad(url)

    function doLoad(targetUrl) {
      setStatus('loading')
      setLoadError('')
      const loader = new GLTFLoader()
      loader.register((parser) => new VRMLoaderPlugin(parser))
      loader.load(
        targetUrl,
        (gltf) => {
          const vrm = gltf.userData.vrm
          if (!vrm) {
            handleFail('Not a valid VRM — showing fallback')
            return
          }
          // optimize
          VRMUtils.removeUnnecessaryVertices(gltf.scene)
          VRMUtils.removeUnnecessaryJoints(gltf.scene)
          vrm.scene.rotation.y = Math.PI
          // add to scene
          const scene = sceneRef.current
          if (scene) {
            // remove placeholder head if present
            const ph = scene.getObjectByName('fallback-head')
            if (ph && ph.parent) ph.parent.remove(ph)
            scene.add(vrm.scene)
          }
          vrmRef.current = vrm
          handleReady()
        },
        undefined,
        (err) => {
          handleFail(err?.message || 'Failed to load VRM')
        },
      )
    }
  }, [handleFail, handleReady, url])

  if (status === 'fallback' && loadError) {
    // still render fallback canvas (mounted) but show badge
  }

  const showCssFallback = status !== 'ready'

  return (
    <div
      className={`eve-vrm-real is-${emotion} ${isBlinking ? 'is-blinking' : ''}`}
      data-testid="vrm-model"
      role="img"
      aria-label={`Eve VRM avatar, ${emotion}`}
      style={{
        width: '100%',
        height: '100%',
        minHeight: 220,
        position: 'relative',
        background: 'var(--bg-primary)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}
    >
      <div
        ref={mountRef}
        className="eve-vrm-mount"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', minHeight: 220, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'transparent', zIndex: showCssFallback ? 0 : 1 }}
      />
      {/* CSS procedural fallback — always visible until VRM ready, ensures the grey bar never appears empty */}
      {showCssFallback && (
        <div
          className={`eve-vrm-fallback is-${emotion} ${isBlinking ? 'is-blinking' : ''}`}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            background: 'var(--bg-primary)',
            '--mouth': String(Math.max(0, Math.min(1, mouthOpen))),
            '--look-x': String(lookAt.x),
            '--look-y': String(lookAt.y),
          }}
        >
          <div className="eve-vrm-head">
            <div className="eve-vrm-face">
              <div className="eve-vrm-eyes">
                <span className="eve-vrm-eye left" />
                <span className="eve-vrm-eye right" />
              </div>
              <div className="eve-vrm-mouth" />
              <div className="eve-vrm-blush" />
            </div>
            <div className="eve-vrm-hair" />
          </div>
          <div className="eve-vrm-body">
            <div className="eve-vrm-torso" />
          </div>
          <span className="eve-vrm-url" aria-hidden="true">{status === 'loading' ? 'Loading 3D — anime VRM 10MB…' : (loadError ? 'Fallback — CSS avatar' : 'Anime VRM ready')}</span>
        </div>
      )}
      {status === 'loading' && <span className="eve-vrm-badge" style={{ zIndex: 2 }}>Loading 3D…</span>}
      {status === 'fallback' && loadError && (
        <span className="eve-vrm-badge" title={loadError} style={{ zIndex: 2 }}>{loadError}</span>
      )}
    </div>
  )
}
