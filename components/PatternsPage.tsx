'use client';

import { DataGate } from './DataGate';
import { PatternsView } from './PatternsView';

export function PatternsPage() {
  return <DataGate>{(d) => <PatternsView patterns={d.patterns} words={d.words} />}</DataGate>;
}
