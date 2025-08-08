import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface KickoffDialogProps {
  open: boolean;
  projectTitle: string;
  onClose: () => void;
  onConfirm: (kickoffISO: string) => void;
}

export function KickoffDialog({ open, projectTitle, onClose, onConfirm }: KickoffDialogProps) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().slice(0, 10);
  const defaultTime = "10:00";

  const [date, setDate] = useState<string>(defaultDate);
  const [time, setTime] = useState<string>(defaultTime);

  const handleConfirm = () => {
    try {
      const [hours, minutes] = time.split(":").map(Number);
      const dt = new Date(date + "T00:00:00");
      dt.setHours(hours, minutes, 0, 0);
      onConfirm(dt.toISOString());
    } catch {
      // Fallback: now + 1h
      const now = new Date();
      now.setHours(now.getHours() + 1);
      onConfirm(now.toISOString());
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Planifier la réunion de lancement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Indiquez la date et l’heure de la première réunion du « {projectTitle} ».
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="kickoff-date">Jour</Label>
              <Input id="kickoff-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kickoff-time">Heure</Label>
              <Input id="kickoff-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleConfirm}>Créer l’événement</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
