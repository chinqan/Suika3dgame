/**
 * Generic Object Pool — GDD Ch.3 §3.4
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;

  constructor(factory: () => T, prewarm = 0) {
    this.factory = factory;
    for (let i = 0; i < prewarm; i++) {
      this.pool.push(this.factory());
    }
  }

  acquire(): T {
    return this.pool.pop() ?? this.factory();
  }

  release(obj: T): void {
    this.pool.push(obj);
  }

  drain(destroyFn?: (obj: T) => void): void {
    if (destroyFn) {
      for (const obj of this.pool) {
        destroyFn(obj);
      }
    }
    this.pool.length = 0;
  }

  get size(): number {
    return this.pool.length;
  }
}
