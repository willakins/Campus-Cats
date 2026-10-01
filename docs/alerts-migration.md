# Alerts data migration

Alerts replace the former announcements concept throughout the application.

| Data                 | Legacy name                                        | Canonical name                       |
| -------------------- | -------------------------------------------------- | ------------------------------------ |
| Firestore content    | `announcements`                                    | `alerts`                             |
| Firestore read state | `announcement-read-receipts` with `announcementId` | `alert-read-receipts` with `alertId` |
| Storage media        | `announcements/`                                   | `alerts/`                            |

The admin migration is dry-run by default. It discovers only the expected root and
`clubs/{clubId}` Firestore collections and the exact tenant media path, copies
documents without changing their IDs, converts the read-receipt field, copies media,
and verifies the targets. It refuses to overwrite target data or media that differs
from the source.

```bash
npm --prefix functions run admin:rename-alerts -- \
  --project=campus-cats-development

npm --prefix functions run admin:rename-alerts -- \
  --project=campus-cats-development \
  --apply
```

Use `campuscats-d7a5e` for production. The script uses
`GOOGLE_APPLICATION_CREDENTIALS` when provided and otherwise uses the account from
`npx firebase login` through a temporary, permission-restricted ADC file.

## Cutover

1. Run the dry run and an `--apply` copy.
2. Deploy the application, Functions, Firestore rules, and Storage rules using only
   the canonical Alerts names.
3. After verifying the canonical data, rerun with
   `--apply --delete-source --confirm-delete-source`.

`--delete-source` is intentionally separate because Firestore does not provide an
atomic collection rename. Its extra confirmation flag prevents accidental source
deletion.
