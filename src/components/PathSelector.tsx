import { ArrowRight } from 'lucide-react';
import andyPortrait from '@/components/Andy.webp';
import { useI18n } from '@/lib/i18n';

type PathSelectorProps = {
  onSelectFundamentals: () => void;
};

/* Hardware wallet resting on a 12-word recovery card */
function FundamentalsArt() {
  return (
    <svg className="path-card-art" viewBox="0 0 240 132" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <g className="path-art-back" transform="rotate(-7 82 70)">
        <rect x="22" y="22" width="120" height="88" rx="10" strokeWidth="1.4" />
        {[0, 1, 2, 3].map((row) => (
          <g key={row} strokeWidth="1.4">
            <line x1="36" y1={42 + row * 17} x2="66" y2={42 + row * 17} />
            <line x1="76" y1={42 + row * 17} x2="96" y2={42 + row * 17} />
            <line x1="106" y1={42 + row * 17} x2="128" y2={42 + row * 17} />
          </g>
        ))}
      </g>
      <g className="path-art-front">
        <rect className="path-art-solid" x="118" y="16" width="86" height="104" rx="14" strokeWidth="1.8" />
        <rect x="130" y="30" width="62" height="40" rx="5" strokeWidth="1.6" />
        <path d="M150 50l7 7 14-14" strokeWidth="2.2" />
        <circle cx="146" cy="94" r="7" strokeWidth="1.6" />
        <circle cx="176" cy="94" r="7" strokeWidth="1.6" />
      </g>
    </svg>
  );
}

/* Three keys converging on one vault: 2-of-3 multisig */
function DeeperArt() {
  return (
    <svg className="path-card-art" viewBox="0 0 240 132" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <g className="path-art-back" strokeWidth="1.4" strokeDasharray="3 5">
        <path d="M52 30 Q90 40 104 58" />
        <path d="M52 104 Q90 94 104 76" />
        <path d="M188 30 Q150 40 136 58" />
      </g>
      <g className="path-art-front">
        <path className="path-art-solid" d="M120 34l26 10v20c0 17-11 29-26 35-15-6-26-18-26-35V44z" strokeWidth="1.8" />
        <circle cx="120" cy="62" r="6" strokeWidth="1.6" />
        <line x1="120" y1="68" x2="120" y2="78" strokeWidth="1.6" />
      </g>
      {[
        [40, 30],
        [40, 104],
        [200, 30],
      ].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`} className="path-art-front" strokeWidth="1.6">
          <circle cx={cx} cy={cy} r="12" />
          <circle cx={cx} cy={cy} r="3.5" />
        </g>
      ))}
    </svg>
  );
}

function PathSelector({ onSelectFundamentals }: PathSelectorProps) {
  const { t } = useI18n();
  const p = t.pathSelector;
  const lessonCount = p.lessonCount.replace('{count}', String(t.roadmap.titles.length));

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
              <span className="path-card-number">01 · {lessonCount}</span>
              <span className="path-card-status"><span className="path-card-dot" aria-hidden="true" />{p.availableNow}</span>
            </div>
            <div className="path-card-symbols" aria-hidden="true"><FundamentalsArt /></div>
            <h2>{p.fundamentals}</h2>
            <p className="path-card-description">{p.fundamentalsDesc}</p>
            <p className="path-card-includes"><strong>{p.includesLabel}</strong> {p.fundamentalsIncludes}</p>
            <div className="path-card-footer">
              <span className="path-card-action">{p.startLearning} <ArrowRight size={16} strokeWidth={2.3} /></span>
              <span className="path-card-andy"><img src={andyPortrait} alt="" />{p.recommendedByAndy}</span>
            </div>
          </button>

          <div className="path-card path-card-deeper" aria-disabled="true">
            <div className="path-card-topline">
              <span className="path-card-number">02</span>
              <span className="path-card-status">{p.comingSoon}</span>
            </div>
            <div className="path-card-symbols" aria-hidden="true"><DeeperArt /></div>
            <h2>{p.deeper}</h2>
            <p className="path-card-description">{p.deeperDesc}</p>
            <ul className="path-card-topics" aria-label={p.comingSoonLabel}>
              {p.deeperTopics.map((topic) => <li key={topic}>{topic}</li>)}
            </ul>
            <div className="path-card-footer">
              <span className="path-card-action">{p.inPreparation}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default PathSelector;
