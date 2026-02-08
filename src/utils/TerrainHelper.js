import * as THREE from 'three';

export class TerrainHelper {
    /**
     * Generates a plane geometry with modified height and vertex colors.
     * @param {number} size - Width and height of the plane.
     * @param {number} segments - Number of segments (resolution).
     * @param {function(x, y): number} heightFn - Function returning height for (x, y). x, y are in local plane coordinates.
     * @param {function(x, y, height, slope): THREE.Color} colorFn - Function returning color. Slope is 0 (flat) to 1 (vertical).
     * @returns {{geometry: THREE.PlaneGeometry, heightData: Float32Array}}
     */
    static generate(size, segments, heightFn, colorFn) {
        const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
        const count = geometry.attributes.position.count;

        // Add color attribute
        geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));

        const pos = geometry.attributes.position;
        const col = geometry.attributes.color;
        const heightData = new Float32Array(count);

        // Pass 1: Set Heights
        for (let i = 0; i < count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i);

            const h = heightFn(x, y);
            pos.setZ(i, h);
            heightData[i] = h;
        }

        // Compute Normals (needed for slope)
        geometry.computeVertexNormals();

        // Pass 2: Set Colors
        const normals = geometry.attributes.normal;

        for (let i = 0; i < count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i);
            const h = heightData[i];

            const nz = normals.getZ(i); // Local Z normal is "Up" in world after rotation
            const slope = 1.0 - nz; // 0 = flat, 1 = vertical wall

            const c = colorFn(x, y, h, slope);
            col.setXYZ(i, c.r, c.g, c.b);
        }

        return { geometry, heightData };
    }

    /**
     * Gets the interpolated height at the given World coordinates.
     * Assumes the mesh is rotated -90 degrees around X.
     * @param {number} x - World X
     * @param {number} z - World Z
     * @param {Float32Array} heightData - Height data from generate()
     * @param {number} size - Size of the terrain
     * @param {number} segments - Resolution of the terrain
     * @returns {number} Interpolated height
     */
    static getHeightAt(x, z, heightData, size, segments) {
        // Transform World X, Z to Grid Coordinates (u, v)
        // u = (x / size) + 0.5  [0..1]
        // v = (z / size) + 0.5  [0..1]

        const u = (x / size) + 0.5;
        const v = (z / size) + 0.5;

        if (u < 0 || u > 1 || v < 0 || v > 1) return 0; // Out of bounds

        const gridX = segments;
        const gridY = segments;
        const gridX1 = gridX + 1; // Vertices per row

        // Float indices
        const col = u * gridX;
        const row = v * gridY;

        let x1 = Math.floor(col);
        let z1 = Math.floor(row);

        // Clamp to valid range (handle edges u=1 or v=1)
        if (x1 >= gridX) x1 = gridX - 1;
        if (z1 >= gridY) z1 = gridY - 1;

        const x2 = x1 + 1;
        const z2 = z1 + 1;

        // Fractional part
        const dx = col - x1;
        const dz = row - z1;

        const i11 = z1 * gridX1 + x1;
        const i12 = z1 * gridX1 + x2;
        const i21 = z2 * gridX1 + x1;
        const i22 = z2 * gridX1 + x2;

        // Safety check for array bounds
        if (i22 >= heightData.length) return heightData[heightData.length - 1];

        const h11 = heightData[i11];
        const h12 = heightData[i12];
        const h21 = heightData[i21];
        const h22 = heightData[i22];

        // Bilinear Interpolation
        return (h11 * (1 - dx) + h12 * dx) * (1 - dz) +
               (h21 * (1 - dx) + h22 * dx) * dz;
    }
}
