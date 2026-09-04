import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Clock,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  NoToneMapping,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three'

// GLTF + VRM loader modules are only needed when a model URL actually loads —
// fetched on demand so the placeholder scene never pays for them. Cached at
// module scope across mounts.
let vrmLoaderModules = null

async function ensureVrmLoader() {
  if (!vrmLoaderModules) {
    const [{ GLTFLoader }, { VRMLoaderPlugin, VRMUtils }] = await Promise.all([
      import('three/addons/loaders/GLTFLoader.js'),
      import('@pixiv/three-vrm'),
    ])
    vrmLoaderModules = { GLTFLoader, VRMLoaderPlugin, VRMUtils }
  }
  return vrmLoaderModules
}

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

  // Mount effect owns the WebGL context for the component lifetime — it must
  // not re-run when parent callbacks change, so the latest handler is read
  // through a ref instead of being listed as an effect dependency.
  const readyRef = useRef(handleReady)
  readyRef.current = handleReady

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

    const scene = new Scene()
    scene.background = new Color(0x000000)
    scene.background = null
    sceneRef.current = scene

    const camera = new PerspectiveCamera(30, width / height, 0.1, 20)
    camera.position.set(0, 1.35, 1.1)

    let renderer
    try {
      // low-power + DPR 1.0 saves memory on low-end PCs
      renderer = new WebGLRenderer({ antialias: false, alpha: true, preserveDrawingBuffer: false, powerPreference: 'low-power' })
    } catch {
      setStatus('fallback')
      readyRef.current()
      return undefined
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.0))
    renderer.setSize(width, height)
    renderer.outputColorSpace = SRGBColorSpace
    renderer.toneMapping = NoToneMapping
    rendererRef.current = renderer
    mount.appendChild(renderer.domElement)
    // Ensure canvas fills mount
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'

    const ambient = new HemisphereLight(0xffffff, 0x222222, 1.2)
    const dir = new DirectionalLight(0xffffff, 1.0)
    dir.position.set(1, 2, 2)
    scene.add(ambient, dir)

    // fallback procedural torso/head when no url
    const placeholder = new Group()
    const headGeo = new SphereGeometry(0.28, 24, 18)
    const headMat = new MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.7 })
    const head = new Mesh(headGeo, headMat)
    head.position.set(0, 1.45, 0)
    head.name = 'fallback-head'
    placeholder.add(head)
    scene.add(placeholder)

    const clock = new Clock()

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate)
      const delta = clock.getDelta()

      // VRM update
      const vrm = vrmRef.current
      if (vrm) {
        // mouth: map to VRM blendShapes (aa, ih, ee, oh) and jaw
        const mouth = MathUtils.clamp(mouthRef.current, 0, 1)
        // smooth
        vrm.expressionManager?.setValue('aa', mouth * 0.9)
        vrm.expressionManager?.setValue('oh', mouth * 0.35)
        // lookAt via VRM lookAt
        if (vrm.lookAt) {
          // head bone drives lookAt when VRM lookAt rig exists
          // approximate: rotate head via humanoid bone
          const headBone = vrm.humanoid?.getNormalizedBoneNode('head')
          if (headBone) {
            headBone.rotation.y = MathUtils.lerp(headBone.rotation.y, lookRef.current.x * 0.45, 0.08)
            headBone.rotation.x = MathUtils.lerp(headBone.rotation.x, -lookRef.current.y * 0.3, 0.08)
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
        const mouth = MathUtils.clamp(mouthRef.current, 0, 1)
        head.scale.y = 1 + mouth * 0.18
        head.scale.x = 1 - mouth * 0.06
        // subtle breathe when not speaking
        if (emotionRef.current === 'idle' && mouth < 0.05) {
          head.position.y = 1.45 + Math.sin(performance.now() * 0.0012) * 0.015
        }
        // look
        head.rotation.y = MathUtils.lerp(head.rotation.y, lookRef.current.x * 0.35, 0.06)
        head.rotation.x = MathUtils.lerp(head.rotation.x, -lookRef.current.y * 0.22, 0.06)
        // blink via scale
        const targetScaleY = blinkRef.current ? 0.08 : 1
        head.scale.y *= MathUtils.lerp(1, targetScaleY, blinkRef.current ? 0.9 : 0.12)
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
        vrmLoaderModules?.VRMUtils?.deepDispose(vrmRef.current.scene)
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
    let cancelled = false
    // Bundled anime VRMs — fetch HEAD then load; fallback to CSS avatar if missing
    const bundled = ['/avatars/vrm/eve-mono.vrm', '/avatars/vrm/eve-duo.vrm', '/avatars/vrm/eve-anime.vrm', '/avatars/vrm/eve-mono.glb', '/avatars/vrm/eve-duo.glb']
    if (bundled.includes(url)) {
      fetch(url, { method: 'HEAD' }).then((r) => {
        if (cancelled) return
        if (!r.ok) {
          setStatus('fallback')
          handleReady()
        } else {
          doLoad(url)
        }
      }).catch(() => {
        if (cancelled) return
        setStatus('fallback')
        handleReady()
      })
      return () => { cancelled = true }
    }
    doLoad(url)
    return () => { cancelled = true }

    async function doLoad(targetUrl) {
      setStatus('loading')
      setLoadError('')
      let loaderMods
      try {
        loaderMods = await ensureVrmLoader()
      } catch {
        if (!cancelled) handleFail('Failed to load 3D runtime')
        return
      }
      if (cancelled) return
      const { GLTFLoader, VRMLoaderPlugin, VRMUtils } = loaderMods
      const loader = new GLTFLoader()
      loader.register((parser) => new VRMLoaderPlugin(parser))
      loader.load(
        targetUrl,
        (gltf) => {
          if (cancelled) return
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
          if (!cancelled) handleFail(err?.message || 'Failed to load VRM')
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
    >
      <div ref={mountRef} className="eve-vrm-mount" />
      {/* CSS procedural fallback — always visible until VRM ready, ensures the grey bar never appears empty */}
      {showCssFallback && (
        <div
          className={`eve-vrm-fallback is-${emotion} ${isBlinking ? 'is-blinking' : ''}`}
          style={{
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
      {status === 'loading' && <span className="eve-vrm-badge">Loading 3D…</span>}
      {status === 'fallback' && loadError && (
        <span className="eve-vrm-badge" title={loadError}>{loadError}</span>
      )}
    </div>
  )
}
