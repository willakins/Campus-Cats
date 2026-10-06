import { getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { authorizedMemberRequest } from '../shared/firebaseCallableAccess';
import { firebaseClubAccessAllowed } from '../shared/firebaseClubAccess';
import { HandlerError } from '../shared/handlers';
import {
  FieldDefinition,
  handleSaveCustomFields,
  recordCollections,
} from '../shared/customFields';

function save(mode: 'definitions' | 'values') {
  return onCall(async (request) => {
    try {
      const verified = await authorizedMemberRequest(request);
      const firestore = getFirestore();
      await handleSaveCustomFields(
        { ...verified, mode, authTime: request.auth?.token.auth_time },
        {
          transact: (operation) =>
            firestore.runTransaction(async (transaction) =>
              operation({
                async load(uid, clubId, kind, id) {
                  const clubRef = firestore.doc(`clubs/${clubId}`);
                  const importedGuide =
                    kind === 'catalog' &&
                    id?.match(/^inat-guide-([1-9][0-9]*)$/);
                  const parent = id
                    ? clubRef
                        .collection(
                          importedGuide
                            ? 'inaturalist-guide-profiles'
                            : recordCollections[kind],
                        )
                        .doc(importedGuide ? importedGuide[1] : id)
                    : undefined;
                  const [
                    actor,
                    club,
                    definitions,
                    record,
                    contributor,
                    previous,
                  ] = await Promise.all([
                    transaction.get(firestore.doc(`users/${uid}`)),
                    transaction.get(clubRef),
                    transaction.get(
                      clubRef.collection('custom-field-definitions').doc(kind),
                    ),
                    parent ? transaction.get(parent) : undefined,
                    id && kind === 'sighting'
                      ? transaction.get(
                          clubRef
                            .collection('content-contributors')
                            .doc(`sighting__${id}`),
                        )
                      : undefined,
                    id
                      ? transaction.get(
                          clubRef
                            .collection('custom-field-values')
                            .doc(`${kind}__${id}`),
                        )
                      : undefined,
                  ]);
                  return {
                    actor: actor.data(),
                    clubAccessible: firebaseClubAccessAllowed(club.data()),
                    fields: (definitions.data()?.fields ??
                      []) as FieldDefinition[],
                    record: record
                      ? {
                          exists: record.exists,
                          path: record.ref.path,
                          ownerId:
                            contributor?.data()?.user?.id ??
                            record.data()?.createdBy?.id,
                        }
                      : undefined,
                    previousValues: previous?.data()?.values,
                  };
                },
                saveDefinitions(clubId, kind, fields) {
                  transaction.set(
                    firestore.doc(
                      `clubs/${clubId}/custom-field-definitions/${kind}`,
                    ),
                    { fields },
                  );
                },
                saveValues(clubId, kind, id, recordPath, values) {
                  transaction.set(
                    firestore.doc(
                      `clubs/${clubId}/custom-field-values/${kind}__${id}`,
                    ),
                    {
                      kind,
                      recordId: id,
                      recordCollection: recordPath.split('/')[2],
                      parentId: recordPath.split('/')[3],
                      values,
                    },
                  );
                },
              }),
            ),
        },
      );
      return { saved: true };
    } catch (error) {
      if (error instanceof HandlerError)
        throw new HttpsError(error.code, error.message);
      throw error;
    }
  });
}
export const saveCustomFieldDefinitions = save('definitions');
export const saveCustomFieldValues = save('values');
