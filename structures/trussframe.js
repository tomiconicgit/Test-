// assets/structures/trussframe.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

export function createTrussBay({ w=12, d=12, h=6, t=0.5, wire=false } = {}){
  // Materials (PBR-ready placeholders)
  const matSteel = new THREE.MeshStandardMaterial({ name:'Steel', color:0x9aa4af, metalness:.85, roughness:.4, wireframe:wire });
  const matNode  = new THREE.MeshStandardMaterial({ name:'Node',  color:0x757f8a, metalness:.6,  roughness:.55, wireframe:wire });

  const group = new THREE.Group();

  // Node blocks at 8 corners (so beams end flush on faces)
  const nodeSize = Math.max(t*1.6, 0.3);     // cube size
  const ns = nodeSize;                        // alias
  const halfW = w/2, halfD = d/2;

  const nodeGeom = new THREE.BoxGeometry(ns, ns, ns);
  const nodes = [];
  const corners = [
    // bottom layer
    [-halfW, 0,      -halfD],
    [ halfW, 0,      -halfD],
    [-halfW, 0,       halfD],
    [ halfW, 0,       halfD],
    // top layer
    [-halfW, h,      -halfD],
    [ halfW, h,      -halfD],
    [-halfW, h,       halfD],
    [ halfW, h,       halfD],
  ];
  for (let i=0;i<corners.length;i++){
    const n = new THREE.Mesh(nodeGeom, matNode);
    n.position.set(corners[i][0], corners[i][1] + ns/2, corners[i][2]); // lift by half cube so bottom sits on y=0
    n.name = `Node_${i}`;
    n.castShadow = n.receiveShadow = true;
    group.add(n);
    nodes.push(n);
  }

  // Helper to make a rectangular beam that ends flush on node faces
  function beamBetween(a, b, thickness, material){
    // Use Z axis as the build axis, then rotate to direction
    const pa = a.getWorldPosition(new THREE.Vector3());
    const pb = b.getWorldPosition(new THREE.Vector3());
    const dir = new THREE.Vector3().subVectors(pb, pa);
    const fullLen = dir.length();
    // subtract one node size so each end sits flush on the node faces
    const len = Math.max(0.01, fullLen - ns);
    const geom = new THREE.BoxGeometry(thickness, thickness, len);
    const mesh = new THREE.Mesh(geom, material);
    const mid = new THREE.Vector3().addVectors(pa, pb).multiplyScalar(0.5);
    mesh.position.copy(mid);
    // orient Z to the vector
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), dir.clone().normalize());
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  }

  // Convenient accessor
  const N = (i)=>nodes[i];

  // Vertical legs (bottom node -> top node on same corner)
  group.add( beamBetween(N(0), N(4), t, matSteel) );
  group.add( beamBetween(N(1), N(5), t, matSteel) );
  group.add( beamBetween(N(2), N(6), t, matSteel) );
  group.add( beamBetween(N(3), N(7), t, matSteel) );

  // Bottom rectangle
  group.add( beamBetween(N(0), N(1), t, matSteel) );
  group.add( beamBetween(N(1), N(3), t, matSteel) );
  group.add( beamBetween(N(3), N(2), t, matSteel) );
  group.add( beamBetween(N(2), N(0), t, matSteel) );

  // Top rectangle
  group.add( beamBetween(N(4), N(5), t, matSteel) );
  group.add( beamBetween(N(5), N(7), t, matSteel) );
  group.add( beamBetween(N(7), N(6), t, matSteel) );
  group.add( beamBetween(N(6), N(4), t, matSteel) );

  // X bracing on all faces (bottom->top diagonals)
  // Front face (z = -halfD)
  group.add( beamBetween(N(0), N(5), t*0.8, matSteel) );
  group.add( beamBetween(N(1), N(4), t*0.8, matSteel) );
  // Back face (z = +halfD)
  group.add( beamBetween(N(2), N(7), t*0.8, matSteel) );
  group.add( beamBetween(N(3), N(6), t*0.8, matSteel) );
  // Left face (x = -halfW)
  group.add( beamBetween(N(0), N(6), t*0.8, matSteel) );
  group.add( beamBetween(N(2), N(4), t*0.8, matSteel) );
  // Right face (x = +halfW)
  group.add( beamBetween(N(1), N(7), t*0.8, matSteel) );
  group.add( beamBetween(N(3), N(5), t*0.8, matSteel) );

  // Drop the whole bay so the bottom nodes sit on y=0 (done above).
  group.traverse(o=>{ if(o.isMesh){ o.material.wireframe = wire ? true : o.material.wireframe; } });

  return group;
}