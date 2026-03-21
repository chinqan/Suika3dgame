/**
 * InputManager — GDD Ch.3 §3.5
 * Mouse/Touch → Raycaster → 3D world coordinates
 */
import * as THREE from 'three';
import { clamp } from '@/utils/math';
import { HALF_WIDTH } from '@/constants';

export class InputManager {
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private dropPlane: THREE.Plane;
  private intersectPoint = new THREE.Vector3();

  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;

  /** Current world X position (clamped) */
  public worldX = 0;

  /** Callbacks */
  public onDrop: ((worldX: number) => void) | null = null;
  public onMove: ((worldX: number) => void) | null = null;

  /** 外部檢查：是否正在拖曳攝影機（若是則抑制投放） */
  public isDragCheck: (() => boolean) | null = null;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;

    // [FIX] Use Z=0 vertical plane instead of Y=DROP_Y horizontal plane
    // The horizontal plane at Y=14 causes extreme sensitivity because the
    // camera (Y=8) must cast rays upward at steep angles.
    // A vertical plane at Z=0 provides natural 1:1 mouse-to-world mapping.
    this.dropPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    // Bind events
    this.domElement.addEventListener('pointermove', this.handlePointerMove.bind(this));
    this.domElement.addEventListener('pointerup', this.handlePointerUp.bind(this));

    // Prevent default touch behaviors
    this.domElement.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    this.domElement.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  }

  private updatePointer(e: PointerEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private projectToDropPlane(): number {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    this.raycaster.ray.intersectPlane(this.dropPlane, this.intersectPoint);
    return this.intersectPoint.x;
  }

  /** Clamp X to container bounds accounting for shape radius */
  clampX(x: number, shapeRadius: number): number {
    const margin = shapeRadius + 0.08;
    return clamp(x, -HALF_WIDTH + margin, HALF_WIDTH - margin);
  }

  private handlePointerMove(e: PointerEvent): void {
    this.updatePointer(e);
    const rawX = this.projectToDropPlane();
    this.worldX = rawX;
    this.onMove?.(rawX);
  }

  private handlePointerUp(e: PointerEvent): void {
    // 若剛才在拖曳旋轉攝影機，則不投放
    if (this.isDragCheck?.()) return;

    this.updatePointer(e);
    const rawX = this.projectToDropPlane();
    this.worldX = rawX;
    this.onDrop?.(rawX);
  }

  dispose(): void {
    // Event listeners will be GC'd with the element
  }
}
