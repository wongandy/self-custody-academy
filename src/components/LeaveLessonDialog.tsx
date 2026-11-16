import { useEffect, useRef } from 'react';
import { useI18n } from '@/lib/i18n';

type Props = {
  onStay: () => void;
  onLeave: () => void;
};

// Asks before leaving a lesson: lessons don't save mid-lesson progress.
export default function LeaveLessonDialog({ onStay, onLeave }: Props) {
  const { t } = useI18n();
  const copy = t.header.leaveLesson;
  const stayRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    stayRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onStay();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStay]);

  return (
    <div className="leave-dialog-backdrop" onClick={onStay}>
      <div
        className="leave-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="leave-dialog-title"
        aria-describedby="leave-dialog-body"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="leave-dialog-title">{copy.title}</h2>
        <p id="leave-dialog-body">{copy.body}</p>
        <div className="leave-dialog-actions">
          <button className="leave-dialog-leave" type="button" onClick={onLeave}>
            {copy.leave}
          </button>
          <button ref={stayRef} className="primary-button" type="button" onClick={onStay}>
            {copy.stay}
          </button>
        </div>
      </div>
    </div>
  );
}
