/*
# Expand learning progress to support 6 scenarios

1. Changes to Tables
- `learning_progress`:
  - Update the `completed_scenarios` CHECK constraint from 0–5 to 0–6.
  - This allows users to complete up to 6 missions.

2. Security
- No changes to RLS policies. Existing owner-scoped policies remain unchanged.

3. Important Notes
- Mission 4 is now "Connect wallet" (previously the send mission).
- Sending BTC is now mission 5 and Receiving BTC is mission 6.
- No data is lost — existing progress values (0–5) remain valid under the new 0–6 range.
- Users who previously completed 5 missions will see mission 6 unlocked.
*/

ALTER TABLE learning_progress DROP CONSTRAINT IF EXISTS learning_progress_completed_scenarios_check;

ALTER TABLE learning_progress ADD CONSTRAINT learning_progress_completed_scenarios_check
  CHECK (completed_scenarios BETWEEN 0 AND 6);
