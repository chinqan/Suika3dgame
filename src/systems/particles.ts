/**
 * ParticleSystem — GDD Ch.3 §3.4, Ch.4 §4.5
 * 3D merge explosion particles using InstancedMesh
 * [PERF] Zero per-frame allocations: reuse scratch vectors, swap-with-last removal
 */
import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  scale: number;
  color: THREE.Color;
}

const MAX_PARTICLES = 200;

// [PERF] Scratch objects — reused every frame, zero GC
const _dummy = new THREE.Object3D();
const _tempV = new THREE.Vector3();

export class ParticleSystem {
  private particles: Particle[] = [];
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
  }

  /** Spawn merge explosion particles at position */
  emit(position: THREE.Vector3, color: THREE.Color, count = 20): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;

      const speed = 6 + Math.random() * 10;
      // [PERF] Reuse _tempV for direction calc, then clone for storage
      _tempV.set(
        (Math.random() - 0.5) * 2,
        Math.random() * 1.5 + 0.5,
        (Math.random() - 0.5) * 2,
      ).normalize().multiplyScalar(speed);

      this.particles.push({
        position: position.clone(),
        velocity: _tempV.clone(),
        life: 1.0,
        maxLife: 0.8 + Math.random() * 0.5,
        scale: 1.8 + Math.random() * 3.6,
        color: color.clone(),
      });
    }
  }

  /** Update all particles — call every frame with deltaTime in seconds */
  update(dt: number): void {
    const gravity = -15;
    let alive = 0;
    let i = 0;

    while (i < this.particles.length) {
      const p = this.particles[i];
      p.life -= dt / p.maxLife;

      if (p.life <= 0) {
        // [PERF] Swap-with-last removal: O(1) instead of splice O(n)
        const last = this.particles.length - 1;
        if (i < last) {
          this.particles[i] = this.particles[last];
        }
        this.particles.length = last;
        continue; // re-check same index (now has swapped element)
      }

      // Physics — [PERF] no allocation: mutate velocity in-place, use scratch for addend
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
      i++;
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
