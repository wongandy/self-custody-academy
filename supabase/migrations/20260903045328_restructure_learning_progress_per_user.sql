/*
# Restructure learning progress for per-user accounts

1. Changes to Tables
- `learning_progress`:
  - Replace `id` (text PK) with `user_id` (uuid PK, references auth.users).
  - Keep `completed_scenarios` (integer, 0–4).
  - Keep `updated_at` (timestamptz).
  - Add `created_at` (timestamptz, default now).

2. Security
- Drop the old shared anon/authenticated policies (they allowed anyone to read/write any row).
- Enable RLS (already enabled, stays enabled).
- Add owner-scoped policies: authenticated users can only SELECT, INSERT, UPDATE, and DELETE their own progress row (auth.uid() = user_id).
- Remove the prototype-learner seed row (no longer applicable).

3. Important Notes
- The old `id` column and its data are dropped because the schema changes from a single shared record to per-user records. Since this is a prototype with only test data, no real user data is lost.
- `user_id` defaults to auth.uid() so inserts from the frontend that omit user_id still satisfy the WITH CHECK policy.
- Anon role loses all access — progress is now private per authenticated user.
*/

-- Drop old policies
DROP POLICY IF EXISTS "Read shared learning progress" ON learning_progress;
DROP POLICY IF EXISTS "Create shared learning progress" ON learning_progress;
DROP POLICY IF EXISTS "Update shared learning progress" ON learning_progress;
DROP POLICY IF EXISTS "Delete shared learning progress" ON learning_progress;

-- Replace id column with user_id
ALTER TABLE learning_progress DROP CONSTRAINT IF EXISTS learning_progress_pkey;
ALTER TABLE learning_progress DROP COLUMN IF EXISTS id;
ALTER TABLE learning_progress ADD COLUMN IF NOT EXISTS user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE learning_progress ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Ensure completed_scenarios constraint still exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'learning_progress_completed_scenarios_check'
  ) THEN
    ALTER TABLE learning_progress ADD CONSTRAINT learning_progress_completed_scenarios_check
      CHECK (completed_scenarios BETWEEN 0 AND 4);
  END IF;
END $$;

-- New owner-scoped policies
CREATE POLICY "select_own_progress" ON learning_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_progress" ON learning_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_progress" ON learning_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_progress" ON learning_progress
  FOR DELETE TO authenticated USING (auth.uid() = user_id);