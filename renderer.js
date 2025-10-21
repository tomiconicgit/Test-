// renderer.js
export function createRenderer(THREE, canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  r.setSize(innerWidth, innerHeight);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.0;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  return r;
}