import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichBetriebsvergleichDaten } from '@/lib/enrich';
import type { EnrichedBetriebsvergleichDaten } from '@/types/enriched';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import React, { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { BetriebsvergleichDatenDialog } from '@/components/dialogs/BetriebsvergleichDatenDialog';
import { BranchenGewerkeDialog } from '@/components/dialogs/BranchenGewerkeDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconBuildingFactory2,
  IconChartBar, IconUsers, IconFileText, IconSearch,
  IconX, IconExternalLink,
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

  const [selectedBrancheId, setSelectedBrancheId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<EnrichedBetriebsvergleichDaten | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedBetriebsvergleichDaten | null>(null);
  const [brancheDialogOpen, setBrancheDialogOpen] = useState(false);

  const filteredData = useMemo(() => {
    let items = enrichedBetriebsvergleichDaten;
    if (selectedBrancheId) {
      items = items.filter(item => {
        const url = item.fields.branche_gewerk;
        return url?.includes(selectedBrancheId);
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(item =>
        (item.fields.titel ?? '').toLowerCase().includes(q) ||
        (item.fields.herausgeber ?? '').toLowerCase().includes(q) ||
        item.branche_gewerkName.toLowerCase().includes(q)
      );
    }
    return items.sort((a, b) => (b.fields.jahr ?? 0) - (a.fields.jahr ?? 0));
  }, [enrichedBetriebsvergleichDaten, selectedBrancheId, searchQuery]);

  const branchenWithCounts = useMemo(() => {
    const counts = new Map<string, number>();
    enrichedBetriebsvergleichDaten.forEach(item => {
      const url = item.fields.branche_gewerk;
      if (!url) return;
      const id = url.split('/').pop() ?? '';
      counts.set(id, (counts.get(id) ?? 0) + 1);
    });
    return branchenGewerke.map(b => ({ ...b, count: counts.get(b.record_id) ?? 0 }))
      .sort((a, b) => b.count - a.count);
  }, [branchenGewerke, enrichedBetriebsvergleichDaten]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteBetriebsvergleichDatenEntry(deleteTarget.record_id);
    setDeleteTarget(null);
    fetchAll();
  };

  const openCreate = (brancheId?: string) => {
    setEditRecord(null);
    setDialogOpen(true);
    if (brancheId) setSelectedBrancheId(brancheId);
  };

  const defaultDialogValues = useMemo(() => {
    if (editRecord) return editRecord.fields;
    if (selectedBrancheId) {
      return { branche_gewerk: createRecordUrl(APP_IDS.BRANCHEN_GEWERKE, selectedBrancheId) };
    }
    return undefined;
  }, [editRecord, selectedBrancheId]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Betriebsvergleiche</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {enrichedBetriebsvergleichDaten.length} Vergleiche in {branchenGewerke.length} Branchen
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setBrancheDialogOpen(true)}>
            <IconBuildingFactory2 size={15} className="mr-1.5 shrink-0" />
            Branche anlegen
          </Button>
          <Button size="sm" onClick={() => openCreate()}>
            <IconPlus size={15} className="mr-1.5 shrink-0" />
            Betriebsvergleich
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <IconChartBar size={16} className="text-primary shrink-0" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Vergleiche</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{enrichedBetriebsvergleichDaten.length}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <IconBuildingFactory2 size={16} className="text-indigo-500 shrink-0" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Branchen</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{branchenGewerke.length}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <IconUsers size={16} className="text-emerald-500 shrink-0" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Ø Teilnehmer</span>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {enrichedBetriebsvergleichDaten.length > 0
              ? Math.round(enrichedBetriebsvergleichDaten.reduce((sum, d) => sum + (d.fields.anzahl_teilnehmer ?? 0), 0) / enrichedBetriebsvergleichDaten.length)
              : '—'}
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <IconChartBar size={16} className="text-orange-500 shrink-0" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Ø Umsatzrentab.</span>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {(() => {
              const vals = enrichedBetriebsvergleichDaten.filter(d => d.fields.umsatzrentabilitaet != null);
              if (!vals.length) return '—';
              const avg = vals.reduce((s, d) => s + (d.fields.umsatzrentabilitaet ?? 0), 0) / vals.length;
              return `${avg.toFixed(1)}%`;
            })()}
          </p>
        </div>
      </div>

      {/* Main layout: sidebar + content */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Branche filter sidebar */}
        <div className="lg:w-56 shrink-0">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Branchen</p>
            </div>
            <div className="p-2">
              <button
                onClick={() => setSelectedBrancheId(null)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${
                  !selectedBrancheId
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                <span className="truncate">Alle Branchen</span>
                <span className={`text-xs rounded-full px-1.5 ${!selectedBrancheId ? 'bg-primary-foreground/20 text-primary-foreground' : 'text-muted-foreground'}`}>
                  {enrichedBetriebsvergleichDaten.length}
                </span>
              </button>
              {branchenWithCounts.map(branche => (
                <button
                  key={branche.record_id}
                  onClick={() => setSelectedBrancheId(
                    selectedBrancheId === branche.record_id ? null : branche.record_id
                  )}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${
                    selectedBrancheId === branche.record_id
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  <span className="truncate min-w-0">{branche.fields.branche_name ?? '(Ohne Name)'}</span>
                  <span className={`text-xs rounded-full px-1.5 shrink-0 ${selectedBrancheId === branche.record_id ? 'bg-primary-foreground/20 text-primary-foreground' : 'text-muted-foreground'}`}>
                    {branche.count}
                  </span>
                </button>
              ))}
              {branchenGewerke.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Keine Branchen</p>
              )}
            </div>
            <div className="px-2 pb-2 border-t border-border pt-2">
              <button
                onClick={() => setBrancheDialogOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-colors"
              >
                <IconPlus size={13} className="shrink-0" />
                Branche anlegen
              </button>
            </div>
          </div>
        </div>

        {/* Vergleiche list */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Search + add */}
          <div className="flex gap-2">
            <div className="relative flex-1 min-w-0">
              <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Suche nach Titel, Herausgeber..."
                className="w-full pl-9 pr-8 py-2 text-sm border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <IconX size={14} />
                </button>
              )}
            </div>
            <Button size="sm" onClick={() => openCreate(selectedBrancheId ?? undefined)}>
              <IconPlus size={15} className="shrink-0 mr-1" />
              <span className="hidden sm:inline">Neu</span>
            </Button>
          </div>

          {/* Cards */}
          {filteredData.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <IconFileText size={40} className="text-muted-foreground mx-auto mb-3" stroke={1.5} />
              <p className="font-medium text-foreground">Keine Betriebsvergleiche</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {searchQuery ? 'Keine Treffer für deine Suche.' : 'Leg den ersten Betriebsvergleich an.'}
              </p>
              <Button size="sm" onClick={() => openCreate(selectedBrancheId ?? undefined)}>
                <IconPlus size={14} className="mr-1" /> Betriebsvergleich anlegen
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredData.map(item => (
                <VergleichCard
                  key={item.record_id}
                  item={item}
                  onEdit={() => { setEditRecord(item); setDialogOpen(true); }}
                  onDelete={() => setDeleteTarget(item)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {React.createElement(BetriebsvergleichDatenDialog, {
        open: dialogOpen,
        onClose: () => { setDialogOpen(false); setEditRecord(null); },
        onSubmit: async (fields: EnrichedBetriebsvergleichDaten['fields']) => {
          if (editRecord) {
            await LivingAppsService.updateBetriebsvergleichDatenEntry(editRecord.record_id, fields);
          } else {
            await LivingAppsService.createBetriebsvergleichDatenEntry(fields);
          }
          fetchAll();
        },
        defaultValues: defaultDialogValues,
        branchenGewerkeList: branchenGewerke,
        enablePhotoScan: AI_PHOTO_SCAN['BetriebsvergleichDaten'],
        enablePhotoLocation: AI_PHOTO_LOCATION['BetriebsvergleichDaten'],
      })}

      <BranchenGewerkeDialog
        open={brancheDialogOpen}
        onClose={() => setBrancheDialogOpen(false)}
        onSubmit={async (fields) => {
          await LivingAppsService.createBranchenGewerkeEntry(fields);
          fetchAll();
        }}
        enablePhotoScan={AI_PHOTO_SCAN['BranchenGewerke']}
        enablePhotoLocation={AI_PHOTO_LOCATION['BranchenGewerke']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Betriebsvergleich löschen"
        description={`Möchtest du "${deleteTarget?.fields.titel ?? 'diesen Eintrag'}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function VergleichCard({
  item,
  onEdit,
  onDelete,
}: {
  item: EnrichedBetriebsvergleichDaten;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const kpis: { label: string; value: string; color: string }[] = [];
  if (item.fields.umsatzrentabilitaet != null)
    kpis.push({ label: 'Umsatzrentab.', value: `${item.fields.umsatzrentabilitaet}%`, color: 'text-emerald-600' });
  if (item.fields.materialintensitaet != null)
    kpis.push({ label: 'Materialintens.', value: `${item.fields.materialintensitaet}%`, color: 'text-blue-600' });
  if (item.fields.personalintensitaet != null)
    kpis.push({ label: 'Personalintens.', value: `${item.fields.personalintensitaet}%`, color: 'text-purple-600' });
  if (item.fields.wertschoepfung_pro_mitarbeiter != null)
    kpis.push({ label: 'Wertschöpfung/MA', value: `${item.fields.wertschoepfung_pro_mitarbeiter.toLocaleString('de-DE')} €`, color: 'text-orange-600' });
  if (item.fields.kalk_unternehmerlohn != null)
    kpis.push({ label: 'Unternehmerlohn', value: `${item.fields.kalk_unternehmerlohn.toLocaleString('de-DE')} €`, color: 'text-rose-600' });

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-colors">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {item.branche_gewerkName && (
                <Badge variant="secondary" className="text-xs font-normal shrink-0">
                  {item.branche_gewerkName}
                </Badge>
              )}
              {item.fields.jahr != null && (
                <span className="text-xs text-muted-foreground shrink-0">{item.fields.jahr}</span>
              )}
            </div>
            <h3 className="font-semibold text-foreground truncate">
              {item.fields.titel ?? '(Kein Titel)'}
            </h3>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {item.fields.herausgeber && (
                <span className="text-xs text-muted-foreground truncate">
                  Herausgeber: {item.fields.herausgeber}
                </span>
              )}
              {item.fields.anzahl_teilnehmer != null && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <IconUsers size={12} className="shrink-0" />
                  {item.fields.anzahl_teilnehmer} Teilnehmer
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {item.fields.pdf_datei && (
              <a
                href={item.fields.pdf_datei}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="PDF öffnen"
              >
                <IconExternalLink size={15} />
              </a>
            )}
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Bearbeiten"
            >
              <IconPencil size={15} />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Löschen"
            >
              <IconTrash size={15} />
            </button>
          </div>
        </div>

        {kpis.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {kpis.map(kpi => (
              <div key={kpi.label} className="bg-muted/50 rounded-xl p-2.5">
                <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>
                <p className={`text-sm font-bold mt-0.5 truncate ${kpi.color}`}>{kpi.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
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
      <div className="flex gap-4">
        <Skeleton className="h-64 w-56 rounded-2xl shrink-0 hidden lg:block" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-10 rounded-xl" />
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      </div>
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
