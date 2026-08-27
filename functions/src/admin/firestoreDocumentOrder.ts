/**
 * Match Firestore's UTF-8 byte ordering for document IDs.
 *
 * Do not use localeCompare here: its locale-aware ordering can differ from the
 * order returned by `orderBy(FieldPath.documentId())`, which makes otherwise
 * identical document sets produce different aggregate checksums.
 */
export function compareFirestoreDocumentIds(left: string, right: string): number {
  return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}
