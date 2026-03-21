/**
 * MergeSystem — GDD Ch.6 §6.1
 * Handles same-level collision → merge into next level
 */
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsSystem } from '@/systems/physics';
import { createNeonMesh, disposeShapeMesh } from '@/rendering/shape-mesh';
import { SHAPES, type GameShape } from '@/types';
import { MAX_LEVEL_SCORE } from '@/constants';
import { uniqueId, randomRange } from '@/utils/math';

export interface MergeEvent {
  newLevel: number;
  position: THREE.Vector3;
  score: number;
}

export class MergeSystem {
  private physics: PhysicsSystem;
  private shapesGroup: THREE.Group;
  private shapes: Map<number, GameShape> = new Map(); // collider handle → GameShape
  private mergeCooldown = new Set<number>(); // collider handles in cooldown

  /** Callback: fires on every merge */
  public onMerge: ((event: MergeEvent) => void) | null = null;

  constructor(physics: PhysicsSystem, shapesGroup: THREE.Group) {
    this.physics = physics;
    this.shapesGroup = shapesGroup;
  }

  /** Register a newly dropped/merged shape */
  registerShape(shape: GameShape): void {
    this.shapes.set(shape.collider.handle, shape);
  }

  /** Remove a shape by collider handle */
  private removeShape(handle: number): GameShape | undefined {
    const shape = this.shapes.get(handle);
    if (!shape) return undefined;

    this.shapes.delete(handle);
    this.physics.removeBody(shape.body);
    disposeShapeMesh(shape.mesh);
    this.shapesGroup.remove(shape.mesh);
    return shape;
  }



  /** Callback: fires on every non-merge collision */
  public onBump: ((type: 'bump' | 'thud', intensity: number) => void) | null = null;

  private lastBumpTime = 0; // 節流：避免同一幀太多碰撞音效
  private readonly BUMP_COOLDOWN = 50; // ms

  /** Alternative: contact-pair based merge check using Rapier event queue */
  processContactEvents(eventQueue: RAPIER.EventQueue): void {
    const now = performance.now();

    eventQueue.drainCollisionEvents((h1, h2, started) => {
      if (!started) return; // Only care about contact start

      const s1 = this.shapes.get(h1);
      const s2 = this.shapes.get(h2);

      if (s1 && s2) {
        // 球對球碰撞
        if (s1.level === s2.level && !this.mergeCooldown.has(h1) && !this.mergeCooldown.has(h2)) {
          this.merge(s1, s2);
        } else if (now - this.lastBumpTime > this.BUMP_COOLDOWN) {
          // 非合成的球對球碰撞 → bump 音效
          const speed1 = this.physics.getSpeed(s1.body);
          const speed2 = this.physics.getSpeed(s2.body);
          const intensity = Math.min(2.0, (speed1 + speed2) * 0.15);
          if (intensity > 0.2) {
            this.onBump?.('bump', intensity);
            this.lastBumpTime = now;
          }
        }
      } else if ((s1 || s2) && now - this.lastBumpTime > this.BUMP_COOLDOWN) {
        // 球對牆壁/地板碰撞 → thud 音效
        const shape = s1 || s2;
        if (shape) {
          const speed = this.physics.getSpeed(shape.body);
          const intensity = Math.min(2.0, speed * 0.2);
          if (intensity > 0.15) {
            this.onBump?.('thud', intensity);
            this.lastBumpTime = now;
          }
        }
      }
    });

    // 每幀處理完後清空，避免 Handle 被回收重用時無法合成
    this.mergeCooldown.clear();
  }

  private merge(s1: GameShape, s2: GameShape): void {
    const h1 = s1.collider.handle;
    const h2 = s2.collider.handle;

    // Add to cooldown
    this.mergeCooldown.add(h1);
    this.mergeCooldown.add(h2);

    // Calculate midpoint
    const midpoint = this.physics.getMidpoint(s1.body, s2.body);

    // Remove old shapes
    this.removeShape(h1);
    this.removeShape(h2);

    const currentLevel = s1.level;
    const maxLevel = SHAPES.length - 1;

    if (currentLevel >= maxLevel) {
      // Max level collision — score only, no new shape
      this.onMerge?.({
        newLevel: currentLevel,
        position: midpoint,
        score: MAX_LEVEL_SCORE,
      });
    } else {
      // Create new merged shape
      const newLevel = currentLevel + 1;
      const newShape = this.spawnShape(newLevel, midpoint.x, midpoint.y, midpoint.z);

      // Apply upward impulse for visual pop effect
      const impulseY = randomRange(3, 6);
      const impulseX = randomRange(-1, 1);
      newShape.body.applyImpulse(
        new RAPIER.Vector3(impulseX, impulseY, 0),
        true,
      );

      // Random spin
      newShape.body.applyTorqueImpulse(
        new RAPIER.Vector3(
          randomRange(-0.5, 0.5),
          randomRange(-0.5, 0.5),
          randomRange(-0.5, 0.5),
        ),
        true,
      );

      this.onMerge?.({
        newLevel,
        position: midpoint,
        score: SHAPES[newLevel].score,
      });
    }

    // Clear cooldown after a short delay
    setTimeout(() => {
      this.mergeCooldown.delete(h1);
      this.mergeCooldown.delete(h2);
    }, 100);
  }

  /** Spawn a shape at position and register it */
  spawnShape(level: number, x: number, y: number, z: number): GameShape {
    const def = SHAPES[level];

    // Three.js mesh
    const mesh = createNeonMesh(level);
    mesh.position.set(x, y, z);
    this.shapesGroup.add(mesh);

    // Rapier3D body
    const { body, collider } = this.physics.createShapeBody(x, y, z, level, def.collisionRadius);

    // Random rotation axis for idle spin
    const rotationAxis = new THREE.Vector3(
      randomRange(-1, 1),
      randomRange(-1, 1),
      randomRange(-1, 1),
    ).normalize();
    const rotationSpeed = randomRange(0.002, 0.008);

    const shape: GameShape = {
      id: uniqueId('shape'),
      level,
      mesh,
      body,
      collider,
      rotationAxis,
      rotationSpeed,
    };

    this.registerShape(shape);
    return shape;
  }

  /** Sync all registered shapes: body → mesh */
  syncAll(): void {
    for (const shape of this.shapes.values()) {
      this.physics.syncMesh(shape);
    }
  }

  /** Get all shapes */
  getAllShapes(): GameShape[] {
    return Array.from(this.shapes.values());
  }

  /** Clear all shapes */
  clearAll(): void {
    for (const [handle] of this.shapes) {
      this.removeShape(handle);
    }
    this.shapes.clear();
    this.mergeCooldown.clear();
  }
}
