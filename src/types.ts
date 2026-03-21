/**
 * Type Definitions — GDD Ch.2, Ch.3
 */
import type * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';

// ---- Shape Definition ----
export interface ShapeDefinition {
  level: number;
  name: string;
  geometryType: string;
  faces: number;       // 0 for spheres
  collisionRadius: number;
  color: number;
  colorHex: string;
  score: number;
}

// ---- Difficulty ----
export type Difficulty = 'easy' | 'normal' | 'hard';

export interface DifficultyConfig {
  name: string;
  startIndex: number;
  shapeCount: number;
  maxDropLevel: number;
}

// ---- Game Shape Instance ----
export interface GameShape {
  id: string;
  level: number;
  mesh: THREE.Group;
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  rotationAxis: THREE.Vector3;
  rotationSpeed: number;
}

// ---- Particle ----
export interface ParticleData {
  life: number;
  vx: number;
  vy: number;
  vz: number;
}

// ---- Grid Flow ----
export interface GridFlowData {
  t: number;
  speed: number;
  lineIdx: number;
  isHorizontal: boolean;
  size: number;
  brightness: number;
  sprite: THREE.Sprite;
}

// ---- Game State ----
export type GamePhase = 'loading' | 'menu' | 'playing' | 'gameover';

// ---- Shapes Table (GDD Ch.2 §2.4) ----
export const SHAPES: ShapeDefinition[] = [
  { level: 0, name: 'Tetrahedron',            geometryType: 'TetrahedronGeometry',    faces: 4,  collisionRadius: 0.70, color: 0x00FFFF, colorHex: '#00FFFF', score: 1  },
  { level: 1, name: 'Small Sphere',           geometryType: 'SphereGeometry',         faces: 0,  collisionRadius: 0.84, color: 0xFFFF00, colorHex: '#FFFF00', score: 3  },
  { level: 2, name: 'Cube',                   geometryType: 'BoxGeometry',            faces: 6,  collisionRadius: 1.01, color: 0xFF6B6B, colorHex: '#FF6B6B', score: 6  },
  { level: 3, name: 'Dodecahedron',           geometryType: 'DodecahedronGeometry',   faces: 12, collisionRadius: 1.21, color: 0x39FF14, colorHex: '#39FF14', score: 10 },
  { level: 4, name: 'Icosahedron',            geometryType: 'IcosahedronGeometry',    faces: 20, collisionRadius: 1.45, color: 0xFF8C00, colorHex: '#FF8C00', score: 15 },
  { level: 5, name: 'Sphere',                 geometryType: 'SphereGeometry',         faces: 0,  collisionRadius: 1.74, color: 0xFF00FF, colorHex: '#FF00FF', score: 21 },
  { level: 6, name: 'Octahedron',             geometryType: 'OctahedronGeometry',     faces: 8,  collisionRadius: 2.08, color: 0xBF00FF, colorHex: '#BF00FF', score: 28 },
  { level: 7, name: 'Truncated Icosahedron',  geometryType: 'IcosahedronGeometry',    faces: 32, collisionRadius: 2.50, color: 0x00FF88, colorHex: '#00FF88', score: 36 },
  { level: 8, name: 'Large Sphere',           geometryType: 'SphereGeometry',         faces: 0,  collisionRadius: 3.00, color: 0xFFFFFF, colorHex: '#FFFFFF', score: 50 },
];

// ---- Difficulty Configs ----
export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy:   { name: 'EASY',   startIndex: 2, shapeCount: 7, maxDropLevel: 3 },
  normal: { name: 'NORMAL', startIndex: 1, shapeCount: 8, maxDropLevel: 3 },
  hard:   { name: 'HARD',   startIndex: 0, shapeCount: 9, maxDropLevel: 4 },
};
