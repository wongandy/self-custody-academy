/*
# Add wallet_transactions column to learning_progress

1. Changes to Tables
   - `learning_progress`:
     - Add `wallet_transactions` (jsonb, default `[]`): the payments the learner
       made in the simulated wallet, in story order — Lesson 3's receive,
       Lesson 5's exchange withdrawal and Lesson 6's send. Each entry is
       `{ kind, at, amount_sats, fee_sats, fee_rate?, balance_sats, address }`,
       where `at` is the ISO time the learner made the payment and
       `amount_sats` is signed (negative for the send, fee included).

2. Security
   - No changes to RLS policies. The existing owner-scoped policies cover the
     new column because they are table-level, not column-level.

3. Important Notes
   - Existing rows get an empty list; the app estimates dates for payments
     made before this column existed.
   - Replaying a lesson replaces its payment and drops the ones after it.
   - Simulation data only — no real Bitcoin.
*/

ALTER TABLE learning_progress
  ADD COLUMN IF NOT EXISTS wallet_transactions jsonb NOT NULL DEFAULT '[]'::jsonb;
