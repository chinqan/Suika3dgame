/**
 * createNeonMesh — GDD Ch.4 §4.3
 * Combines Geometry + Material + EdgesGeometry → complete 3D shape
 * [PERF] EdgesGeometry is cached per level
 */
import * as THREE from 'three';
import { getGeometry } from '@/rendering/geometries';
import { getShapeMaterials } from '@/rendering/materials';

// 取消 EdgesGeometry，因為現在採用全實體+光源渲染
// 這裡保留空行避免引入錯誤

/**
 * Create a complete neon shape mesh group with:
 * - Layer 1: Main mesh (glass body)
 * - Layer 2: Edge wireframe (neon edges)
 * Bloom glow is handled by UnrealBloomPass globally.
 */
export function createNeonMesh(level: number): THREE.Group {
  const group = new THREE.Group();
  group.name = `shape_lv${level}`;

  const geometry = getGeometry(level);
  const materials = getShapeMaterials(level);

  // Layer 1: Main body (Solid flat-shaded)
  const mainMesh = new THREE.Mesh(geometry, materials.main);
  mainMesh.name = 'body';
  mainMesh.castShadow = true;
  mainMesh.receiveShadow = true;
  group.add(mainMesh);

  return group;
}

/**
 * Dispose a shape mesh group properly
 * (Shared geometries, materials, and EdgesGeometry are NOT disposed here — they're cached)
 */
export function disposeShapeMesh(group: THREE.Group): void {
  // EdgesGeometry is now cached, no individual disposal needed
  group.removeFromParent();
}

/** Dispose all cached edge geometries */
export function disposeAllEdges(): void {
  // 不再有 edgesCache 需要清空
}
