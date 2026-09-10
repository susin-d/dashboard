let vrmLoaderModules = null

export async function ensureVrmLoader() {
  if (!vrmLoaderModules) {
    const [{ GLTFLoader }, { VRMLoaderPlugin, VRMUtils }] = await Promise.all([
      import('three/addons/loaders/GLTFLoader.js'),
      import('@pixiv/three-vrm'),
    ])
    vrmLoaderModules = { GLTFLoader, VRMLoaderPlugin, VRMUtils }
  }
  return vrmLoaderModules
}

export const BASE_CAMERA_DISTANCE = 1.1
export const AUTO_ROTATE_SPEED = 0.35
export const EMOTION_EXPRESSION_KEYS = ['happy', 'angry', 'relaxed']
