import { ArrowLeft, ArrowUpRight, GraduationCap, Mail, Mic, Users } from 'lucide-react';
import andyPortrait from '@/components/Andy.webp';
import { useI18n } from '@/lib/i18n';

// TODO: replace with the real contact address before going live.
export const CONTACT_EMAIL = 'hello@example.com';
export const CODE_ORANGE_URL = 'https://codeorange.dev/';

const ANDY_LINKS = [
  {
    label: 'X',
    href: 'https://x.com/andywong311',
    icon: (
      <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com/in/andy-wong-5051911b8',
    icon: (
      <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
      </svg>
    ),
  },
];

type Props = {
  onBack: () => void;
};

function CodeOrangeLogo({ height }: { height: number }) {
  return (
    <>
      <img
        className="footer-backer-logo--light"
        src="/code-orange-logo-light.png"
        alt="Code Orange dev school"
        style={{ height }}
      />
      <img
        className="footer-backer-logo--dark"
        src="/code-orange-logo-dark.png"
        alt="Code Orange dev school"
        style={{ height }}
      />
    </>
  );
}

const DOING_ICONS = [GraduationCap, Mic, Users];

export function AboutPage({ onBack }: Props) {
  const { t } = useI18n();
  const a = t.about;

  return (
    <main className="info-page about-page">
      <button className="info-back" type="button" onClick={onBack}>
        <ArrowLeft size={14} strokeWidth={2.4} />
        {t.header.backHome}
      </button>

      <header className="about-hero">
        <div className="about-avatar">
          <img src={andyPortrait} alt="" />
        </div>
        <div>
          <p className="info-eyebrow">{a.eyebrow}</p>
          <h1 className="info-title">
            {a.titleBefore}<em>{a.titleEm}</em>{a.titleAfter}
          </h1>
          <div className="info-socials">
            {ANDY_LINKS.map(({ label, href, icon }) => (
              <a key={label} className="info-social" href={href} target="_blank" rel="noopener noreferrer">
                {icon}
                {label}
              </a>
            ))}
          </div>
        </div>
      </header>

      <p className="about-bubble">{a.intro}</p>

      <blockquote className="about-quote">{a.quote}</blockquote>

      <section className="about-doing">
        <h2>{a.doingTitle}</h2>
        <ol>
          {a.doing.map(({ title, body }, i) => {
            const Icon = DOING_ICONS[i];
            return (
              <li key={title}>
                <span className="about-doing-icon">
                  <Icon size={20} strokeWidth={2.1} />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="about-closing">
        <p className="about-closing-q">{a.closingQuestion}</p>
        <p>{a.closing}</p>
      </section>

      <section className="info-backer">
        <div>
          <h2>{a.backerTitle}</h2>
          <p>{a.backerBody}</p>
        </div>
        <a className="info-backer-logo" href={CODE_ORANGE_URL} target="_blank" rel="noopener noreferrer">
          <CodeOrangeLogo height={44} />
        </a>
      </section>
    </main>
  );
}

export function ContactPage({ onBack }: Props) {
  const { t } = useI18n();
  const c = t.contact;

  return (
    <main className="info-page">
      <button className="info-back" type="button" onClick={onBack}>
        <ArrowLeft size={14} strokeWidth={2.4} />
        {t.header.backHome}
      </button>

      <p className="info-eyebrow">{c.eyebrow}</p>
      <h1 className="info-title">
        {c.titleBefore}<em>{c.titleEm}</em>{c.titleAfter}
      </h1>
      <p className="info-lead">{c.intro}</p>

      <div className="info-grid info-grid--two">
        <a className="info-card info-card--link" href={`mailto:${CONTACT_EMAIL}`}>
          <span className="info-card-icon">
            <Mail size={18} strokeWidth={2.1} />
          </span>
          <h2>{c.emailTitle}</h2>
          <p>{c.emailBody}</p>
          <span className="info-card-action">
            {CONTACT_EMAIL}
            <ArrowUpRight size={14} strokeWidth={2.4} />
          </span>
        </a>

        <a className="info-card info-card--link" href={CODE_ORANGE_URL} target="_blank" rel="noopener noreferrer">
          <span className="info-card-logo">
            <CodeOrangeLogo height={34} />
          </span>
          <h2>{c.codeOrangeTitle}</h2>
          <p>{c.codeOrangeBody}</p>
          <span className="info-card-action">
            codeorange.dev
            <ArrowUpRight size={14} strokeWidth={2.4} />
          </span>
        </a>
      </div>

      <p className="info-note">{c.note}</p>
    </main>
  );
}
