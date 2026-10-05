/** Share concurrent reads only. Settled results are never cached. */
export class InFlightReads<T> {
  private readonly pending = new Map<string, Promise<T>>();

  run(key: string, load: () => Promise<T>): Promise<T> {
    const existing = this.pending.get(key);
    if (existing) return existing;
    const request = load();
    this.pending.set(key, request);
    const remove = () => {
      if (this.pending.get(key) === request) this.pending.delete(key);
    };
    void request.then(remove, remove);
    return request;
  }

  clear(): void {
    this.pending.clear();
  }
}
