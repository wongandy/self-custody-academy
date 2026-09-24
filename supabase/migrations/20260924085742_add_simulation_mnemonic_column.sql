/*
# Add simulation_mnemonic column to learning_progress

1. Changes to Tables
   - `learning_progress`:
     - Add `simulation_mnemonic` (text, nullable): stores the 12-word BIP39
       recovery phrase generated during Mission 1 so it can be retrieved in
       Mission 3 (wallet recovery).  The phrase is stored as a space-separated
       string.  NULL means the learner has not yet generated a wallet.

2. Security
   - No changes to RLS policies.  The existing owner-scoped policies
     (select/insert/update/delete own progress) automatically cover the new
     column because they are table-level, not column-level.

3. Important Notes
   - The column is nullable so existing rows (learners who completed missions
     before this feature) are not affected.
   - When a learner redoes Mission 1, the new phrase overwrites the old one
     via an UPDATE.
   - The phrase is a SIMULATION phrase only — it controls no real Bitcoin.
*/

ALTER TABLE learning_progress
  ADD COLUMN IF NOT EXISTS simulation_mnemonic text;
