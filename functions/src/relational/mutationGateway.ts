import {
  authorizeRelationalMember,
  RelationalReadError,
  type ReadGatewayDependencies,
} from './readGateway';

/** Explicit mutations only; actor, project and club never come from the request body. */
export async function mutateRelationalCore(
  uid: string | undefined,
  input: unknown,
  dependencies: ReadGatewayDependencies,
): Promise<unknown> {
  const access = await authorizeRelationalMember(uid, dependencies);
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new RelationalReadError('invalid-argument', 'Invalid mutation');
  const data = input as Record<string, unknown>;
  if (
    data.operation !== 'setCatalogFavorite' ||
    typeof data.operationId !== 'string' ||
    !data.operationId.trim() ||
    data.operationId.length > 200 ||
    !(
      data.catalogId === null ||
      (typeof data.catalogId === 'string' &&
        !!data.catalogId.trim() &&
        data.catalogId.length <= 200)
    )
  )
    throw new RelationalReadError(
      'invalid-argument',
      'Invalid favorite request',
    );
  return dependencies.rpc('cc_set_catalog_favorite', {
    p_club: access.clubId,
    p_project: dependencies.firebaseProjectId,
    p_user_id: uid,
    p_role: access.role,
    p_operation_id: data.operationId,
    p_catalog_id: data.catalogId,
  });
}
