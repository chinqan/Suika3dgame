/**
 * PhysicsSystem — GDD Ch.3 §3.2
 * Rapier3D WASM wrapper for 3D physics simulation
 */
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import {
  GRAVITY_Y,
  HALF_WIDTH, HALF_DEPTH, CONTAINER_HEIGHT,
  WALL_FRICTION, WALL_RESTITUTION,
  SHAPE_RESTITUTION, SHAPE_FRICTION,
  SHAPE_BASE_DENSITY, SHAPE_DENSITY_PER_LEVEL,
  SHAPE_LINEAR_DAMPING, SHAPE_ANGULAR_DAMPING,
  COLLISION_RADIUS_PADDING,
} from '@/constants';
import type { GameShape } from '@/types';

export class PhysicsSystem {
  public world!: RAPIER.World;
  private _initialized = false;

  /** Initialize WASM and create physics world */
  async init(): Promise<void> {
    await RAPIER.init();
    const gravity = new RAPIER.Vector3(0.0, GRAVITY_Y, 0.0);
    this.world = new RAPIER.World(gravity);
    this._initialized = true;
    this.createContainerWalls();
  }

  get initialized(): boolean {
    return this._initialized;
  }

  /** Create static walls: floor + 4 walls */
  private createContainerWalls(): void {
    const wallThickness = 0.5;

    // Floor (Y=0)
    this.createStaticCuboid(0, -wallThickness / 2, 0, HALF_WIDTH + 1, wallThickness / 2, HALF_DEPTH + 1);

    // Left wall (X = -HALF_WIDTH)
    this.createStaticCuboid(-HALF_WIDTH - wallThickness / 2, CONTAINER_HEIGHT / 2, 0, wallThickness / 2, CONTAINER_HEIGHT / 2, HALF_DEPTH + 1);

    // Right wall (X = +HALF_WIDTH)
    this.createStaticCuboid(HALF_WIDTH + wallThickness / 2, CONTAINER_HEIGHT / 2, 0, wallThickness / 2, CONTAINER_HEIGHT / 2, HALF_DEPTH + 1);

    // Back wall (Z = -HALF_DEPTH)
    this.createStaticCuboid(0, CONTAINER_HEIGHT / 2, -HALF_DEPTH - wallThickness / 2, HALF_WIDTH + 1, CONTAINER_HEIGHT / 2, wallThickness / 2);

    // Front wall (Z = +HALF_DEPTH)
    this.createStaticCuboid(0, CONTAINER_HEIGHT / 2, HALF_DEPTH + wallThickness / 2, HALF_WIDTH + 1, CONTAINER_HEIGHT / 2, wallThickness / 2);
  }

  private createStaticCuboid(x: number, y: number, z: number, hx: number, hy: number, hz: number): void {
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z);
    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(hx, hy, hz)
      .setFriction(WALL_FRICTION)
      .setRestitution(WALL_RESTITUTION);
    this.world.createCollider(colliderDesc, body);
  }

  /** Create a dynamic sphere body for a game shape */
  createShapeBody(x: number, y: number, z: number, level: number, collisionRadius: number): { body: RAPIER.RigidBody; collider: RAPIER.Collider } {
    const density = SHAPE_BASE_DENSITY + level * SHAPE_DENSITY_PER_LEVEL;
    const radius = collisionRadius + COLLISION_RADIUS_PADDING;

    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, y, z)
      .setLinearDamping(SHAPE_LINEAR_DAMPING)
      .setAngularDamping(SHAPE_ANGULAR_DAMPING);

    const body = this.world.createRigidBody(bodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.ball(radius)
      .setDensity(density)
      .setFriction(SHAPE_FRICTION)
      .setRestitution(SHAPE_RESTITUTION)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

    const collider = this.world.createCollider(colliderDesc, body);

    return { body, collider };
  }

  /** Step physics simulation */
  step(): void {
    if (!this._initialized) return;
    this.world.step();
  }

  /** Sync Rapier3D body → Three.js mesh */
  syncMesh(shape: GameShape): void {
    const pos = shape.body.translation();
    const rot = shape.body.rotation();

    shape.mesh.position.set(pos.x, pos.y, pos.z);
    shape.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
  }

  /** Remove a shape's body from the world */
  removeBody(body: RAPIER.RigidBody): void {
    if (!this._initialized) return;
    this.world.removeRigidBody(body);
  }

  /** Get body velocity magnitude */
  getSpeed(body: RAPIER.RigidBody): number {
    const v = body.linvel();
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  }

  /** Get body Y position */
  getY(body: RAPIER.RigidBody): number {
    return body.translation().y;
  }

  /** Get midpoint between two bodies */
  getMidpoint(a: RAPIER.RigidBody, b: RAPIER.RigidBody): THREE.Vector3 {
    const pa = a.translation();
    const pb = b.translation();
    return new THREE.Vector3(
      (pa.x + pb.x) / 2,
      (pa.y + pb.y) / 2,
      (pa.z + pb.z) / 2,
    );
  }

  /** Cleanup entire world */
  cleanup(): void {
    if (!this._initialized) return;
    this.world.free();
    const gravity = new RAPIER.Vector3(0.0, GRAVITY_Y, 0.0);
    this.world = new RAPIER.World(gravity);
    this.createContainerWalls();
  }
}
