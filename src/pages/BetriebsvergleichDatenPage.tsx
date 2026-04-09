import { useState, useEffect } from 'react';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import type { BetriebsvergleichDaten, BranchenGewerke } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { IconPencil, IconTrash, IconPlus, IconSearch, IconArrowsUpDown, IconArrowUp, IconArrowDown, IconFileText } from '@tabler/icons-react';
import { BetriebsvergleichDatenDialog } from '@/components/dialogs/BetriebsvergleichDatenDialog';
import { BetriebsvergleichDatenViewDialog } from '@/components/dialogs/BetriebsvergleichDatenViewDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';

export default function BetriebsvergleichDatenPage() {
  const [records, setRecords] = useState<BetriebsvergleichDaten[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BetriebsvergleichDaten | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BetriebsvergleichDaten | null>(null);
  const [viewingRecord, setViewingRecord] = useState<BetriebsvergleichDaten | null>(null);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [branchenGewerkeList, setBranchenGewerkeList] = useState<BranchenGewerke[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, branchenGewerkeData] = await Promise.all([
        LivingAppsService.getBetriebsvergleichDaten(),
        LivingAppsService.getBranchenGewerke(),
      ]);
      setRecords(mainData);
      setBranchenGewerkeList(branchenGewerkeData);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(fields: BetriebsvergleichDaten['fields']) {
    await LivingAppsService.createBetriebsvergleichDatenEntry(fields);
    await loadData();
    setDialogOpen(false);
  }

  async function handleUpdate(fields: BetriebsvergleichDaten['fields']) {
    if (!editingRecord) return;
    await LivingAppsService.updateBetriebsvergleichDatenEntry(editingRecord.record_id, fields);
    await loadData();
    setEditingRecord(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await LivingAppsService.deleteBetriebsvergleichDatenEntry(deleteTarget.record_id);
    setRecords(prev => prev.filter(r => r.record_id !== deleteTarget.record_id));
    setDeleteTarget(null);
  }

  function getBranchenGewerkeDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return branchenGewerkeList.find(r => r.record_id === id)?.fields.branche_name ?? '—';
  }

  const filtered = records.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return Object.values(r.fields).some(v => {
      if (v == null) return false;
      if (Array.isArray(v)) return v.some(item => typeof item === 'object' && item !== null && 'label' in item ? String((item as any).label).toLowerCase().includes(s) : String(item).toLowerCase().includes(s));
      if (typeof v === 'object' && 'label' in (v as any)) return String((v as any).label).toLowerCase().includes(s);
      return String(v).toLowerCase().includes(s);
    });
  });

  function toggleSort(key: string) {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(''); setSortDir('asc'); }
    } else { setSortKey(key); setSortDir('asc'); }
  }

  function sortRecords<T extends { fields: Record<string, any> }>(recs: T[]): T[] {
    if (!sortKey) return recs;
    return [...recs].sort((a, b) => {
      let va: any = a.fields[sortKey], vb: any = b.fields[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'object' && 'label' in va) va = va.label;
      if (typeof vb === 'object' && 'label' in vb) vb = vb.label;
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <PageShell
      title="Betriebsvergleich-Daten"
      subtitle={`${records.length} Betriebsvergleich-Daten im System`}
      action={
        <Button onClick={() => setDialogOpen(true)} className="shrink-0 rounded-full shadow-sm">
          <IconPlus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="relative w-full max-w-sm">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Betriebsvergleich-Daten suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="rounded-[27px] bg-card shadow-lg overflow-hidden">
        <Table className="[&_tbody_td]:px-6 [&_tbody_td]:py-2 [&_tbody_td]:text-base [&_tbody_td]:font-medium [&_tbody_tr:first-child_td]:pt-6 [&_tbody_tr:last-child_td]:pb-10">
          <TableHeader className="bg-secondary">
            <TableRow className="border-b border-input">
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('titel')}>
                <span className="inline-flex items-center gap-1">
                  Titel des Betriebsvergleichs
                  {sortKey === 'titel' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('branche_gewerk')}>
                <span className="inline-flex items-center gap-1">
                  Branche / Gewerk
                  {sortKey === 'branche_gewerk' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('jahr')}>
                <span className="inline-flex items-center gap-1">
                  Jahr
                  {sortKey === 'jahr' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('herausgeber')}>
                <span className="inline-flex items-center gap-1">
                  Herausgeber
                  {sortKey === 'herausgeber' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('anzahl_teilnehmer')}>
                <span className="inline-flex items-center gap-1">
                  Anzahl der Teilnehmer am Betriebsvergleich
                  {sortKey === 'anzahl_teilnehmer' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('umsatzrentabilitaet')}>
                <span className="inline-flex items-center gap-1">
                  Umsatzrentabilität (%)
                  {sortKey === 'umsatzrentabilitaet' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('materialintensitaet')}>
                <span className="inline-flex items-center gap-1">
                  Materialintensität (%)
                  {sortKey === 'materialintensitaet' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('personalintensitaet')}>
                <span className="inline-flex items-center gap-1">
                  Personalintensität (%)
                  {sortKey === 'personalintensitaet' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('wertschoepfung_pro_mitarbeiter')}>
                <span className="inline-flex items-center gap-1">
                  Handwerkliche Wertschöpfung pro produktiven Mitarbeiter (€)
                  {sortKey === 'wertschoepfung_pro_mitarbeiter' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('kalk_unternehmerlohn')}>
                <span className="inline-flex items-center gap-1">
                  Kalkulatorischer Unternehmerlohn bei FTE = 1,0 (€)
                  {sortKey === 'kalk_unternehmerlohn' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('pdf_datei')}>
                <span className="inline-flex items-center gap-1">
                  PDF-Datei des Betriebsvergleichs
                  {sortKey === 'pdf_datei' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('jahr_fundstelle')}>
                <span className="inline-flex items-center gap-1">
                  Fundstelle Jahr (Seite)
                  {sortKey === 'jahr_fundstelle' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('herausgeber_fundstelle')}>
                <span className="inline-flex items-center gap-1">
                  Fundstelle Herausgeber (Seite)
                  {sortKey === 'herausgeber_fundstelle' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('anzahl_teilnehmer_fundstelle')}>
                <span className="inline-flex items-center gap-1">
                  Fundstelle Teilnehmerzahl (Seite)
                  {sortKey === 'anzahl_teilnehmer_fundstelle' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('umsatzrentabilitaet_fundstelle')}>
                <span className="inline-flex items-center gap-1">
                  Fundstelle Umsatzrentabilität (Seite)
                  {sortKey === 'umsatzrentabilitaet_fundstelle' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('materialintensitaet_fundstelle')}>
                <span className="inline-flex items-center gap-1">
                  Fundstelle Materialintensität (Seite)
                  {sortKey === 'materialintensitaet_fundstelle' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('personalintensitaet_fundstelle')}>
                <span className="inline-flex items-center gap-1">
                  Fundstelle Personalintensität (Seite)
                  {sortKey === 'personalintensitaet_fundstelle' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('wertschoepfung_pro_mitarbeiter_fundstelle')}>
                <span className="inline-flex items-center gap-1">
                  Fundstelle Wertschöpfung pro Mitarbeiter (Seite)
                  {sortKey === 'wertschoepfung_pro_mitarbeiter_fundstelle' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('kalk_unternehmerlohn_fundstelle')}>
                <span className="inline-flex items-center gap-1">
                  Fundstelle Unternehmerlohn (Seite)
                  {sortKey === 'kalk_unternehmerlohn_fundstelle' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="w-24 uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortRecords(filtered).map(record => (
              <TableRow key={record.record_id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={(e) => { if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) return; setViewingRecord(record); }}>
                <TableCell className="font-medium">{record.fields.titel ?? '—'}</TableCell>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getBranchenGewerkeDisplayName(record.fields.branche_gewerk)}</span></TableCell>
                <TableCell>{record.fields.jahr ?? '—'}</TableCell>
                <TableCell>{record.fields.herausgeber ?? '—'}</TableCell>
                <TableCell>{record.fields.anzahl_teilnehmer ?? '—'}</TableCell>
                <TableCell>{record.fields.umsatzrentabilitaet ?? '—'}</TableCell>
                <TableCell>{record.fields.materialintensitaet ?? '—'}</TableCell>
                <TableCell>{record.fields.personalintensitaet ?? '—'}</TableCell>
                <TableCell>{record.fields.wertschoepfung_pro_mitarbeiter ?? '—'}</TableCell>
                <TableCell>{record.fields.kalk_unternehmerlohn ?? '—'}</TableCell>
                <TableCell>{record.fields.pdf_datei ? <div className="relative h-8 w-8 rounded bg-muted overflow-hidden"><div className="absolute inset-0 flex items-center justify-center"><IconFileText size={14} className="text-muted-foreground" /></div><img src={record.fields.pdf_datei} alt="" className="relative h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} /></div> : '—'}</TableCell>
                <TableCell>{record.fields.jahr_fundstelle ?? '—'}</TableCell>
                <TableCell>{record.fields.herausgeber_fundstelle ?? '—'}</TableCell>
                <TableCell>{record.fields.anzahl_teilnehmer_fundstelle ?? '—'}</TableCell>
                <TableCell>{record.fields.umsatzrentabilitaet_fundstelle ?? '—'}</TableCell>
                <TableCell>{record.fields.materialintensitaet_fundstelle ?? '—'}</TableCell>
                <TableCell>{record.fields.personalintensitaet_fundstelle ?? '—'}</TableCell>
                <TableCell>{record.fields.wertschoepfung_pro_mitarbeiter_fundstelle ?? '—'}</TableCell>
                <TableCell>{record.fields.kalk_unternehmerlohn_fundstelle ?? '—'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditingRecord(record)}>
                      <IconPencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(record)}>
                      <IconTrash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={20} className="text-center py-16 text-muted-foreground">
                  {search ? 'Keine Ergebnisse gefunden.' : 'Noch keine Betriebsvergleich-Daten. Jetzt hinzufügen!'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <BetriebsvergleichDatenDialog
        open={dialogOpen || !!editingRecord}
        onClose={() => { setDialogOpen(false); setEditingRecord(null); }}
        onSubmit={editingRecord ? handleUpdate : handleCreate}
        defaultValues={editingRecord?.fields}
        branchenGewerkeList={branchenGewerkeList}
        enablePhotoScan={AI_PHOTO_SCAN['BetriebsvergleichDaten']}
        enablePhotoLocation={AI_PHOTO_LOCATION['BetriebsvergleichDaten']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Betriebsvergleich-Daten löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />

      <BetriebsvergleichDatenViewDialog
        open={!!viewingRecord}
        onClose={() => setViewingRecord(null)}
        record={viewingRecord}
        onEdit={(r) => { setViewingRecord(null); setEditingRecord(r); }}
        branchenGewerkeList={branchenGewerkeList}
      />
    </PageShell>
  );
}