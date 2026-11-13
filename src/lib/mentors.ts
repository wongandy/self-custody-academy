import andyPortrait from '@/components/Andy.webp';
import mariaPortrait from '@/components/Maria.webp';

// `nudge` is the `common` line each mentor says when the learner clicks
// something the lesson isn't asking for.
export const MENTORS = {
  andy: { name: 'Andy', portrait: andyPortrait, nudge: 'nudge' },
  maria: { name: 'Maria', portrait: mariaPortrait, nudge: 'nudgeLater' },
} as const;

export type MentorId = keyof typeof MENTORS;

/**
 * Who teaches the wallet-software lessons (4–6). Andy teaches them for now;
 * set this to 'maria' to bring Maria back: Lesson 4 then opens with Andy
 * handing over to her (`lesson4.andy` + `lesson4.maria`) and she takes
 * Lessons 5 and 6. With Andy it opens with `lesson4.solo` instead.
 */
export const WALLET_LESSONS_MENTOR = 'andy' as MentorId;

export const walletLessonsMentor = MENTORS[WALLET_LESSONS_MENTOR];
