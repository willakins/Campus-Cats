import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { mutateRelationalCore } from './mutationGateway';
import { createFirebaseRelationalAuthorization } from './firebaseCallableAuthorization';
import {
  createSupabaseRpc,
  RelationalReadError,
  SupabaseRpcError,
} from './readGateway';

/** Prepared mutation callable; SQL also checks the server-controlled domain switch. */
export function createFirebaseRelationalMutationHandler(configuration: {
  enabled: boolean;
  firebaseProjectId: string;
  termsVersion: string;
  supabaseUrl: string;
  supabaseSecretKey: string;
}) {
  const { authorizeLive, verifyRequest } =
    createFirebaseRelationalAuthorization(configuration);
  const rpc = createSupabaseRpc(
    configuration.supabaseUrl,
    configuration.supabaseSecretKey,
  );
  return async (request: CallableRequest<unknown>) => {
    const uid = await verifyRequest(request);
    try {
      return await mutateRelationalCore(uid, request.data, {
        enabled: configuration.enabled,
        firebaseProjectId: configuration.firebaseProjectId,
        authorizeLive,
        rpc,
      });
    } catch (error) {
      if (
        error instanceof RelationalReadError ||
        error instanceof SupabaseRpcError
      )
        throw new HttpsError(error.code, error.message);
      throw new HttpsError(
        'unavailable',
        'Database update is temporarily unavailable',
      );
    }
  };
}
