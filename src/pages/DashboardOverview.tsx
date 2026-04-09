import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichBetriebsvergleichDaten } from '@/lib/enrich';
import type { EnrichedBetriebsvergleichDaten } from '@/types/enriched';
import type { BranchenGewerke } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck, IconPlus, IconPencil,
  IconTrash, IconChartBar, IconBuilding, IconUsers, IconTrendingUp,
  IconCoin, IconFileText, IconSearch, IconX,
} from '@tabler/icons-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { BranchenGewerkeDialog } from '@/components/dialogs/BranchenGewerkeDialog';
import { BetriebsvergleichDatenDialog } from '@/components/dialogs/BetriebsvergleichDatenDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN } from '@/config/ai-features';

const APPGROUP_ID = '69d7eab368335f2b3ea76211';
const REPAIR_ENDPOINT = '/claude/build/repair';

type MetricKey = 'umsatzrentabilitaet' | 'materialintensitaet' | 'personalintensitaet' | 'wertschoepfung_pro_mitarbeiter' | 'kalk_unternehmerlohn';

const METRICS: { key: MetricKey; label: string; unit: string; color: string }[] = [
  { key: 'umsatzrentabilitaet', label: 'Umsatzrentabilität', unit: '%', color: 'var(--primary)' },
  { key: 'materialintensitaet', label: 'Materialintensität', unit: '%', color: '#f59e0b' },
  { key: 'personalintensitaet', label: 'Personalintensität', unit: '%', color: '#10b981' },
  { key: 'wertschoepfung_pro_mitarbeiter', label: 'Wertschöpfung/MA', unit: '€', color: '#8b5cf6' },
  { key: 'kalk_unternehmerlohn', label: 'Unternehmerlohn', unit: '€', color: '#ef4444' },
];

