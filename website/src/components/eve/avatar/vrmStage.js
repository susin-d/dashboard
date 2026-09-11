import {
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  NoToneMapping,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three'
import { BASE_CAMERA_DISTANCE } from './vrmLoaders'

export function createVrmStage(mount) {
  const rect = mount.getBoundingClientRect()
  const width = Math.max(320, rect.width || mount.clientWidth || 320)
  const height = Math.max(240, rect.height || mount.clientHeight || 280)

  const scene = new Scene()
  scene.background = new Color(0x000000)
  scene.background = null

  const camera = new PerspectiveCamera(30, width / height, 0.1, 20)
  camera.position.set(0, 1.35, BASE_CAMERA_DISTANCE)

  // low-power + DPR 1.0 saves memory on low-end PCs
  const renderer = new WebGLRenderer({ antialias: false, alpha: true, preserveDrawingBuffer: false, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.0))
  renderer.setSize(width, height)
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = NoToneMapping
  mount.appendChild(renderer.domElement)
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  renderer.domElement.style.display = 'block'

  const ambient = new HemisphereLight(0xffffff, 0x222222, 1.2)
  const dir = new DirectionalLight(0xffffff, 1.0)
  dir.position.set(1, 2, 2)
  scene.add(ambient, dir)

  const placeholder = new Group()
  const headGeo = new SphereGeometry(0.28, 24, 18)
  const headMat = new MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.7 })
  const head = new Mesh(headGeo, headMat)
  head.position.set(0, 1.45, 0)
  head.name = 'fallback-head'
  placeholder.add(head)
  scene.add(placeholder)

  return { scene, camera, renderer, head, width, height }
}
