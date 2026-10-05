function deadlineAllows(value: unknown, now: Date): boolean {
  if (value === null || value === undefined) return true;
  return (
    value instanceof Date && Number.isFinite(value.getTime()) && now < value
  );
}

export function clubAccessAllowed(
  club: Record<string, unknown> | undefined,
  now: Date,
): boolean {
  return (
    !!club &&
    club.maintenanceMode !== true &&
    (club.billingEnforcementEnabled !== true ||
      (club.accessState === 'enabled' &&
        deadlineAllows(club.graceEndsAt, now) &&
        deadlineAllows(club.scheduledEndAt, now)))
  );
}
