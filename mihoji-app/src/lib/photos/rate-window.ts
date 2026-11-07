// Fenêtre glissante pour limiter les appels à un fournisseur de photos (mode patient du banc d'essai). Logique pure, testée.
export const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

export class RateWindow {
  private readonly times: number[] = [];

  constructor(private readonly windowMs: number) {}

  get used(): number { return this.times.length; }

  // Attend qu'un appel soit possible sans dépasser `limit` appels par fenêtre glissante, puis le réserve.
  async take(limit: number, now: () => number = Date.now, wait: (ms: number) => Promise<unknown> = sleep, onWait?: (seconds: number) => void): Promise<void> {
    for (;;) {
      while (this.times.length && now() - this.times[0] >= this.windowMs) this.times.shift();
      if (this.times.length < limit) { this.times.push(now()); return; }
      const ms = this.times[0] + this.windowMs - now() + 1_000;
      onWait?.(Math.ceil(ms / 1000));
      await wait(ms);
    }
  }

  reset(count = 0, at = Date.now()): void {
    this.times.length = 0;
    for (let i = 0; i < count; i += 1) this.times.push(at);
  }
}

export const unsplashWindow = new RateWindow(3_600_000); // Unsplash (offre démonstration) : 50 requêtes par heure
export const pixabayWindow = new RateWindow(60_000); // Pixabay : 100 requêtes par minute
