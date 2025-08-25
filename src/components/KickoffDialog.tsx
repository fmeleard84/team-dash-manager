import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Rocket, Users } from "lucide-react";

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
      <DialogContent aria-describedby="kickoff-desc" className="sm:max-w-md">
        <DialogHeader className="bg-gradient-to-r from-green-50 to-emerald-50 -m-6 mb-4 p-6 rounded-t-lg border-b border-green-200/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Planifier la réunion de lancement
              </DialogTitle>
              <DialogDescription id="kickoff-desc" className="text-green-700 text-sm mt-1">
                {projectTitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200/50">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">Démarrer avec votre nouvelle équipe !</p>
                <p className="text-blue-700 mt-1">
                  Rien ne vaut une première séance de Kickoff, c'est parti !
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="kickoff-date" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Calendar className="w-4 h-4 text-green-600" />
                Date
              </Label>
              <Input 
                id="kickoff-date" 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="border-gray-200 focus:border-green-400 focus:ring-green-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kickoff-time" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Clock className="w-4 h-4 text-green-600" />
                Heure
              </Label>
              <Input 
                id="kickoff-time" 
                type="time" 
                value={time} 
                onChange={(e) => setTime(e.target.value)}
                className="border-gray-200 focus:border-green-400 focus:ring-green-400"
              />
            </div>
          </div>
        </div>
        
        <DialogFooter className="bg-gray-50 -m-6 mt-4 p-4 rounded-b-lg border-t">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="border-gray-300 hover:bg-gray-100"
          >
            Annuler
          </Button>
          <Button 
            onClick={handleConfirm}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg"
          >
            <Rocket className="w-4 h-4 mr-2" />
            Lancer le projet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}