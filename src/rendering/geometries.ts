/**
 * GeometryFactory — GDD Ch.2 §2.4
 * Creates and caches 9 level geometries
 */
import * as THREE from 'three';
import { SHAPES } from '@/types';

const cache = new Map<number, THREE.BufferGeometry>();

/** Get (or create + cache) the geometry for a shape level */
export function getGeometry(level: number): THREE.BufferGeometry {
  const existing = cache.get(level);
  if (existing) return existing;

  const def = SHAPES[level];
  const r = def.collisionRadius;
  let geo: THREE.BufferGeometry;

  switch (level) {
    case 0: // Tetrahedron
      geo = new THREE.TetrahedronGeometry(r, 0);
      break;
    case 1: // Small Sphere
      geo = new THREE.SphereGeometry(r, 16, 12);
      break;
    case 2: // Cube
      geo = new THREE.BoxGeometry(r * 1.4, r * 1.4, r * 1.4);
      break;
    case 3: // Dodecahedron
      geo = new THREE.DodecahedronGeometry(r, 0);
      break;
    case 4: // Icosahedron
      geo = new THREE.IcosahedronGeometry(r, 0);
      break;
    case 5: // Medium Sphere
      geo = new THREE.SphereGeometry(r, 24, 16);
      break;
    case 6: // Octahedron
      geo = new THREE.OctahedronGeometry(r, 0);
      break;
    case 7: // Truncated Icosahedron (approximated with detail=1)
      geo = new THREE.IcosahedronGeometry(r, 1);
      break;
    case 8: // Large Sphere
      geo = new THREE.SphereGeometry(r, 32, 24);
      break;
    default:
      geo = new THREE.SphereGeometry(r, 16, 12);
  }

  cache.set(level, geo);
  return geo;
}

/** Dispose all cached geometries */
export function disposeAllGeometries(): void {
  cache.forEach((geo) => geo.dispose());
  cache.clear();
}
