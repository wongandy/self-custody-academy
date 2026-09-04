/*
# Create learning progress for the no-login academy prototype

1. New Tables
- `learning_progress`
- `id` (text, primary key): fixed identifier for the single prototype learner.
- `completed_scenarios` (integer): number of completed scenarios, from 0 through 4.
- `updated_at` (timestamptz): timestamp of the latest progress update.

2. Security
- Enable Row Level Security on `learning_progress`.
- Allow the anonymous and authenticated app roles to read, create, update, and delete the intentionally shared prototype progress record.

3. Important Notes
- This is a no-login prototype, so progress is shared by visitors until account-based profiles are introduced.
- The initial record starts at 0 of 4 completed scenarios.
*/

CREATE TABLE IF NOT EXISTS learning_progress (
  id text PRIMARY KEY,
  completed_scenarios integer NOT NULL DEFAULT 0 CHECK (completed_scenarios BETWEEN 0 AND 4),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read shared learning progress" ON learning_progress;
CREATE POLICY "Read shared learning progress" ON learning_progress
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Create shared learning progress" ON learning_progress;
CREATE POLICY "Create shared learning progress" ON learning_progress
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Update shared learning progress" ON learning_progress;
CREATE POLICY "Update shared learning progress" ON learning_progress
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Delete shared learning progress" ON learning_progress;
CREATE POLICY "Delete shared learning progress" ON learning_progress
  FOR DELETE TO anon, authenticated USING (true);

INSERT INTO learning_progress (id, completed_scenarios)
VALUES ('prototype-learner', 0)
ON CONFLICT (id) DO NOTHING;