// Per-page <head> tags, so each URL tells search engines and link previews what it is.
// index.html holds the home page's tags; they're the defaults restored on "/".

export const SITE_ORIGIN = 'https://selfcustody.academy';
export const SITE_NAME = 'Self-Custody Academy';

export type PageMeta = {
  /** Page name, shown as "<title> · Self-Custody Academy". Omit for the home page title. */
  title?: string;
  /** Omit to keep the home page description. */
  description?: string;
  path: string;
  /** Keep the page out of search results (temporary or private pages). */
  noindex?: boolean;
};

function head(selector: string, create: () => HTMLElement): HTMLElement {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  return el;
}

function meta(attr: 'name' | 'property', key: string) {
  return head(`meta[${attr}="${key}"]`, () => {
    const el = document.createElement('meta');
    el.setAttribute(attr, key);
    return el;
  });
}

let defaults: { title: string; description: string } | null = null;

export function applyPageMeta({ title, description, path, noindex }: PageMeta) {
  defaults ??= {
    title: document.title,
    description: meta('name', 'description').getAttribute('content') ?? '',
  };
  const fullTitle = title ? `${title} · ${SITE_NAME}` : defaults.title;
  const desc = description ?? defaults.description;
  const url = `${SITE_ORIGIN}${path}`;

  document.title = fullTitle;
  meta('name', 'description').setAttribute('content', desc);
  meta('property', 'og:title').setAttribute('content', fullTitle);
  meta('property', 'og:description').setAttribute('content', desc);
  meta('property', 'og:url').setAttribute('content', url);
  meta('name', 'twitter:title').setAttribute('content', fullTitle);
  meta('name', 'twitter:description').setAttribute('content', desc);
  head('link[rel="canonical"]', () => {
    const el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    return el;
  }).setAttribute('href', url);

  const robots = document.head.querySelector('meta[name="robots"]');
  if (noindex) meta('name', 'robots').setAttribute('content', 'noindex');
  else robots?.remove();
}
