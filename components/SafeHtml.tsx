'use client';

import { Fragment, useMemo, type ReactNode } from 'react';

const BLOCK = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote']);
const INLINE = new Set(['b', 'strong', 'i', 'em', 'u', 'sup', 'sub', 'span', 'a']);

/**
 * Renders tafsir HTML from the source without running it: only a fixed set of tags is kept,
 * all attributes are dropped, and text is never changed. Arabic spans get the Quran font.
 */
export function SafeHtml({ html, className }: { html: string; className?: string }) {
  const nodes = useMemo(() => {
    if (typeof DOMParser === 'undefined') return [html.replace(/<[^>]+>/g, ' ')];
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
    return walk(doc.body.childNodes);
  }, [html]);
  return <div className={`whitespace-pre-line ${className ?? ''}`}>{nodes}</div>;
}

function walk(list: NodeListOf<ChildNode>): ReactNode[] {
  return [...list].map((n, i) => {
    if (n.nodeType === Node.TEXT_NODE) return <Fragment key={i}>{n.textContent}</Fragment>;
    if (n.nodeType !== Node.ELEMENT_NODE) return null;
    const el = n as Element;
    const tag = el.tagName.toLowerCase();
    const children = walk(el.childNodes);
    if (tag === 'br') return <br key={i} />;
    const arabic = /\barabic\b|\bqpc\b/.test(el.getAttribute('class') ?? '') || el.getAttribute('lang') === 'ar';
    if (arabic)
      return (
        <span key={i} lang="ar" dir="rtl" className="quran text-xl">
          {children}
        </span>
      );
    if (tag === 'b' || tag === 'strong') return <strong key={i}>{children}</strong>;
    if (tag === 'i' || tag === 'em') return <em key={i}>{children}</em>;
    if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6')
      return (
        <p key={i} className="mt-3 font-semibold">
          {children}
        </p>
      );
    if (tag === 'li')
      return (
        <p key={i} className="ms-4">
          • {children}
        </p>
      );
    if (BLOCK.has(tag))
      return (
        <p key={i} className="mb-2">
          {children}
        </p>
      );
    if (INLINE.has(tag)) return <Fragment key={i}>{children}</Fragment>;
    return <Fragment key={i}>{children}</Fragment>;
  });
}
