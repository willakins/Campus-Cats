const DEFAULT_CLUB_ID = 'campus-cats';

export class FirebaseTenantScope {
  #clubId = DEFAULT_CLUB_ID;

  get clubId(): string {
    return this.#clubId;
  }

  setClubId(clubId: string): void {
    const normalized = clubId.trim();
    if (!normalized) throw new Error('Club identity is required');
    this.#clubId = normalized;
  }

  reset(): void {
    this.#clubId = DEFAULT_CLUB_ID;
  }

  collection(collectionPath: string): string {
    return `clubs/${this.#clubId}/${collectionPath}`;
  }

  media(path: string): string {
    return path.startsWith('clubs/')
      ? path
      : `clubs/${this.#clubId}/${path}`;
  }
}
