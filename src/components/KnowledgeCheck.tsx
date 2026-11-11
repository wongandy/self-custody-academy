import { useCallback, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { fmt, useI18n } from '@/lib/i18n';

// The end-of-lesson check-in: the mentor asks a few questions, one at a time,
// and the lesson finishes once each has been answered correctly. The answer key
// lives here in code; the wording lives in the lesson's dictionary section
// (`knowledgePrompts` and `questions`, in the same order as the answer key).

export type KnowledgeQuestion = {
  optionIds: readonly string[];
  correctId: string;
};

export type KnowledgeCopy = {
  readonly knowledgePrompts: readonly string[];
  readonly questions: readonly {
    readonly question: string;
    readonly options: { readonly [id: string]: string };
    readonly correctLine: string;
  }[];
};

type Feedback = 'prompt' | 'wrong' | 'correct';

function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function useKnowledgeCheck(questions: readonly KnowledgeQuestion[], copy: KnowledgeCopy, onFinish: () => void) {
  const { t } = useI18n();
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  // Options are shuffled on every start; the questions keep their order so
  // each prompt line matches the question it introduces.
  const [optionOrder, setOptionOrder] = useState<string[][]>([]);
  const [feedback, setFeedback] = useState<Feedback>('prompt');
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [wrongAttempt, setWrongAttempt] = useState(0);

  const question = questions[index] ?? questions[0];
  const text = copy.questions[index] ?? copy.questions[0];
  const answered = feedback === 'correct';
  const isLast = index >= questions.length - 1;

  const mentorLine = feedback === 'wrong'
    ? t.common.wrongAnswer
    : feedback === 'correct'
      ? text.correctLine
      : copy.knowledgePrompts[index] ?? copy.knowledgePrompts[0];
  // Changes on every wrong attempt too, so the same "not quite" line types out again.
  const mentorKey = `knowledge-check-${index}-${feedback}-${wrongAttempt}`;

  const resetAnswer = () => {
    setFeedback('prompt');
    setWrongId(null);
    setWrongAttempt(0);
  };

  const start = useCallback(() => {
    setOptionOrder(questions.map((q) => shuffled(q.optionIds)));
    setIndex(0);
    resetAnswer();
    setActive(true);
  }, [questions]);

  const choose = (optionId: string) => {
    if (answered) return;
    if (optionId === question.correctId) {
      setWrongId(null);
      setFeedback('correct');
      return;
    }
    setWrongId(optionId);
    setWrongAttempt((attempt) => attempt + 1);
    setFeedback('wrong');
  };

  const advance = () => {
    if (!answered) return;
    if (!isLast) {
      setIndex((current) => current + 1);
      resetAnswer();
      return;
    }
    onFinish();
  };

  return {
    active,
    index,
    total: questions.length,
    question,
    text,
    options: optionOrder[index] ?? [...question.optionIds],
    answered,
    wrongId,
    isLast,
    mentorLine,
    mentorKey,
    start,
    choose,
    advance,
  };
}

export type KnowledgeCheck = ReturnType<typeof useKnowledgeCheck>;

export function KnowledgeCheckKicker() {
  const { t } = useI18n();
  return <div className="knowledge-check-kicker">{t.quiz.checkIn}</div>;
}

/** The question card. `ready` is false while the mentor is still typing her line. */
export function KnowledgeCheckCard({ check, ready }: { check: KnowledgeCheck; ready: boolean }) {
  const { t } = useI18n();
  const canAnswer = ready && !check.answered;
  return (
    <div className="knowledge-check-card" role="group" aria-label={t.quiz.groupAria}>
      <div className="knowledge-check-header">
        <span>{fmt(t.quiz.progress, { current: check.index + 1, total: check.total })}</span>
      </div>
      <p className="knowledge-check-question">{check.text.question}</p>
      <div className="knowledge-check-options">
        {check.options.map((optionId) => {
          const isCorrect = check.answered && optionId === check.question.correctId;
          const isWrong = check.wrongId === optionId;
          return (
            <button
              key={optionId}
              type="button"
              className={`knowledge-check-option ${isCorrect ? 'selected correct' : ''} ${isWrong ? 'wrong' : ''}`}
              onClick={() => check.choose(optionId)}
              disabled={!canAnswer}
            >
              {isCorrect ? <CheckCircle2 size={16} strokeWidth={2.2} /> : isWrong ? <XCircle size={16} strokeWidth={2.2} /> : null}
              <span>{check.text.options[optionId] ?? optionId}</span>
            </button>
          );
        })}
      </div>
      <button
        className="knowledge-check-submit"
        type="button"
        onClick={check.advance}
        disabled={!check.answered || !ready}
      >
        {check.isLast ? t.quiz.finish : t.quiz.next}
      </button>
    </div>
  );
}
