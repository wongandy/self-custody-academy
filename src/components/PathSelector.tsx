import { ArrowRight, Clock3, KeyRound, LockKeyhole, WalletCards } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

type PathSelectorProps = {
  onSelectFundamentals: () => void;
};

function PathSelector({ onSelectFundamentals }: PathSelectorProps) {
  const { t } = useI18n();
  const p = t.pathSelector;
  return (
    <main className="path-selector-page">
      <div className="path-selector-content">
        <div className="path-selector-heading">
          <span className="path-selector-kicker">{p.kicker}</span>
          <h1>{p.title}</h1>
          <p>{p.subtitle}</p>
        </div>

        <div className="path-selector-options" aria-label={p.pathsAria}>
          <button className="path-card path-card-fundamentals" type="button" onClick={onSelectFundamentals}>
            <div className="path-card-topline">
              <span className="path-card-number">01</span>
              <span className="path-card-status">{p.availableNow}</span>
            </div>
            <div className="path-card-symbols" aria-hidden="true">
              <span className="path-card-symbol path-card-symbol-large"><LockKeyhole size={38} strokeWidth={1.8} /></span>
              <span className="path-card-symbol path-card-symbol-small"><WalletCards size={30} strokeWidth={1.8} /></span>
            </div>
            <h2>{p.fundamentals}</h2>
            <p className="path-card-description">{p.fundamentalsDesc}</p>
            <p className="path-card-includes"><strong>{p.includesLabel}</strong> {p.fundamentalsIncludes}</p>
            <span className="path-card-action">{p.startLearning} <ArrowRight size={16} strokeWidth={2.3} /></span>
          </button>

          <div className="path-card path-card-deeper" aria-disabled="true">
            <div className="path-card-topline">
              <span className="path-card-number">02</span>
              <span className="path-card-status">{p.comingSoon}</span>
            </div>
            <div className="path-card-symbols" aria-hidden="true">
              <span className="path-card-symbol path-card-symbol-large"><KeyRound size={38} strokeWidth={1.8} /></span>
              <span className="path-card-symbol path-card-symbol-small"><Clock3 size={30} strokeWidth={1.8} /></span>
            </div>
            <h2>{p.deeper}</h2>
            <p className="path-card-description">{p.deeperDesc}</p>
            <p className="path-card-includes"><strong>{p.comingSoonLabel}</strong> {p.deeperIncludes}</p>
            <span className="path-card-action">{p.inPreparation}</span>
          </div>
        </div>
      </div>
    </main>
  );
}

export default PathSelector;
