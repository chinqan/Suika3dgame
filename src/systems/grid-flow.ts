/**
 * GridFlowSystem — GDD Ch.4 §4.4
 * Animated neon orbs flowing along the floor grid
 * [PERF] Uses THREE.Points with custom ShaderMaterial (1 draw call)
 * Each orb has individual size pulsing (忽大忽小) and brightness pulsing (忽明忽暗)
 */
import * as THREE from 'three';
import {
  GRID_SIZE, GRID_DIVISIONS,
  GRID_FLOW_MAX_COUNT, GRID_FLOW_SPAWN_CHANCE,
} from '@/constants';

interface FlowOrb {
  active: boolean;
  t: number;
  speed: number;
  lineIdx: number;
  isHorizontal: boolean;
  baseSize: number;
  pulsePhase: number;
  pulseSpeed: number;
  brightnessPhase: number;
  brightnessSpeed: number;
}

/** Create a radial gradient canvas texture for glow orbs */
function createOrbTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(0, 255, 255, 1.0)');
  gradient.addColorStop(0.2, 'rgba(0, 255, 255, 0.8)');
  gradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.3)');
  gradient.addColorStop(0.8, 'rgba(0, 255, 255, 0.05)');
  gradient.addColorStop(1.0, 'rgba(0, 255, 255, 0.0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// Custom vertex shader — reads per-point `aSize` and `aOpacity` attributes
const vertexShader = `
  attribute float aSize;
  attribute float aOpacity;
  varying float vOpacity;
  void main() {
    vOpacity = aOpacity;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (600.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Custom fragment shader — radial gradient disc with opacity
const fragmentShader = `
  uniform sampler2D map;
  uniform vec3 uColor;
  varying float vOpacity;
  void main() {
    vec4 texel = texture2D(map, gl_PointCoord);
    gl_FragColor = vec4(uColor * texel.rgb, texel.a * vOpacity);
  }
`;

export class GridFlowSystem {
  private group: THREE.Group;
  private orbs: FlowOrb[];
  private points: THREE.Points;
  private positionArray: Float32Array;
  private sizeArray: Float32Array;
  private opacityArray: Float32Array;
  private halfGrid: number;
  private lineSpacing: number;
  private activeCount = 0;

  constructor(parentGroup: THREE.Group) {
    this.group = parentGroup;
    this.halfGrid = GRID_SIZE / 2;
    this.lineSpacing = GRID_SIZE / GRID_DIVISIONS;

    // Pre-allocate orb pool
    this.orbs = [];
    for (let i = 0; i < GRID_FLOW_MAX_COUNT; i++) {
      this.orbs.push({
        active: false, t: 0, speed: 0, lineIdx: 0,
        isHorizontal: false, baseSize: 0,
        pulsePhase: 0, pulseSpeed: 0,
        brightnessPhase: 0, brightnessSpeed: 0,
      });
    }

    // [PERF] Single THREE.Points with custom ShaderMaterial = 1 draw call
    const geometry = new THREE.BufferGeometry();
    this.positionArray = new Float32Array(GRID_FLOW_MAX_COUNT * 3);
    this.sizeArray = new Float32Array(GRID_FLOW_MAX_COUNT);
    this.opacityArray = new Float32Array(GRID_FLOW_MAX_COUNT);

    const posBuf = new THREE.BufferAttribute(this.positionArray, 3);
    posBuf.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', posBuf);

    const sizeBuf = new THREE.BufferAttribute(this.sizeArray, 1);
    sizeBuf.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('aSize', sizeBuf);

    const opacityBuf = new THREE.BufferAttribute(this.opacityArray, 1);
    opacityBuf.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('aOpacity', opacityBuf);

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        map: { value: createOrbTexture() },
        uColor: { value: new THREE.Color(0x00FFFF) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    geometry.setDrawRange(0, 0);
    this.group.add(this.points);
  }

  update(dt: number): void {
    // Spawn new orbs
    if (this.activeCount < GRID_FLOW_MAX_COUNT && Math.random() < GRID_FLOW_SPAWN_CHANCE) {
      this.spawnOrb();
    }

    let alive = 0;

    for (let i = 0; i < GRID_FLOW_MAX_COUNT; i++) {
      const d = this.orbs[i];
      if (!d.active) continue;

      d.t += d.speed * dt;

      if (d.t >= 1.0) {
        d.active = false;
        this.activeCount--;
        continue;
      }

      // Position
      const linePos = -this.halfGrid + d.lineIdx * this.lineSpacing;
      const travelPos = -this.halfGrid + d.t * GRID_SIZE;
      const px = d.isHorizontal ? travelPos : linePos;
      const pz = d.isHorizontal ? linePos : travelPos;
      const idx3 = alive * 3;
      this.positionArray[idx3] = px;
      this.positionArray[idx3 + 1] = 0.01; // 盡量貼平地面，減少視差造成的偏離現象
      this.positionArray[idx3 + 2] = pz;

      // Per-point size pulsing (忽大忽小) — range: [0.4, 1.0] × baseSize
      d.pulsePhase += d.pulseSpeed * dt;
      const sizePulse = 0.7 + 0.3 * Math.sin(d.pulsePhase);
      this.sizeArray[alive] = d.baseSize * sizePulse;

      // Per-point brightness pulsing (忽明忽暗) — range: [0.15, 1.0]
      d.brightnessPhase += d.brightnessSpeed * dt;
      const brightPulse = 0.55 + 0.45 * Math.sin(d.brightnessPhase);

      // Fade in/out at edges
      const edgeFade = d.t < 0.1 ? d.t / 0.1
        : d.t > 0.9 ? (1.0 - d.t) / 0.1
        : 1.0;

      this.opacityArray[alive] = Math.max(0, edgeFade * brightPulse);
      alive++;
    }

    // Update geometry
    const geo = this.points.geometry;
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (geo.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    (geo.attributes.aOpacity as THREE.BufferAttribute).needsUpdate = true;
    geo.setDrawRange(0, alive);
  }

  private spawnOrb(): void {
    for (let i = 0; i < GRID_FLOW_MAX_COUNT; i++) {
      if (!this.orbs[i].active) {
        const d = this.orbs[i];
        d.active = true;
        d.t = 0;
        d.speed = 0.015 + Math.random() * 0.04; // 流動速度再減半，變得極其緩慢
        d.lineIdx = Math.floor(Math.random() * (GRID_DIVISIONS + 1));
        d.isHorizontal = Math.random() > 0.5;
        d.baseSize = 0.8 + Math.random() * 1.0;
        d.pulsePhase = Math.random() * Math.PI * 2;
        d.pulseSpeed = 1.0 + Math.random() * 2.0; // 大小變化極慢
        d.brightnessPhase = Math.random() * Math.PI * 2;
        d.brightnessSpeed = 0.5 + Math.random() * 1.5; // 亮度脈衝極慢
        this.activeCount++;
        return;
      }
    }
  }

  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    this.group.remove(this.points);
  }
}
