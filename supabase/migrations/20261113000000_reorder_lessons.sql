/*
# Renumber completed lessons for the new lesson order

1. Changes to Tables
- `learning_progress.completed_lessons`: each lesson number is mapped to its
  place in the new order.

     old  →  new
     1 Set up hardware wallet        → 1
     2 Withdraw Bitcoin from exchange → 5
     3 Recover hardware wallet       → 4
     4 Connect to wallet software    → 2
     5 Receiving Bitcoin             → 3
     6 Sending Bitcoin               → 6

2. Security
- No changes to RLS policies.

3. Important Notes
- Run this once, and deploy it together with the app build that uses the new
  order: an older build would keep writing old numbers.
- The browser copy of guest progress is converted by the app itself
  (src/lib/localProgress.ts, OLD_TO_NEW), which uses the same mapping.
- The 1–6 CHECK constraint is unchanged.
*/

UPDATE learning_progress
SET completed_lessons = ARRAY(
  SELECT DISTINCT CASE n WHEN 2 THEN 5 WHEN 3 THEN 4 WHEN 4 THEN 2 WHEN 5 THEN 3 ELSE n END
  FROM unnest(completed_lessons) AS n
  ORDER BY 1
)::smallint[]
WHERE completed_lessons && ARRAY[2, 3, 4, 5]::smallint[];
