// The Fundamentals learning path, in order. The roadmap layout adapts to any count
// (desktop scrolls sideways past six). To add a lesson:
//   1. add it here;
//   2. add its title and description to `roadmap.titles` / `roadmap.descriptions` in every locale;
//   3. add its art (an SVG in LessonArt, or an image in its IMAGES map);
//   4. add its `scenario-N` screen and component in App.tsx;
//   5. add a Supabase migration widening the `completed_lessons` check, which currently
//      allows only 1–6 (see 20261110000000_add_completed_lessons.sql). Without it, saving
//      progress for the new lesson to an account fails.
export type Lesson = {
  number: number;
};

export const LESSONS: readonly Lesson[] = [
  { number: 1 },
  { number: 2 },
  { number: 3 },
  { number: 4 },
  { number: 5 },
  { number: 6 },
];

/** Lowest lesson not yet finished, or null when every lesson is done. */
export function firstUnfinished(done: ReadonlySet<number>, lessons: readonly Lesson[] = LESSONS): number | null {
  const found = lessons.find((lesson) => !done.has(lesson.number));
  return found ? found.number : null;
}
