// Skydome.js — blue gradient sky with non-white horizon (prevents washout)
export function createSkydome() {
  const skyGeo = new THREE.SphereGeometry(500, 32, 15);

  const vertexShader = `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    uniform float offset;
    uniform float exponent;
    varying vec3 vWorldPosition;
    void main() {
      float h = normalize(vWorldPosition + offset).y;
      vec3 col = mix(bottomColor, topColor, pow(max(h, 0.0), exponent));
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const uniforms = {
    topColor: { value: new THREE.Color(0x5aa9ff) },    // mid sky blue
    bottomColor: { value: new THREE.Color(0xbfd3ff) }, // pale blue horizon (not white)
    offset: { value: 33 },
    exponent: { value: 0.7 }
  };

  const skyMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    side: THREE.BackSide
  });

  const skydome = new THREE.Mesh(skyGeo, skyMat);
  skydome.name = "skydome";
  return skydome;
}