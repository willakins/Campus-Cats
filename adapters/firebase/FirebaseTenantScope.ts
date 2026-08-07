export class FirebaseTenantScope {
  #selectedClubId: string | undefined;
  #authenticatedClubId: string | undefined;

  get clubId(): string {
    const clubId = this.#authenticatedClubId ?? this.#selectedClubId;
    if (!clubId) throw new Error('Club identity is required');
    return clubId;
  }

  setSelectedClub(clubId: string): void {
    this.#selectedClubId = normalizedClubId(clubId);
  }

  clearSelectedClub(): void {
    this.#selectedClubId = undefined;
  }

  setAuthenticatedClub(clubId: string): void {
    this.#authenticatedClubId = normalizedClubId(clubId);
  }

  clearAuthenticatedClub(): void {
    this.#authenticatedClubId = undefined;
  }

  collection(collectionPath: string): string {
    return `clubs/${this.clubId}/${collectionPath}`;
  }

  media(path: string): string {
    return path.startsWith('clubs/')
      ? path
      : `clubs/${this.clubId}/${path}`;
  }
}

const normalizedClubId = (clubId: string): string => {
  const normalized = clubId.trim();
  if (!normalized) throw new Error('Club identity is required');
  return normalized;
};
