export interface ShareMetaOptions {
  title: string;
  description: string;
  url: string;
  image: string;
}

const META_CONFIG = [
  { attr: 'property' as const, name: 'og:title', key: 'title' },
  { attr: 'property' as const, name: 'og:description', key: 'description' },
  { attr: 'property' as const, name: 'og:url', key: 'url' },
  { attr: 'property' as const, name: 'og:image', key: 'image' },
  { attr: 'name' as const, name: 'twitter:title', key: 'title' },
  { attr: 'name' as const, name: 'twitter:description', key: 'description' },
  { attr: 'name' as const, name: 'twitter:image', key: 'image' },
];

export function applyShareMeta(meta: ShareMetaOptions): () => void {
  if (typeof document === 'undefined') return () => undefined;

  const previousTitle = document.title;
  document.title = meta.title;

  const previousValues: Array<{ element: HTMLMetaElement; attr: 'name' | 'property'; value: string | null }> = [];

  ensureTwitterCard();

  for (const config of META_CONFIG) {
    const element = ensureMetaElement(config.attr, config.name);
    previousValues.push({ element, attr: config.attr, value: element.getAttribute('content') });
    element.setAttribute('content', meta[config.key as keyof ShareMetaOptions]);
  }

  return () => {
    document.title = previousTitle;
    for (const { element, value } of previousValues) {
      if (value === null) {
        element.remove();
      } else {
        element.setAttribute('content', value);
      }
    }
  };
}

function ensureMetaElement(attr: 'name' | 'property', value: string): HTMLMetaElement {
  const escaped = typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(value) : value.replace(/"/g, '\\"');
  const selector = `meta[${attr}="${escaped}"]`;
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  if (existing) return existing;
  const element = document.createElement('meta');
  element.setAttribute(attr, value);
  document.head.appendChild(element);
  return element;
}

function ensureTwitterCard() {
  const element = ensureMetaElement('name', 'twitter:card');
  if (!element.getAttribute('content')) {
    element.setAttribute('content', 'summary_large_image');
  }
}
