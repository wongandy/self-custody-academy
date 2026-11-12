import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, GraduationCap, MapPin, Mic, Send, Users, X } from 'lucide-react';
import andyPortrait from '@/components/Andy.webp';
import eventBitJakarta from '@/components/event-bit-jakarta.webp';
import eventBitmelaPanel from '@/components/event-bitmela-panel.webp';
import eventBitmelaAndy from '@/components/event-bitmela-andy.webp';
import { useI18n } from '@/lib/i18n';

// Web3Forms access key. Messages sent through the contact form are delivered
// to the inbox this key was created for. The key is meant to be public.
const WEB3FORMS_ACCESS_KEY = '0344cb22-30fb-4914-a79e-516bddc03e78';
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

const DOING_ICONS = [GraduationCap, Mic, Users];

// Photos for the "Out in the wild" wall, in the same order as `about.events` in the locales.
const EVENT_PHOTOS = [
  { src: eventBitJakarta, width: 1024, height: 768 },
  { src: eventBitmelaPanel, width: 1280, height: 961, link: { text: 'Bitmela', href: 'https://thebitmela.com/' } },
  { src: eventBitmelaAndy, width: 768, height: 1024 },
];

// Turns the first mention of `link.text` in a caption into a link.
function captionWithLink(caption: string, link?: { text: string; href: string }): ReactNode {
  if (!link || !caption.includes(link.text)) return caption;
  const [before, ...rest] = caption.split(link.text);
  return (
    <>
      {before}
      <a href={link.href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
        {link.text}
      </a>
      {rest.join(link.text)}
    </>
  );
}

function EventWall() {
  const { t } = useI18n();
  const a = t.about;
  const [open, setOpen] = useState<number | null>(null);
  const count = EVENT_PHOTOS.length;

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight') setOpen((i) => (i === null ? i : (i + 1) % count));
      if (e.key === 'ArrowLeft') setOpen((i) => (i === null ? i : (i - 1 + count) % count));
    };
    window.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, count]);

  const current = open === null ? null : { photo: EVENT_PHOTOS[open], text: a.events[open] };

  return (
    <section className="about-events">
      <h2>{a.eventsTitle}</h2>
      <p className="about-events-intro">{a.eventsIntro}</p>

      <div className="polaroid-wall">
        {EVENT_PHOTOS.map((photo, i) => {
          const text = a.events[i];
          const portrait = photo.height > photo.width;
          return (
            <figure key={photo.src} className={`polaroid polaroid--${i + 1}${portrait ? ' polaroid--portrait' : ''}`}>
              <button type="button" className="polaroid-photo" onClick={() => setOpen(i)} aria-label={`${a.eventsEnlarge}: ${text.alt}`}>
                <img src={photo.src} alt={text.alt} width={photo.width} height={photo.height} loading="lazy" />
              </button>
              <figcaption>
                <span className="polaroid-pin">
                  <MapPin size={11} strokeWidth={2.4} />
                  {text.place}
                </span>
                <span className="polaroid-caption">{captionWithLink(text.caption, photo.link)}</span>
              </figcaption>
            </figure>
          );
        })}
      </div>

      {current && open !== null && (
        <div className="event-lightbox" role="dialog" aria-modal="true" aria-label={current.text.alt} onClick={() => setOpen(null)}>
          <button type="button" className="event-lightbox-close" onClick={() => setOpen(null)} aria-label={a.eventsClose}>
            <X size={22} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            className="event-lightbox-nav event-lightbox-nav--prev"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((open - 1 + count) % count);
            }}
            aria-label={a.eventsPrev}
          >
            <ChevronLeft size={26} strokeWidth={2.2} />
          </button>
          <figure className="event-lightbox-figure" onClick={(e) => e.stopPropagation()}>
            <img src={current.photo.src} alt={current.text.alt} width={current.photo.width} height={current.photo.height} />
            <figcaption>
              <span className="polaroid-pin">
                <MapPin size={11} strokeWidth={2.4} />
                {current.text.place}
              </span>
              <span className="polaroid-caption">{captionWithLink(current.text.caption, current.photo.link)}</span>
            </figcaption>
          </figure>
          <button
            type="button"
            className="event-lightbox-nav event-lightbox-nav--next"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((open + 1) % count);
            }}
            aria-label={a.eventsNext}
          >
            <ChevronRight size={26} strokeWidth={2.2} />
          </button>
        </div>
      )}
    </section>
  );
}

// Turns each "Code Orange" mention into a link to the school's site.
function withCodeOrangeLink(text: string) {
  const parts = text.split('Code Orange');
  return parts.flatMap((part, i) =>
    i === 0
      ? [part]
      : [
          <a key={i} href={CODE_ORANGE_URL} target="_blank" rel="noopener noreferrer">
            Code Orange
          </a>,
          part,
        ],
  );
}

export function AboutPage() {
  const { t } = useI18n();
  const a = t.about;

  return (
    <main className="info-page about-page">
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

      <div className="about-bubble">
        {a.intro.map((para) => (
          <p key={para}>{para}</p>
        ))}
      </div>

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
                  <p>{withCodeOrangeLink(body)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <EventWall />

      <section className="about-closing">
        <p className="about-closing-q">{a.closingQuestion}</p>
        <p>{a.closing}</p>
      </section>
    </main>
  );
}

type SendStatus = 'idle' | 'sending' | 'sent' | 'error';

export function ContactPage() {
  const { t } = useI18n();
  const c = t.contact;
  const [status, setStatus] = useState<SendStatus>('idle');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus('sending');

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
          subject: `Self-Custody Academy: message from ${data.get('name')}`,
          from_name: 'Self-Custody Academy',
          name: data.get('name'),
          email: data.get('email'),
          message: data.get('message'),
          botcheck: data.get('botcheck'),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);
      form.reset();
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }

  return (
    <main className="info-page">
      <p className="info-eyebrow">{c.eyebrow}</p>
      <h1 className="info-title">
        {c.titleBefore}<em>{c.titleEm}</em>{c.titleAfter}
      </h1>
      <p className="info-lead">{c.intro}</p>

      {status === 'sent' ? (
        <div className="contact-sent" role="status">
          <CheckCircle2 size={22} strokeWidth={2.1} />
          <div>
            <h2>{c.sentTitle}</h2>
            <p>{c.sentBody}</p>
            <button type="button" className="contact-again" onClick={() => setStatus('idle')}>
              {c.sendAnother}
            </button>
          </div>
        </div>
      ) : (
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="contact-row">
            <label className="contact-field">
              <span>{c.nameLabel}</span>
              <input name="name" type="text" autoComplete="name" required maxLength={100} />
            </label>
            <label className="contact-field">
              <span>{c.emailLabel}</span>
              <input name="email" type="email" autoComplete="email" required maxLength={200} />
            </label>
          </div>
          <label className="contact-field">
            <span>{c.messageLabel}</span>
            <textarea name="message" rows={6} required maxLength={5000} />
          </label>
          {/* Honeypot: hidden from people, bots fill it in and get dropped. */}
          <input type="checkbox" name="botcheck" className="contact-honeypot" tabIndex={-1} autoComplete="off" />

          {status === 'error' && (
            <p className="contact-error" role="alert">{c.errorBody}</p>
          )}

          <button className="primary-button contact-submit" type="submit" disabled={status === 'sending'}>
            {status === 'sending' ? c.sending : c.submit}
            <Send size={15} strokeWidth={2.4} />
          </button>
        </form>
      )}

      <p className="info-note">{c.note}</p>
    </main>
  );
}
