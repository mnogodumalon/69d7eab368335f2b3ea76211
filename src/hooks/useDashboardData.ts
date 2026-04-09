import { useState, useEffect, useMemo, useCallback } from 'react';
import type { BranchenGewerke, BetriebsvergleichDaten } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [branchenGewerke, setBranchenGewerke] = useState<BranchenGewerke[]>([]);
  const [betriebsvergleichDaten, setBetriebsvergleichDaten] = useState<BetriebsvergleichDaten[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [branchenGewerkeData, betriebsvergleichDatenData] = await Promise.all([
        LivingAppsService.getBranchenGewerke(),
        LivingAppsService.getBetriebsvergleichDaten(),
      ]);
      setBranchenGewerke(branchenGewerkeData);
      setBetriebsvergleichDaten(betriebsvergleichDatenData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [branchenGewerkeData, betriebsvergleichDatenData] = await Promise.all([
          LivingAppsService.getBranchenGewerke(),
          LivingAppsService.getBetriebsvergleichDaten(),
        ]);
        setBranchenGewerke(branchenGewerkeData);
        setBetriebsvergleichDaten(betriebsvergleichDatenData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const branchenGewerkeMap = useMemo(() => {
    const m = new Map<string, BranchenGewerke>();
    branchenGewerke.forEach(r => m.set(r.record_id, r));
    return m;
  }, [branchenGewerke]);

  return { branchenGewerke, setBranchenGewerke, betriebsvergleichDaten, setBetriebsvergleichDaten, loading, error, fetchAll, branchenGewerkeMap };
}