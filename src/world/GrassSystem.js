import * as THREE from 'three';
import { PoissonDiskSampling } from '../utils/PoissonDiskSampling.js';
import { TerrainHelper } from '../utils/TerrainHelper.js';

export class GrassSystem {
  constructor(scene, size, segments, heightFn, placementFn) {
    this.scene = scene;
    this.size = size;
    this.segments = segments;
    this.heightFn = heightFn;
    this.placementFn = placementFn;
    this.mesh = null;
    this.uniforms = {
      time: { value: 0 }
    };
  }

  generate() {
    // Geometry: Two intersecting planes (Quad)
    // 0.8 width, 0.8 height.
    const geometry = new THREE.PlaneGeometry(0.8, 0.8, 1, 4);
    geometry.translate(0, 0.4, 0); // Pivot at bottom

    const geo2 = geometry.clone();
    geo2.rotateY(Math.PI / 2);

    // Merge manually to avoid dependency on utils if not guaranteed
    const count1 = geometry.attributes.position.count;
    const count2 = geo2.attributes.position.count;
    const posArray = new Float32Array((count1 + count2) * 3);
    const uvArray = new Float32Array((count1 + count2) * 2);
    const indexArray = [];

    // Copy pos
    posArray.set(geometry.attributes.position.array, 0);
    posArray.set(geo2.attributes.position.array, count1 * 3);

    // Copy uv
    uvArray.set(geometry.attributes.uv.array, 0);
    uvArray.set(geo2.attributes.uv.array, count1 * 2);

    // Copy index
    const index1 = geometry.index;
    const index2 = geo2.index;
    for (let i = 0; i < index1.count; i++) indexArray.push(index1.getX(i));
    for (let i = 0; i < index2.count; i++) indexArray.push(index2.getX(i) + count1);

    const finalGeo = new THREE.BufferGeometry();
    finalGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    finalGeo.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
    finalGeo.setIndex(indexArray);
    finalGeo.computeVertexNormals();

    // Material with sway shader
    const material = new THREE.MeshStandardMaterial({
      color: 0x5da130,
      roughness: 1.0,
      side: THREE.DoubleSide,
      flatShading: false,
      vertexColors: true // Allow color variation
    });

    material.onBeforeCompile = (shader) => {
      shader.uniforms.time = this.uniforms.time;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `
        #include <common>
        uniform float time;
        `
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>

        // Simple wind sway
        // instanceMatrix[3] contains translation (x, y, z, 1)
        float worldX = instanceMatrix[3].x;
        float worldZ = instanceMatrix[3].z;

        float h = position.y; // 0 at bottom, ~1 at top (assuming height 1)

        // Organic Wind Sway
        float t = time;

        // Combine multiple sine waves for more natural movement
        // Low frequency base swell
        float swell = sin(t * 0.5 + worldX * 0.02 + worldZ * 0.01);

        // Higher frequency ripple
        float ripple = sin(t * 1.5 + worldX * 0.1 - worldZ * 0.05);

        // "Gust" effect using low freq interference
        float gust = sin(t * 0.2 + worldX * 0.005) + sin(t * 0.3 + worldZ * 0.005);
        float windStrength = smoothstep(0.0, 1.5, gust) * 0.3 + 0.1; // 0.1 base, up to 0.4

        float swayX = (swell + ripple * 0.5) * windStrength;
        float swayZ = (cos(t * 0.4 + worldZ * 0.02) + ripple * 0.5) * windStrength;

        // Apply quadratic height factor for bending (stiffer at bottom)
        float bend = h * h;

        transformed.x += swayX * bend;
        transformed.z += swayZ * bend;
        `
      );
    };

    // Generate Points
    // Use r=20 for ~60k instances on 5000x5000
    // Adjust k=10 for speed
    const pds = new PoissonDiskSampling(this.size, this.size, 20, 10);
    const points = pds.fill();

    const dummy = new THREE.Object3D();
    const validInstances = [];
    const offset = this.size / 2;

    for (let i = 0; i < points.length; i++) {
        const x = points[i].x - offset;
        const z = points[i].y - offset;

        // Get height
        const y = this.heightFn(x, z);

        // Check placement (e.g. slope, height range)
        // We pass slope=0 for now as we don't have it easily here without normal lookup
        // But placementFn can just check height for now
        if (this.placementFn(x, z, y)) {
            dummy.position.set(x, y, z);
            dummy.rotation.set(0, Math.random() * Math.PI, 0);

            const s = 0.5 + Math.random() * 0.5;
            dummy.scale.set(s, s * (0.8 + Math.random() * 0.4), s);

            dummy.updateMatrix();
            validInstances.push({ matrix: dummy.matrix.clone(), y: y });
        }
    }

    if (validInstances.length === 0) return;

    this.mesh = new THREE.InstancedMesh(finalGeo, material, validInstances.length);
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = true;

    const color = new THREE.Color();
    const baseColor = new THREE.Color(0x5da130);
    const dryColor = new THREE.Color(0x8a9a5b);

    for (let i = 0; i < validInstances.length; i++) {
        this.mesh.setMatrixAt(i, validInstances[i].matrix);

        // Color variation based on random
        const mix = Math.random();
        color.copy(baseColor).lerp(dryColor, mix * 0.6);
        this.mesh.setColorAt(i, color);
    }

    this.scene.add(this.mesh);
  }

  tick(delta) {
    this.uniforms.time.value += delta;
  }
}
