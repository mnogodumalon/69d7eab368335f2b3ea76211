import type { EnrichedBetriebsvergleichDaten } from '@/types/enriched';
import type { BetriebsvergleichDaten, BranchenGewerke } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface BetriebsvergleichDatenMaps {
  branchenGewerkeMap: Map<string, BranchenGewerke>;
}

export function enrichBetriebsvergleichDaten(
  betriebsvergleichDaten: BetriebsvergleichDaten[],
  maps: BetriebsvergleichDatenMaps
): EnrichedBetriebsvergleichDaten[] {
  return betriebsvergleichDaten.map(r => ({
    ...r,
    branche_gewerkName: resolveDisplay(r.fields.branche_gewerk, maps.branchenGewerkeMap, 'branche_name'),
  }));
}
