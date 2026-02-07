import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';

let simplex = new SimplexNoise();

let perlin_octaves = 4;
let perlin_amp_falloff = 0.5;

export const noise = function(x, y = 0, z = 0) {
  let r = 0;
  let ampl = 0.5;
  let freq = 1.0;
  let max = 0;

  for (let i = 0; i < perlin_octaves; i++) {
    r += simplex.noise3d(x * freq, y * freq, z * freq) * ampl;
    max += ampl;
    ampl *= perlin_amp_falloff;
    freq *= 2.0;
  }

  // Normalize to -1..1
  if (max > 0) r /= max;

  // Map to 0..1 to match previous behavior
  return (r + 1) * 0.5;
};

export const noiseDetail = function(lod, falloff) {
  if (lod > 0) perlin_octaves = lod;
  if (falloff > 0) perlin_amp_falloff = falloff;
};

export const noiseSeed = function(seed) {
  // Linear Congruential Generator
  const lcg = (function() {
    let z = seed;
    const m = 4294967296;
    const a = 1664525;
    const c = 1013904223;

    return {
      random: function() {
        z = (a * z + c) % m;
        return z / m;
      }
    };
  })();

  simplex = new SimplexNoise(lcg);
};
