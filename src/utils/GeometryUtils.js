import { noise } from './Noise.js';

export function distortGeometry(geometry, scale = 1, amount = 0.1) {
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);

        // Independent noise for each axis
        // Offsets (1000, 2000, 3000) are large enough to sample uncorrelated noise regions
        const nx = noise(x * scale, y * scale, z * scale);
        const ny = noise(x * scale + 1000, y * scale + 1000, z * scale + 1000);
        const nz = noise(x * scale + 2000, y * scale + 2000, z * scale + 2000);

        // Center distortion around 0 (-0.5 to 0.5)
        const dx = (nx - 0.5) * amount;
        const dy = (ny - 0.5) * amount;
        const dz = (nz - 0.5) * amount;

        pos.setX(i, x + dx);
        pos.setY(i, y + dy);
        pos.setZ(i, z + dz);
    }
    geometry.computeVertexNormals();
    return geometry;
}
