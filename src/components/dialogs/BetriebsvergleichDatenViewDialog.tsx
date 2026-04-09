import type { BetriebsvergleichDaten, BranchenGewerke } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { IconPencil, IconFileText } from '@tabler/icons-react';

interface BetriebsvergleichDatenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: BetriebsvergleichDaten | null;
  onEdit: (record: BetriebsvergleichDaten) => void;
  branchenGewerkeList: BranchenGewerke[];
}

export function BetriebsvergleichDatenViewDialog({ open, onClose, record, onEdit, branchenGewerkeList }: BetriebsvergleichDatenViewDialogProps) {
  function getBranchenGewerkeDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return branchenGewerkeList.find(r => r.record_id === id)?.fields.branche_name ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Betriebsvergleich-Daten anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Titel des Betriebsvergleichs</Label>
            <p className="text-sm">{record.fields.titel ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Branche / Gewerk</Label>
            <p className="text-sm">{getBranchenGewerkeDisplayName(record.fields.branche_gewerk)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Jahr</Label>
            <p className="text-sm">{record.fields.jahr ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Herausgeber</Label>
            <p className="text-sm">{record.fields.herausgeber ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anzahl der Teilnehmer am Betriebsvergleich</Label>
            <p className="text-sm">{record.fields.anzahl_teilnehmer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Umsatzrentabilität (%)</Label>
            <p className="text-sm">{record.fields.umsatzrentabilitaet ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Materialintensität (%)</Label>
            <p className="text-sm">{record.fields.materialintensitaet ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Personalintensität (%)</Label>
            <p className="text-sm">{record.fields.personalintensitaet ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Handwerkliche Wertschöpfung pro produktiven Mitarbeiter (€)</Label>
            <p className="text-sm">{record.fields.wertschoepfung_pro_mitarbeiter ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kalkulatorischer Unternehmerlohn bei FTE = 1,0 (€)</Label>
            <p className="text-sm">{record.fields.kalk_unternehmerlohn ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">PDF-Datei des Betriebsvergleichs</Label>
            {record.fields.pdf_datei ? (
              <div className="relative w-full rounded-lg bg-muted overflow-hidden border">
                <img src={record.fields.pdf_datei} alt="" className="w-full h-auto object-contain" />
              </div>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fundstelle Jahr (Seite)</Label>
            <p className="text-sm">{record.fields.jahr_fundstelle ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fundstelle Herausgeber (Seite)</Label>
            <p className="text-sm">{record.fields.herausgeber_fundstelle ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fundstelle Teilnehmerzahl (Seite)</Label>
            <p className="text-sm">{record.fields.anzahl_teilnehmer_fundstelle ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fundstelle Umsatzrentabilität (Seite)</Label>
            <p className="text-sm">{record.fields.umsatzrentabilitaet_fundstelle ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fundstelle Materialintensität (Seite)</Label>
            <p className="text-sm">{record.fields.materialintensitaet_fundstelle ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fundstelle Personalintensität (Seite)</Label>
            <p className="text-sm">{record.fields.personalintensitaet_fundstelle ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fundstelle Wertschöpfung pro Mitarbeiter (Seite)</Label>
            <p className="text-sm">{record.fields.wertschoepfung_pro_mitarbeiter_fundstelle ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fundstelle Unternehmerlohn (Seite)</Label>
            <p className="text-sm">{record.fields.kalk_unternehmerlohn_fundstelle ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}