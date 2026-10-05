import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { createFirebaseRelationalAuthorization } from './firebaseCallableAuthorization';
import {
  createSupabaseRpc,
  readRelationalCore,
  RelationalReadError,
  SupabaseRpcError,
} from './readGateway';

/** Prepared for a preview callable; intentionally not exported by functions/src/index.ts yet. */
export function createFirebaseRelationalReadHandler(configuration: {
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
      return await readRelationalCore(uid, request.data, {
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
        'Database read is temporarily unavailable',
      );
    }
  };
}
