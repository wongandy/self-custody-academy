/*
# Expand learning progress to support 5 scenarios

1. Changes to Tables
- `learning_progress`:
  - Update the `completed_scenarios` CHECK constraint from 0–4 to 0–5.
  - This allows users to complete up to 5 missions instead of 4.

2. Security
- No changes to RLS policies. Existing owner-scoped policies remain unchanged.

3. Important Notes
- The new third mission (Recover hardware wallet) is inserted between
  the existing withdraw mission (mission 2) and the send mission (now mission 4).
- The receive mission is now mission 5.
- No data is lost — existing progress values (0–4) remain valid under the new 0–5 range.
- Users who previously completed 4 missions will see mission 5 unlocked.
*/

-- Drop the old 0-4 constraint and add the new 0-5 constraint
ALTER TABLE learning_progress DROP CONSTRAINT IF EXISTS learning_progress_completed_scenarios_check;

ALTER TABLE learning_progress ADD CONSTRAINT learning_progress_completed_scenarios_check
  CHECK (completed_scenarios BETWEEN 0 AND 5);
