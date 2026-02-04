import { noise } from './Noise.js';

export function distortGeometry(geometry, scale = 1, amount = 0.1) {
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);

        // Simple 3D noise offset
        const d = noise(x * scale, y * scale, z * scale) * amount;

        // Apply distortion uniformly for now, or could bias towards normals
        pos.setX(i, x + d);
        pos.setY(i, y + d);
        pos.setZ(i, z + d);
    }
    geometry.computeVertexNormals();
    return geometry;
}
