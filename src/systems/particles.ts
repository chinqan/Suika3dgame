/**
 * ParticleSystem — GDD Ch.3 §3.4, Ch.4 §4.5
 * 3D merge explosion particles using InstancedMesh
 * [PERF] Zero-allocation object pool: all 200 particles pre-allocated at init
 */
import * as THREE from 'three';

const MAX_PARTICLES = 200;

// [PERF] Scratch objects — reused every frame, zero GC
const _dummy = new THREE.Object3D();
const _tempV = new THREE.Vector3();

/** Pre-allocated particle slot */
interface PooledParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;      // <= 0 means inactive
  maxLife: number;
  scale: number;
  color: THREE.Color;
}

export class ParticleSystem {
  private pool: PooledParticle[];
  private instancedMesh: THREE.InstancedMesh;
  private group: THREE.Group;
  private colorArray: Float32Array;

  constructor(parentGroup: THREE.Group) {
    this.group = parentGroup;

    // Shard-like particles — small and fast
    const geo = new THREE.BoxGeometry(0.20, 0.20, 0.20);
    const mat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.9,
      toneMapped: false,
    });

    this.instancedMesh = new THREE.InstancedMesh(geo, mat, MAX_PARTICLES);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // Per-instance color
    this.colorArray = new Float32Array(MAX_PARTICLES * 3);
    this.instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(this.colorArray, 3);
    this.instancedMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);

    this.instancedMesh.count = 0;
    this.instancedMesh.frustumCulled = false;
    this.group.add(this.instancedMesh);

    // [PERF] Pre-allocate ALL particle slots — zero runtime allocation
    this.pool = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.pool.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0,       // inactive
        maxLife: 1,
        scale: 1,
        color: new THREE.Color(),
      });
    }
  }

  /** Spawn merge explosion particles at position — ZERO allocation */
  emit(position: THREE.Vector3, color: THREE.Color, count = 20): void {
    let spawned = 0;
    for (let i = 0; i < MAX_PARTICLES && spawned < count; i++) {
      const p = this.pool[i];
      if (p.life > 0) continue; // slot in use

      const speed = 6 + Math.random() * 10;
      _tempV.set(
        (Math.random() - 0.5) * 2,
        Math.random() * 1.5 + 0.5,
        (Math.random() - 0.5) * 2,
      ).normalize().multiplyScalar(speed);

      // [PERF] copy — not clone! No new objects created
      p.position.copy(position);
      p.velocity.copy(_tempV);
      p.life = 1.0;
      p.maxLife = 0.8 + Math.random() * 0.5;
      p.scale = 1.8 + Math.random() * 3.6;
      p.color.copy(color);

      spawned++;
    }
  }

  /** Update all particles — call every frame with deltaTime in seconds */
  update(dt: number): void {
    const gravity = -15;
    let alive = 0;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.pool[i];
      if (p.life <= 0) continue;

      p.life -= dt / p.maxLife;
      if (p.life <= 0) {
        p.life = 0; // mark inactive
        continue;
      }

      // Physics — mutate in-place, use scratch for addend
      p.velocity.y += gravity * dt;
      _tempV.copy(p.velocity).multiplyScalar(dt);
      p.position.add(_tempV);

      // Scale down as life decreases
      const s = p.scale * p.life;
      _dummy.position.copy(p.position);
      _dummy.scale.setScalar(s);
      _dummy.updateMatrix();

      this.instancedMesh.setMatrixAt(alive, _dummy.matrix);

      // Color with fade
      const ci = alive * 3;
      this.colorArray[ci] = p.color.r * (0.5 + p.life * 0.5);
      this.colorArray[ci + 1] = p.color.g * (0.5 + p.life * 0.5);
      this.colorArray[ci + 2] = p.color.b * (0.5 + p.life * 0.5);

      alive++;
    }

    this.instancedMesh.count = alive;
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  dispose(): void {
    this.instancedMesh.geometry.dispose();
    (this.instancedMesh.material as THREE.Material).dispose();
    this.group.remove(this.instancedMesh);
  }
}
