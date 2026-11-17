import { ArrowRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { inAppClick } from '@/lib/links';
import fundamentalsImage from '@/components/path-fundamentals.webp';
import deeperImage from '@/components/path-deeper.webp';

type PathSelectorProps = {
  /** The roadmap's URL, so the card is a real link. */
  fundamentalsHref: string;
  onSelectFundamentals: () => void;
};

function PathSelector({ fundamentalsHref, onSelectFundamentals }: PathSelectorProps) {
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
          <a className="path-card path-card-fundamentals" href={fundamentalsHref} onClick={inAppClick(onSelectFundamentals)}>
            <div className="path-card-banner-wrap" aria-hidden="true">
              <img className="path-card-banner" src={fundamentalsImage} alt="" width={1200} height={560} decoding="async" />
            </div>
            <h2>{p.fundamentals}</h2>
            <p className="path-card-description">{p.fundamentalsDesc}</p>
            <span className="path-card-topics" role="list" aria-label={p.fundamentalsTopicsAria}>
              {p.fundamentalsTopics.map((topic) => <span key={topic} role="listitem">{topic}</span>)}
            </span>
            <div className="path-card-footer">
              <span className="path-card-action">{p.startLearning} <ArrowRight size={16} strokeWidth={2.3} /></span>
            </div>
          </a>

          <div className="path-card path-card-deeper" aria-disabled="true">
            <div className="path-card-banner-wrap" aria-hidden="true">
              <img className="path-card-banner" src={deeperImage} alt="" width={1200} height={560} decoding="async" />
            </div>
            <h2>{p.deeper}</h2>
            <p className="path-card-description">{p.deeperDesc}</p>
            <ul className="path-card-topics" aria-label={p.comingSoonLabel}>
              {p.deeperTopics.map((topic) => <li key={topic}>{topic}</li>)}
            </ul>
            <div className="path-card-footer">
              <span className="path-card-action">{p.comingSoon}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default PathSelector;
