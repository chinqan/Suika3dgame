/**
 * MaterialFactory — GDD Ch.4 §4.3
 * Creates and caches neon MeshStandardMaterial + edge LineMaterial per level
 * [PERF] Downgraded from MeshPhysicalMaterial: removed transmission/clearcoat
 */
import * as THREE from 'three';
import { SHAPES } from '@/types';

export interface ShapeMaterials {
  main: THREE.MeshStandardMaterial;
}

const cache = new Map<number, ShapeMaterials>();

/** Get (or create + cache) materials for a shape level */
export function getShapeMaterials(level: number): ShapeMaterials {
  const existing = cache.get(level);
  if (existing) return existing;

  const def = SHAPES[level];
  const color = new THREE.Color(def.color);

  // Layer 1: Main Mesh — Solid, flat-shaded, glossy surface
  const main = new THREE.MeshStandardMaterial({
    color: color,
    flatShading: true,
    roughness: 0.3,       // 低粗糙度 → 光澤感
    metalness: 0.0,       // 無金屬反射
    side: THREE.DoubleSide,
  });

  const materials: ShapeMaterials = { main };
  cache.set(level, materials);
  return materials;
}

/** Create a semi-transparent ghost material (for aim guide) */
export function createGhostMaterial(level: number): THREE.MeshBasicMaterial {
  const def = SHAPES[level];
  return new THREE.MeshBasicMaterial({
    color: def.color,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

/** Dispose all cached materials */
export function disposeAllMaterials(): void {
  cache.forEach(({ main }) => {
    main.dispose();
  });
  cache.clear();
}
