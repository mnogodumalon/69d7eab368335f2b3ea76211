import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichBetriebsvergleichDaten } from '@/lib/enrich';
import type { EnrichedBetriebsvergleichDaten } from '@/types/enriched';
import type { BetriebsvergleichDaten } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { BetriebsvergleichDatenDialog } from '@/components/dialogs/BetriebsvergleichDatenDialog';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconFileText,
  IconBuilding, IconChartBar, IconUsers, IconSearch,
  IconFilter, IconX,
} from '@tabler/icons-react';

const APPGROUP_ID = '69d7eab368335f2b3ea76211';
const REPAIR_ENDPOINT = '/claude/build/repair';

export default function DashboardOverview() {
  const {
    branchenGewerke, betriebsvergleichDaten,
    branchenGewerkeMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedBetriebsvergleichDaten = enrichBetriebsvergleichDaten(betriebsvergleichDaten, { branchenGewerkeMap });

  // All hooks BEFORE early returns
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranche, setSelectedBranche] = useState<string>('');
  const [selectedJahr, setSelectedJahr] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<EnrichedBetriebsvergleichDaten | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedBetriebsvergleichDaten | null>(null);

  const availableJahre = useMemo(() => {
    const jahre = new Set<number>();
    betriebsvergleichDaten.forEach(r => { if (r.fields.jahr) jahre.add(r.fields.jahr); });
    return Array.from(jahre).sort((a, b) => b - a);
  }, [betriebsvergleichDaten]);

  const filtered = useMemo(() => {
    return enrichedBetriebsvergleichDaten.filter(r => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        (r.fields.titel ?? '').toLowerCase().includes(q) ||
        (r.fields.herausgeber ?? '').toLowerCase().includes(q) ||
        r.branche_gewerkName.toLowerCase().includes(q);
      const matchesBranche = !selectedBranche || r.branche_gewerkName === selectedBranche;
      const matchesJahr = !selectedJahr || String(r.fields.jahr) === selectedJahr;
      return matchesSearch && matchesBranche && matchesJahr;
    });
  }, [enrichedBetriebsvergleichDaten, searchQuery, selectedBranche, selectedJahr]);

  const stats = useMemo(() => {
    const avgRentabilitaet = filtered.length > 0
      ? filtered.reduce((s, r) => s + (r.fields.umsatzrentabilitaet ?? 0), 0) / filtered.filter(r => r.fields.umsatzrentabilitaet != null).length
      : null;
    const avgPersonal = filtered.length > 0
      ? filtered.reduce((s, r) => s + (r.fields.personalintensitaet ?? 0), 0) / filtered.filter(r => r.fields.personalintensitaet != null).length
      : null;
    const totalTeilnehmer = filtered.reduce((s, r) => s + (r.fields.anzahl_teilnehmer ?? 0), 0);
    return { avgRentabilitaet, avgPersonal, totalTeilnehmer };
  }, [filtered]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteBetriebsvergleichDatenEntry(deleteTarget.record_id);
    setDeleteTarget(null);
    fetchAll();
  };

  const handleSubmit = async (fields: BetriebsvergleichDaten['fields']) => {
    if (editRecord) {
      await LivingAppsService.updateBetriebsvergleichDatenEntry(editRecord.record_id, fields);
    } else {
      await LivingAppsService.createBetriebsvergleichDatenEntry(fields);
    }
    setDialogOpen(false);
    setEditRecord(null);
    fetchAll();
  };

  const openCreate = () => {
    setEditRecord(null);
    setDialogOpen(true);
  };

  const openEdit = (r: EnrichedBetriebsvergleichDaten) => {
    setEditRecord(r);
    setDialogOpen(true);
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const branchenNames = Array.from(new Set(enrichedBetriebsvergleichDaten.map(r => r.branche_gewerkName).filter(Boolean)));
  const hasFilters = searchQuery || selectedBranche || selectedJahr;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Betriebsvergleiche</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {enrichedBetriebsvergleichDaten.length} Einträge · {branchenGewerke.length} Branchen
          </p>
        </div>
        <Button onClick={() => openCreate()} size="sm">
          <IconPlus size={16} className="mr-1.5 shrink-0" />
          Neuer Eintrag
        </Button>
      </div>

      {/* KPI Karten */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Einträge gesamt"
          value={String(enrichedBetriebsvergleichDaten.length)}
          description="Betriebsvergleiche"
          icon={<IconChartBar size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Branchen"
          value={String(branchenGewerke.length)}
          description="Branchen & Gewerke"
          icon={<IconBuilding size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Ø Umsatzrentabilität"
          value={stats.avgRentabilitaet != null && !isNaN(stats.avgRentabilitaet)
            ? `${stats.avgRentabilitaet.toFixed(1)} %`
            : '—'}
          description="Aktuelle Auswahl"
          icon={<IconChartBar size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Teilnehmer gesamt"
          value={stats.totalTeilnehmer > 0 ? String(stats.totalTeilnehmer) : '—'}
          description="Aktuelle Auswahl"
          icon={<IconUsers size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Filter-Leiste */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Suchen..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <IconFilter size={14} className="text-muted-foreground shrink-0" />
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            value={selectedBranche}
            onChange={e => setSelectedBranche(e.target.value)}
          >
            <option value="">Alle Branchen</option>
            {branchenNames.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            value={selectedJahr}
            onChange={e => setSelectedJahr(e.target.value)}
          >
            <option value="">Alle Jahre</option>
            {availableJahre.map(j => (
              <option key={j} value={String(j)}>{j}</option>
            ))}
          </select>
          {hasFilters && (
            <button
              onClick={() => { setSearchQuery(''); setSelectedBranche(''); setSelectedJahr(''); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-accent transition-colors"
            >
              <IconX size={13} className="shrink-0" />
              Zurücksetzen
            </button>
          )}
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} Ergebnisse</span>
      </div>

      {/* Tabelle */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <IconChartBar size={48} className="text-muted-foreground" stroke={1.5} />
          <div className="text-center">
            <p className="font-medium text-foreground">Keine Einträge gefunden</p>
            <p className="text-sm text-muted-foreground mt-1">
              {hasFilters ? 'Versuche andere Filterkriterien.' : 'Füge den ersten Betriebsvergleich hinzu.'}
            </p>
          </div>
          {!hasFilters && (
            <Button size="sm" onClick={() => openCreate()}>
              <IconPlus size={15} className="mr-1.5 shrink-0" />Neuer Eintrag
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Titel</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Branche</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Jahr</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Herausgeber</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden lg:table-cell">Umsatzrentab.</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden xl:table-cell">Materialintens.</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden xl:table-cell">Personalintens.</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden xl:table-cell">Wertschöpfung/MA</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">TN</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(r => (
                <tr key={r.record_id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate max-w-[180px]">{r.fields.titel || '—'}</p>
                      <p className="text-xs text-muted-foreground sm:hidden truncate">{r.branche_gewerkName || '—'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {r.branche_gewerkName ? (
                      <Badge variant="secondary" className="text-xs font-normal truncate max-w-[140px]">
                        {r.branche_gewerkName}
                      </Badge>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    {r.fields.jahr ?? '—'}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground truncate max-w-[150px]">
                    {r.fields.herausgeber || '—'}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-right">
                    {r.fields.umsatzrentabilitaet != null
                      ? <span className="font-medium text-foreground">{r.fields.umsatzrentabilitaet.toFixed(1)} %</span>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell text-right text-muted-foreground">
                    {r.fields.materialintensitaet != null ? `${r.fields.materialintensitaet.toFixed(1)} %` : '—'}
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell text-right text-muted-foreground">
                    {r.fields.personalintensitaet != null ? `${r.fields.personalintensitaet.toFixed(1)} %` : '—'}
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell text-right text-muted-foreground">
                    {r.fields.wertschoepfung_pro_mitarbeiter != null
                      ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(r.fields.wertschoepfung_pro_mitarbeiter)
                      : '—'}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-right text-muted-foreground">
                    {r.fields.anzahl_teilnehmer ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      {r.fields.pdf_datei && (
                        <a
                          href={r.fields.pdf_datei}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          title="PDF öffnen"
                        >
                          <IconFileText size={15} className="shrink-0" />
                        </a>
                      )}
                      <button
                        onClick={() => openEdit(r)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        title="Bearbeiten"
                      >
                        <IconPencil size={15} className="shrink-0" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(r)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Löschen"
                      >
                        <IconTrash size={15} className="shrink-0" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Branchen-Übersicht */}
      {branchenGewerke.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Branchen & Gewerke</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {branchenGewerke.map(b => {
              const eintraege = enrichedBetriebsvergleichDaten.filter(r => r.branche_gewerkName === b.fields.branche_name);
              return (
                <div
                  key={b.record_id}
                  className="rounded-2xl border border-border bg-card p-4 space-y-2 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{b.fields.branche_name || '—'}</p>
                      {b.fields.branche_beschreibung && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{b.fields.branche_beschreibung}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">{eintraege.length}</Badge>
                  </div>
                  {eintraege.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {eintraege.slice(0, 3).map(e => (
                        <button
                          key={e.record_id}
                          onClick={() => openEdit(e)}
                          className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground hover:bg-accent hover:text-foreground transition-colors truncate max-w-[120px]"
                        >
                          {e.fields.titel || String(e.fields.jahr || '—')}
                        </button>
                      ))}
                      {eintraege.length > 3 && (
                        <button
                          onClick={() => setSelectedBranche(b.fields.branche_name || '')}
                          className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                          +{eintraege.length - 3} weitere
                        </button>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setEditRecord(null);
                      setDialogOpen(true);
                    }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <IconPlus size={12} className="shrink-0" />
                    Eintrag hinzufügen
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dialog */}
      {dialogOpen && (
        <BetriebsvergleichDatenDialog
          open={dialogOpen}
          onClose={() => { setDialogOpen(false); setEditRecord(null); }}
          onSubmit={handleSubmit}
          defaultValues={editRecord?.fields}
          branchenGewerkeList={branchenGewerke}
          enablePhotoScan={AI_PHOTO_SCAN['BetriebsvergleichDaten']}
          enablePhotoLocation={AI_PHOTO_LOCATION['BetriebsvergleichDaten']}
        />
      )}

      {/* Löschen bestätigen */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Eintrag löschen"
        description={`Möchtest du "${deleteTarget?.fields.titel || 'diesen Eintrag'}" wirklich löschen?`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
