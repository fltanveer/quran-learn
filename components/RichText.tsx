/**
 * Shows source text that may contain <b> and line breaks (QuranEnc footnotes).
 * Text is never changed; other tags are shown as plain text so nothing is executed.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(<b>[\s\S]*?<\/b>)/g);
  return (
    <div className={`whitespace-pre-line ${className ?? ''}`}>
      {parts.map((p, i) =>
        p.startsWith('<b>') && p.endsWith('</b>') ? (
          <strong key={i}>{p.slice(3, -4)}</strong>
        ) : (
          <span key={i}>{p.replace(/<br\s*\/?>/g, '\n')}</span>
        ),
      )}
    </div>
  );
}