export default function DashboardOverview() {
  const {
    branchenGewerke, betriebsvergleichDaten,
    branchenGewerkeMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedBetriebsvergleichDaten = enrichBetriebsvergleichDaten(betriebsvergleichDaten, { branchenGewerkeMap });

  // State
  const [selectedBranche, setSelectedBranche] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('umsatzrentabilitaet');
  const [searchQuery, setSearchQuery] = useState('');
  const [brancheDialogOpen, setBrancheDialogOpen] = useState(false);
  const [editBranche, setEditBranche] = useState<BranchenGewerke | null>(null);
  const [datenDialogOpen, setDatenDialogOpen] = useState(false);
  const [editDaten, setEditDaten] = useState<EnrichedBetriebsvergleichDaten | null>(null);
  const [preselectedBrancheId, setPreselectedBrancheId] = useState<string | null>(null);
  const [deleteBrancheTarget, setDeleteBrancheTarget] = useState<BranchenGewerke | null>(null);
  const [deleteDatenTarget, setDeleteDatenTarget] = useState<EnrichedBetriebsvergleichDaten | null>(null);
  const [activeTab, setActiveTab] = useState<'vergleich' | 'daten'>('vergleich');

  // Derived
  const filteredBranchen = useMemo(() => {
    if (!searchQuery) return branchenGewerke;
    const q = searchQuery.toLowerCase();
    return branchenGewerke.filter(b =>
      (b.fields.branche_name ?? '').toLowerCase().includes(q)
    );
  }, [branchenGewerke, searchQuery]);

  const activeData = useMemo(() => {
    let data = enrichedBetriebsvergleichDaten;
    if (selectedBranche) {
      data = data.filter(d => {
        const id = d.fields.branche_gewerk ? d.fields.branche_gewerk.match(/([a-f0-9]{24})$/i)?.[1] : null;
        return id === selectedBranche;
      });
    }
    if (searchQuery && !selectedBranche) {
      const q = searchQuery.toLowerCase();
      data = data.filter(d =>
        (d.fields.titel ?? '').toLowerCase().includes(q) ||
        (d.branche_gewerkName ?? '').toLowerCase().includes(q) ||
        (d.fields.herausgeber ?? '').toLowerCase().includes(q)
      );
    }
    return data.sort((a, b) => (b.fields.jahr ?? 0) - (a.fields.jahr ?? 0));
  }, [enrichedBetriebsvergleichDaten, selectedBranche, searchQuery]);

  // Chart data: average per branche for selected metric
  const chartData = useMemo(() => {
    const byBranche = new Map<string, { name: string; values: number[]; count: number }>();
    enrichedBetriebsvergleichDaten.forEach(d => {
      const val = d.fields[selectedMetric];
      if (val == null) return;
      const name = d.branche_gewerkName || 'Unbekannt';
      const id = d.fields.branche_gewerk?.match(/([a-f0-9]{24})$/i)?.[1] ?? name;
      if (!byBranche.has(id)) byBranche.set(id, { name, values: [], count: 0 });
      byBranche.get(id)!.values.push(val);
      byBranche.get(id)!.count++;
    });
    return Array.from(byBranche.values())
      .map(({ name, values }) => ({
        name: name.length > 18 ? name.slice(0, 16) + '…' : name,
        wert: values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10 : 0,
      }))
      .sort((a, b) => b.wert - a.wert)
      .slice(0, 10);
  }, [enrichedBetriebsvergleichDaten, selectedMetric]);

  const metricInfo = METRICS.find(m => m.key === selectedMetric)!;

  // Handlers
  const handleDeleteBranche = async () => {
    if (!deleteBrancheTarget) return;
    await LivingAppsService.deleteBranchenGewerkeEntry(deleteBrancheTarget.record_id);
    setDeleteBrancheTarget(null);
    if (selectedBranche === deleteBrancheTarget.record_id) setSelectedBranche(null);
    fetchAll();
  };

  const handleDeleteDaten = async () => {
    if (!deleteDatenTarget) return;
    await LivingAppsService.deleteBetriebsvergleichDatenEntry(deleteDatenTarget.record_id);
    setDeleteDatenTarget(null);
    fetchAll();
  };

  const openCreateDaten = (brancheId?: string) => {
    setEditDaten(null);
    setPreselectedBrancheId(brancheId ?? null);
    setDatenDialogOpen(true);
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const selectedBrancheRecord = selectedBranche ? branchenGewerkeMap.get(selectedBranche) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">Betriebsvergleich-Sammlung</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {branchenGewerke.length} Branchen · {betriebsvergleichDaten.length} Vergleiche
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => { setEditBranche(null); setBrancheDialogOpen(true); }}>
            <IconBuilding size={14} className="mr-1 shrink-0" />
            <span className="hidden sm:inline">Branche</span> hinzufügen
          </Button>
          <Button size="sm" onClick={() => openCreateDaten(selectedBranche ?? undefined)}>
            <IconPlus size={14} className="mr-1 shrink-0" />
            <span className="hidden sm:inline">Betriebsvergleich</span> hinzufügen
          </Button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('vergleich')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'vergleich' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <IconChartBar size={14} className="inline mr-1.5 shrink-0" />
          Kennzahlen-Vergleich
        </button>
        <button
          onClick={() => setActiveTab('daten')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'daten' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <IconFileText size={14} className="inline mr-1.5 shrink-0" />
          Alle Datensätze
        </button>
      </div>

      {activeTab === 'vergleich' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar: Branchen */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Branchen & Gewerke</h2>
              <span className="text-xs text-muted-foreground">{branchenGewerke.length}</span>
            </div>
            {/* Search */}
            <div className="relative">
              <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Suchen…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <IconX size={14} />
                </button>
              )}
            </div>

            <div className="space-y-1 max-h-[calc(100vh-340px)] overflow-y-auto pr-1">
              <button
                onClick={() => setSelectedBranche(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between gap-2 ${!selectedBranche ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-accent text-foreground'}`}
              >
                <span className="truncate">Alle Branchen</span>
                <span className={`text-xs shrink-0 ${!selectedBranche ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {betriebsvergleichDaten.length}
                </span>
              </button>
              {filteredBranchen.map(b => {
                const count = betriebsvergleichDaten.filter(d => {
                  const id = d.fields.branche_gewerk?.match(/([a-f0-9]{24})$/i)?.[1];
                  return id === b.record_id;
                }).length;
                const isActive = selectedBranche === b.record_id;
                return (
                  <div key={b.record_id} className={`group flex items-center gap-1 rounded-lg ${isActive ? 'bg-primary' : 'hover:bg-accent'}`}>
                    <button
                      onClick={() => setSelectedBranche(isActive ? null : b.record_id)}
                      className={`flex-1 text-left px-3 py-2 text-sm transition-colors flex items-center justify-between gap-2 min-w-0 ${isActive ? 'text-primary-foreground font-medium' : 'text-foreground'}`}
                    >
                      <span className="truncate">{b.fields.branche_name ?? '—'}</span>
                      <span className={`text-xs shrink-0 ${isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{count}</span>
                    </button>
                    <div className="flex gap-0.5 pr-1.5">
                      <button
                        onClick={() => { setEditBranche(b); setBrancheDialogOpen(true); }}
                        className={`p-1 rounded transition-colors ${isActive ? 'hover:bg-primary-foreground/20 text-primary-foreground/70' : 'hover:bg-accent-foreground/10 text-muted-foreground'}`}
                        title="Bearbeiten"
                      >
                        <IconPencil size={12} />
                      </button>
                      <button
                        onClick={() => setDeleteBrancheTarget(b)}
                        className={`p-1 rounded transition-colors ${isActive ? 'hover:bg-primary-foreground/20 text-primary-foreground/70' : 'hover:bg-accent-foreground/10 text-muted-foreground'}`}
                        title="Löschen"
                      >
                        <IconTrash size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredBranchen.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">Keine Branchen gefunden</p>
              )}
            </div>
          </div>

          {/* Main: Chart + Stats */}
          <div className="lg:col-span-3 space-y-5">
            {/* Metric selector */}
            <div className="flex flex-wrap gap-2">
              {METRICS.map(m => (
                <button
                  key={m.key}
                  onClick={() => setSelectedMetric(m.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${selectedMetric === m.key ? 'border-transparent text-white' : 'border-border text-muted-foreground hover:text-foreground bg-background'}`}
                  style={selectedMetric === m.key ? { backgroundColor: m.color } : undefined}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Chart */}
            <div className="bg-card border border-border rounded-2xl p-5 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">
                    {metricInfo.label} nach Branche
                    {selectedBrancheRecord && (
                      <span className="ml-2 text-muted-foreground font-normal">
                        — {selectedBrancheRecord.fields.branche_name}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {metricInfo.unit === '%' ? 'Durchschnittswert in %' : 'Durchschnittswert in €'}
                    {' · '}{selectedBranche ? activeData.length : enrichedBetriebsvergleichDaten.length} Einträge
                  </p>
                </div>
              </div>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData} margin={{ top: 0, right: 8, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="var(--muted-foreground)"
                      tick={{ fontSize: 11 }}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis
                      stroke="var(--muted-foreground)"
                      tick={{ fontSize: 11 }}
                      tickFormatter={v => metricInfo.unit === '%' ? `${v}%` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                      width={50}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value: number) => [
                        metricInfo.unit === '%' ? `${value}%` : `${value.toLocaleString('de-DE')} €`,
                        metricInfo.label,
                      ]}
                    />
                    <Bar dataKey="wert" fill={metricInfo.color} radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <IconChartBar size={36} stroke={1.5} />
                  <p className="text-sm mt-2">Keine Daten vorhanden</p>
                </div>
              )}
            </div>

            {/* KPI Summary */}
            {activeData.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Vergleiche', value: activeData.length, icon: <IconFileText size={16} className="text-muted-foreground shrink-0" /> },
                  {
                    label: 'Ø Teilnehmer',
                    value: (() => {
                      const vals = activeData.map(d => d.fields.anzahl_teilnehmer).filter(v => v != null) as number[];
                      return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : '—';
                    })(),
                    icon: <IconUsers size={16} className="text-muted-foreground shrink-0" />,
                  },
                  {
                    label: 'Ø Umsatzrent.',
                    value: (() => {
                      const vals = activeData.map(d => d.fields.umsatzrentabilitaet).filter(v => v != null) as number[];
                      return vals.length ? `${(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)}%` : '—';
                    })(),
                    icon: <IconTrendingUp size={16} className="text-muted-foreground shrink-0" />,
                  },
                  {
                    label: 'Ø Personal',
                    value: (() => {
                      const vals = activeData.map(d => d.fields.personalintensitaet).filter(v => v != null) as number[];
                      return vals.length ? `${(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)}%` : '—';
                    })(),
                    icon: <IconCoin size={16} className="text-muted-foreground shrink-0" />,
                  },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3 min-w-0 overflow-hidden">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">{icon}</div>
                    <div className="min-w-0">
                      <p className="text-lg font-bold text-foreground leading-none truncate">{String(value)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Data list for selected branche */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="font-semibold text-sm text-foreground">
                  {selectedBrancheRecord
                    ? `Vergleiche: ${selectedBrancheRecord.fields.branche_name}`
                    : 'Alle Betriebsvergleiche'}
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openCreateDaten(selectedBranche ?? undefined)}
                  className="h-7 text-xs"
                >
                  <IconPlus size={12} className="mr-1 shrink-0" />
                  Hinzufügen
                </Button>
              </div>
              {activeData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <IconFileText size={36} stroke={1.5} />
                  <p className="text-sm mt-2">Noch keine Betriebsvergleiche vorhanden</p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => openCreateDaten(selectedBranche ?? undefined)}>
                    <IconPlus size={14} className="mr-1" />Ersten Eintrag erstellen
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Titel</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden sm:table-cell">Branche</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden md:table-cell">Jahr</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden lg:table-cell">Herausgeber</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs hidden md:table-cell">Umsatzrent.</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs hidden lg:table-cell">Teilnehmer</th>
                        <th className="px-4 py-2.5 w-20"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeData.map((d, i) => (
                        <tr key={d.record_id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/20'} hover:bg-accent/30 transition-colors`}>
                          <td className="px-4 py-3 font-medium text-foreground">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="truncate max-w-[180px]">{d.fields.titel ?? '—'}</span>
                              {d.fields.pdf_datei && (
                                <a href={d.fields.pdf_datei} target="_blank" rel="noopener noreferrer" className="shrink-0 text-primary hover:text-primary/80" title="PDF öffnen">
                                  <IconFileText size={14} />
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                            <span className="truncate block max-w-[140px]">{d.branche_gewerkName || '—'}</span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                            {d.fields.jahr != null ? (
                              <Badge variant="outline" className="text-xs">{d.fields.jahr}</Badge>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                            <span className="truncate block max-w-[140px]">{d.fields.herausgeber ?? '—'}</span>
                          </td>
                          <td className="px-4 py-3 text-right hidden md:table-cell">
                            {d.fields.umsatzrentabilitaet != null ? (
                              <span className="font-medium text-foreground">{d.fields.umsatzrentabilitaet}%</span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground hidden lg:table-cell">
                            {d.fields.anzahl_teilnehmer ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => { setEditDaten(d); setPreselectedBrancheId(null); setDatenDialogOpen(true); }}
                                className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                                title="Bearbeiten"
                              >
                                <IconPencil size={14} />
                              </button>
                              <button
                                onClick={() => setDeleteDatenTarget(d)}
                                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                title="Löschen"
                              >
                                <IconTrash size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'daten' && (
        <div className="space-y-4">
          {/* Search + filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Titel, Branche oder Herausgeber suchen…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <IconX size={14} />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedBranche(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${!selectedBranche ? 'bg-primary text-primary-foreground border-transparent' : 'border-border text-muted-foreground hover:text-foreground bg-background'}`}
              >
                Alle
              </button>
              {branchenGewerke.slice(0, 6).map(b => (
                <button
                  key={b.record_id}
                  onClick={() => setSelectedBranche(selectedBranche === b.record_id ? null : b.record_id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors truncate max-w-[120px] ${selectedBranche === b.record_id ? 'bg-primary text-primary-foreground border-transparent' : 'border-border text-muted-foreground hover:text-foreground bg-background'}`}
                >
                  {b.fields.branche_name ?? '—'}
                </button>
              ))}
            </div>
          </div>

          {/* Cards grid */}
          {activeData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <IconFileText size={48} stroke={1.5} />
              <p className="text-base mt-3 font-medium">Keine Einträge gefunden</p>
              <p className="text-sm mt-1">Füge den ersten Betriebsvergleich hinzu.</p>
              <Button size="sm" className="mt-4" onClick={() => openCreateDaten()}>
                <IconPlus size={14} className="mr-1" />Eintrag hinzufügen
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeData.map(d => (
                <div key={d.record_id} className="bg-card border border-border rounded-2xl p-4 space-y-3 overflow-hidden">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm text-foreground truncate">{d.fields.titel ?? '—'}</h3>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{d.branche_gewerkName || '—'}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {d.fields.jahr != null && (
                        <Badge variant="outline" className="text-xs">{d.fields.jahr}</Badge>
                      )}
                      {d.fields.pdf_datei && (
                        <a href={d.fields.pdf_datei} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors" title="PDF">
                          <IconFileText size={14} />
                        </a>
                      )}
                    </div>
                  </div>

                  {d.fields.herausgeber && (
                    <p className="text-xs text-muted-foreground truncate">
                      Hrsg.: {d.fields.herausgeber}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Umsatzrent.', value: d.fields.umsatzrentabilitaet != null ? `${d.fields.umsatzrentabilitaet}%` : null },
                      { label: 'Materialint.', value: d.fields.materialintensitaet != null ? `${d.fields.materialintensitaet}%` : null },
                      { label: 'Personalint.', value: d.fields.personalintensitaet != null ? `${d.fields.personalintensitaet}%` : null },
                      { label: 'Teilnehmer', value: d.fields.anzahl_teilnehmer != null ? String(d.fields.anzahl_teilnehmer) : null },
                    ].filter(item => item.value !== null).slice(0, 4).map(({ label, value }) => (
                      <div key={label} className="bg-muted/50 rounded-lg px-2.5 py-1.5 min-w-0 overflow-hidden">
                        <p className="text-xs text-muted-foreground truncate">{label}</p>
                        <p className="text-sm font-semibold text-foreground truncate">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs"
                      onClick={() => { setEditDaten(d); setPreselectedBrancheId(null); setDatenDialogOpen(true); }}
                    >
                      <IconPencil size={12} className="mr-1 shrink-0" />Bearbeiten
                    </Button>
                    <button
                      onClick={() => setDeleteDatenTarget(d)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors border border-border"
                      title="Löschen"
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <BranchenGewerkeDialog
        open={brancheDialogOpen}
        onClose={() => { setBrancheDialogOpen(false); setEditBranche(null); }}
        onSubmit={async (fields) => {
          if (editBranche) {
            await LivingAppsService.updateBranchenGewerkeEntry(editBranche.record_id, fields);
          } else {
            await LivingAppsService.createBranchenGewerkeEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editBranche?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['BranchenGewerke']}
      />

      <BetriebsvergleichDatenDialog
        open={datenDialogOpen}
        onClose={() => { setDatenDialogOpen(false); setEditDaten(null); setPreselectedBrancheId(null); }}
        onSubmit={async (fields) => {
          if (editDaten) {
            await LivingAppsService.updateBetriebsvergleichDatenEntry(editDaten.record_id, fields);
          } else {
            await LivingAppsService.createBetriebsvergleichDatenEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editDaten ? editDaten.fields : preselectedBrancheId ? { branche_gewerk: createRecordUrl(APP_IDS.BRANCHEN_GEWERKE, preselectedBrancheId) } : undefined}
        branchenGewerkeList={branchenGewerke}
        enablePhotoScan={AI_PHOTO_SCAN['BetriebsvergleichDaten']}
      />

      <ConfirmDialog
        open={!!deleteBrancheTarget}
        title="Branche löschen"
        description={`"${deleteBrancheTarget?.fields.branche_name ?? ''}" wirklich löschen?`}
        onConfirm={handleDeleteBranche}
        onClose={() => setDeleteBrancheTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteDatenTarget}
        title="Betriebsvergleich löschen"
        description={`"${deleteDatenTarget?.fields.titel ?? ''}" wirklich löschen?`}
        onConfirm={handleDeleteDaten}
        onClose={() => setDeleteDatenTarget(null)}
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
