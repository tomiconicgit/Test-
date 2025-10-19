export function createSkydome() {
    const geometry = new THREE.SphereGeometry(500, 32, 32); // A large sphere
    const material = new THREE.MeshBasicMaterial({
        color: 0x87ceeb, // A nice sky blue
        side: THREE.BackSide // Render on the inside
    });
    const skydome = new THREE.Mesh(geometry, material);
    skydome.name = "skydome";
    return skydome;
}

