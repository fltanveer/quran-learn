import type { Segment } from '@/lib/types';

const cls: Record<Segment['role'], string> = {
  root: 'seg seg-root',
  pattern: 'seg seg-pattern',
  prefix: 'seg seg-affix',
  suffix: 'seg seg-affix',
};

/** Renders a word from its segments. The joined text always equals the Tanzil word. */
export function ColoredWord({ segments }: { segments: Segment[] }) {
  const hasRoot = segments.some((s) => s.role === 'root');
  if (!hasRoot) return <>{segments.map((s) => s.text).join('')}</>;
  return (
    <>
      {segments.map((s, i) => (
        <span key={i} className={cls[s.role]}>
          {s.text}
        </span>
      ))}
    </>
  );
}
