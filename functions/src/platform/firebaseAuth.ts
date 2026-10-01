interface AuthUserDeletionGateway {
  deleteUser(id: string): Promise<void>;
}

function authErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const code = (error as { readonly code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

export async function deleteAuthUserIfPresent(
  auth: AuthUserDeletionGateway,
  id: string,
): Promise<void> {
  try {
    await auth.deleteUser(id);
  } catch (error) {
    if (authErrorCode(error) === 'auth/user-not-found') return;
    throw error;
  }
}
