export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class FixedClock implements Clock {
  readonly #value: Date;

  constructor(value: Date) {
    this.#value = new Date(value);
  }

  now(): Date {
    return new Date(this.#value);
  }
}

export interface IdGenerator {
  next(): string;
}

export class SequenceIdGenerator implements IdGenerator {
  readonly #values: string[];

  constructor(values: readonly string[]) {
    this.#values = [...values];
  }

  next(): string {
    const value = this.#values.shift();
    if (!value) {
      throw new Error('No deterministic IDs remain');
    }
    return value;
  }
}
