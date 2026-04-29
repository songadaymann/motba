/**
 * Physics-based momentum for timeline panning.
 * Uses exponential decay (iOS-like feel) with timeConstant=325ms.
 */

interface Sample {
  x: number;
  time: number;
}

export class VelocityTracker {
  private samples: Sample[] = [];
  private maxAge = 300; // ms - only consider recent samples

  reset() {
    this.samples = [];
  }

  sample(x: number) {
    const now = performance.now();
    // Evict old samples
    this.samples = this.samples.filter((s) => now - s.time < this.maxAge);
    this.samples.push({ x, time: now });
  }

  getVelocity(): number {
    const now = performance.now();
    const recent = this.samples.filter((s) => now - s.time < this.maxAge);
    if (recent.length < 2) return 0;

    // Exponential moving average of velocity from recent samples
    let velocity = 0;
    const alpha = 0.3;
    for (let i = 1; i < recent.length; i++) {
      const dx = recent[i].x - recent[i - 1].x;
      const dt = recent[i].time - recent[i - 1].time;
      if (dt > 0) {
        const v = (dx / dt) * 1000; // px/s
        velocity = alpha * v + (1 - alpha) * velocity;
      }
    }
    return velocity;
  }
}

export class MomentumAnimator {
  private rafId: number | null = null;
  private startTime = 0;
  private amplitude: number;
  private lastPosition = 0;
  private timeConstant: number;
  private onUpdate: (deltaX: number) => void;
  private onComplete: () => void;

  constructor(options: {
    velocity: number; // px/s
    timeConstant?: number;
    onUpdate: (deltaX: number) => void;
    onComplete: () => void;
  }) {
    this.timeConstant = options.timeConstant ?? 325;
    this.amplitude = options.velocity * (this.timeConstant / 1000);
    this.onUpdate = options.onUpdate;
    this.onComplete = options.onComplete;
  }

  start() {
    this.startTime = performance.now();
    this.lastPosition = 0;
    this.tick();
  }

  private tick = () => {
    const elapsed = performance.now() - this.startTime;
    const decay = Math.exp(-elapsed / this.timeConstant);
    const position = this.amplitude * (1 - decay);
    const delta = position - this.lastPosition;
    this.lastPosition = position;

    if (Math.abs(delta) < 0.5 && elapsed > 50) {
      this.stop();
      return;
    }

    this.onUpdate(delta);
    this.rafId = requestAnimationFrame(this.tick);
  };

  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.onComplete();
  }

  get isActive() {
    return this.rafId !== null;
  }
}
