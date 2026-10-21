# Drieziek Watch launch checklist

## Backend setup
- [ ] Create/connect the Supabase project for Drieziek Watch.
- [ ] Apply `supabase/migrations/20261021000000_initial_schema.sql` in the Supabase SQL Editor.
- [ ] Configure authentication (email confirmation and password reset).
- [ ] Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to Vercel and local `.env.local`.
- [ ] Deploy and test sign-up, sign-in, sign-out, report creation, photos, messages, and realtime updates.
- [ ] Assign staff roles only from a trusted admin process.
- [ ] Configure notification delivery and test it end-to-end.

## Safety and privacy before public launch
- [ ] Replace demo/starter incidents and messages with clearly marked examples or an empty live feed.
- [ ] Publish privacy notice and community rules; minimize collection of personal information.
- [ ] Decide who monitors alerts, coverage hours, and escalation procedure.
- [ ] Show a clear emergency disclaimer and local emergency contacts; do not promise dispatch.
- [ ] Test permissions with two resident accounts and a moderator account.
- [ ] Test abuse prevention, report moderation, photo access, and incident audit trail.
- [ ] Confirm data retention, deletion requests, backups, and incident response ownership.

## Important
The current deployed app is still a front-end prototype until the Supabase project is connected and the React app is updated to use it. Creating this SQL migration does not by itself make browser data shared or enable notifications.
