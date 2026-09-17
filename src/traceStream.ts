/** Samples belong to simulation time, not to the current pixel grid. */
export function sampleWindow(time: number, span: number, hz: number) {
  return {
    first: Math.floor((time - span) * hz) - 1,
    last: Math.ceil(time * hz) + 1,
  };
}

/** Keep the visible history stable while only evaluating new incoming samples. */
export class SampleCache<T> {
  private values = new Map<number, T>();
  constructor(private readonly evaluate: (index: number) => T) {}
  get(index: number): T {
    if (!this.values.has(index)) this.values.set(index, this.evaluate(index));
    return this.values.get(index)!;
  }
  retain(first: number, last: number) {
    for (const index of this.values.keys())
      if (index < first || index > last) this.values.delete(index);
  }
  get size() {
    return this.values.size;
  }
}
