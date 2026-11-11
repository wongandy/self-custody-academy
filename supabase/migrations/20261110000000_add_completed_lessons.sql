/*
# Track completed lessons individually

1. Changes to Tables
- `learning_progress`:
  - Add `completed_lessons smallint[]` — the set of lesson numbers (1–6) the user has finished.
  - Backfill from `completed_scenarios` (a count N meant lessons 1..N were done).

2. Security
- No changes to RLS policies.

3. Important Notes
- Lessons can now be taken in any order, so a single count no longer describes progress.
- `completed_scenarios` is kept for now but is no longer read by the app; it can be dropped later.
*/

ALTER TABLE learning_progress
  ADD COLUMN IF NOT EXISTS completed_lessons smallint[] NOT NULL DEFAULT '{}';

UPDATE learning_progress
SET completed_lessons = ARRAY(SELECT generate_series(1, completed_scenarios))::smallint[]
WHERE completed_scenarios > 0 AND completed_lessons = '{}';

ALTER TABLE learning_progress DROP CONSTRAINT IF EXISTS learning_progress_completed_lessons_check;

ALTER TABLE learning_progress ADD CONSTRAINT learning_progress_completed_lessons_check
  CHECK (completed_lessons <@ ARRAY[1, 2, 3, 4, 5, 6]::smallint[]);
