// sky.js
export function createSky(THREE) {
  // Big dome with a murky gradient
  const geo = new THREE.SphereGeometry(500, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      top:   { value: new THREE.Color(0x3b4250) },
      mid:   { value: new THREE.Color(0x2f3440) },
      bottom:{ value: new THREE.Color(0x1f232b) }
    },
    vertexShader: `
      varying vec3 vPos;
      void main(){
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
      }`,
    fragmentShader: `
      varying vec3 vPos;
      uniform vec3 top; uniform vec3 mid; uniform vec3 bottom;
      void main(){
        float h = normalize(vPos).y * 0.5 + 0.5;
        vec3 c = mix(bottom, mid, smoothstep(0.0,0.5,h));
        c = mix(c, top, smoothstep(0.5,1.0,h));
        gl_FragColor = vec4(c, 1.0);
      }`
  });
  const dome = new THREE.Mesh(geo, mat);
  return dome;
}