/**
 * Global Constants — GDD Ch.2, Ch.3, Ch.8
 */

// ---- Container (3D World Units) ----
export const CONTAINER_WIDTH = 10;
export const CONTAINER_DEPTH = 5;  // = largest shape (Lv.8) diameter
export const CONTAINER_HEIGHT = 12;
export const HALF_WIDTH = CONTAINER_WIDTH / 2;
export const HALF_DEPTH = CONTAINER_DEPTH / 2;

// ---- Game Area ----
export const FLOOR_Y = 0;
export const GAME_OVER_LINE_Y = CONTAINER_HEIGHT; // 切齊箱子頂端
export const DROP_Y = 12.5;
export const DROP_SPAWN_Y = CONTAINER_HEIGHT + 2.5; // 生成點也提高

// ---- Timing ----
export const DROP_COOLDOWN_MS = 250;
export const COMBO_WINDOW_MS = 1200;
export const GAME_OVER_DELAY_MS = 1500;

// ---- Physics (Rapier3D) ----
export const GRAVITY_Y = -50.0;
export const PHYSICS_TIMESTEP = 1 / 60;

// ---- Shape Physics ----
export const SHAPE_RESTITUTION = 0.15;
export const SHAPE_FRICTION = 0.6;
export const SHAPE_BASE_DENSITY = 1.5;
export const SHAPE_DENSITY_PER_LEVEL = 0.4;
export const SHAPE_LINEAR_DAMPING = 0.3;
export const SHAPE_ANGULAR_DAMPING = 0.5;
export const COLLISION_RADIUS_PADDING = -0.02;  // 負值讓碰撞球略縮，消除多面體面與球體之間的空隙

// ---- Wall Physics ----
export const WALL_FRICTION = 1.0;
export const WALL_RESTITUTION = 0.1;

// ---- Rendering ----
export const BG_COLOR = 0x0a0a0f;
export const FOG_DENSITY = 0.02;
export const GRID_COLOR = 0x00ffff;
export const GRID_SIZE = 30;
export const GRID_DIVISIONS = 15;

// ---- Post-Processing ----
export const BLOOM_STRENGTH = 0.8;
export const BLOOM_RADIUS = 0.4;
export const BLOOM_THRESHOLD = 0.6;

// ---- Camera ----
export const CAMERA_FOV = 45;
export const CAMERA_NEAR = 0.1;
export const CAMERA_FAR = 100;
export const CAMERA_POSITION = { x: 0, y: 6.35, z: 22 } as const;
export const CAMERA_LOOKAT = { x: 0, y: 5.35, z: 0 } as const;

// ---- Grid Flow ----
export const GRID_FLOW_MAX_COUNT = 20;
export const GRID_FLOW_SPAWN_CHANCE = 0.06;

// ---- Camera Shake ----
export const SHAKE_DECAY = 0.85;
export const SHAKE_THRESHOLD = 0.005;

// ---- Max Scores ----
export const MAX_LEVEL_SCORE = 80; // Lv.8 + Lv.8 collision
