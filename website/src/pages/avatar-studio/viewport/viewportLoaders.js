let loaderModulesPromise

export function loadLoaderModules() {
  if (!loaderModulesPromise) {
    loaderModulesPromise = Promise.all([
      import('three/addons/loaders/GLTFLoader.js'),
      import('@pixiv/three-vrm'),
      import('three/addons/exporters/GLTFExporter.js'),
      import('three/addons/loaders/OBJLoader.js'),
      import('three/addons/loaders/FBXLoader.js'),
      import('three/addons/loaders/MTLLoader.js'),
    ]).then(([gltf, vrm, exporter, obj, fbx, mtl]) => ({
      GLTFLoader: gltf.GLTFLoader,
      VRMLoaderPlugin: vrm.VRMLoaderPlugin,
      GLTFExporter: exporter.GLTFExporter,
      OBJLoader: obj.OBJLoader,
      FBXLoader: fbx.FBXLoader,
      MTLLoader: mtl.MTLLoader,
    }))
  }
  return loaderModulesPromise
}
