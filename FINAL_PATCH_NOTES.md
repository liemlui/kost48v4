# Final Patch Notes

## Frontend patched
- Hardened global 401 handling via Axios response interceptor.
- Fixed dashboard stat card variant typing/build issue.
- Fixed stay mutation invalidation so stay/invoice/room/tenant/dashboard/portal surfaces refresh more consistently.
- Fixed meter reading invalidation mismatch by using `roomId` in `AddMeterReadingModal`.
- Replaced free-text `stayPurpose` and `bookingSource` inputs in `CheckInWizard` with enum-safe selects.
- Added explicit `FORFEIT` option and clearer deposit action handling in `ProcessDepositModal`.
- Switched meter summary in `MeterTab` to derive initial values from baseline `MeterReading` data instead of non-source-of-truth stay fields, and corrected first-row usage to start from 0.
- Rebuilt production frontend bundle and refreshed `/frontend-dist` from latest source.

## Backend patched
- Replaced `bcrypt` with `bcryptjs` imports in runtime/admin utility files to avoid native binary dependency in source.
- Hardened `renewStay` logic for open-ended stays so renewal period starts from a logical current period instead of reusing historical check-in date.
- Added helper date normalization in stay renewal path.

## Verification notes
- Frontend build succeeded in the container.
- Backend source was patched, but full backend dependency install/build could not be re-verified in this environment because npm registry/auth resolution was unstable during install.
