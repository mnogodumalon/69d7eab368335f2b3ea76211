import type { BranchenGewerke } from '@/types/app';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { IconPencil } from '@tabler/icons-react';

interface BranchenGewerkeViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: BranchenGewerke | null;
  onEdit: (record: BranchenGewerke) => void;
}

export function BranchenGewerkeViewDialog({ open, onClose, record, onEdit }: BranchenGewerkeViewDialogProps) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Branchen & Gewerke anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Name der Branche / des Gewerks</Label>
            <p className="text-sm">{record.fields.branche_name ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beschreibung (optional)</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.branche_beschreibung ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}