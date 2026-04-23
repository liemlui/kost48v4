Patch applied for reserved booking UX hardening and admin stays cleanup.

Included in this batch:
- expiresAt display hardening for booking rows and tenant booking list
- defensive API normalization for `expiresAt` / alias fields in stays + tenant bookings
- expired booking badge and helper text in admin + tenant surfaces
- quick access button to switch into Booking Reserved mode from Stays page
- fix duplicate / wrong pagination block in Stays operasional mode

Backend approval, invoice generation on approval, and room/stay status transition after approval are still not implemented in this frontend-only artifact because they require the Phase 4.1 backend endpoints and business logic.
