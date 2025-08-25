import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Columns } from "lucide-react";

interface ColumnCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnData: { title: string; color: string };
  onColumnDataChange: (data: { title: string; color: string }) => void;
  onSave: () => void;
}

export function ColumnCreateDialog({
  open,
  onOpenChange,
  columnData,
  onColumnDataChange,
  onSave
}: ColumnCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 border-2 border-purple-200">
        <DialogHeader className="bg-gradient-to-r from-blue-500 to-purple-500 -m-6 mb-4 p-4 rounded-t-lg">
          <DialogTitle className="text-white text-xl font-bold flex items-center gap-2">
            <Columns className="w-5 h-5" />
            Nouvelle colonne
          </DialogTitle>
          <DialogDescription className="text-blue-100 mt-1 text-sm">
            Ajoutez une étape à votre flux de travail
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label htmlFor="column-title" className="text-sm font-medium">Nom de la colonne</Label>
            <Input
              id="column-title"
              value={columnData.title}
              onChange={(e) => onColumnDataChange({ ...columnData, title: e.target.value })}
              placeholder="Ex: À faire, En cours, Terminé..."
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="column-color" className="text-sm font-medium">Couleur d'identification</Label>
            <Select
              value={columnData.color}
              onValueChange={(value) => onColumnDataChange({ ...columnData, color: value })}
            >
              <SelectTrigger id="column-color" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="#ef4444">
                  <span className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-red-500"></div>
                    Rouge
                  </span>
                </SelectItem>
                <SelectItem value="#f59e0b">
                  <span className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                    Orange
                  </span>
                </SelectItem>
                <SelectItem value="#eab308">
                  <span className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                    Jaune
                  </span>
                </SelectItem>
                <SelectItem value="#10b981">
                  <span className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    Vert
                  </span>
                </SelectItem>
                <SelectItem value="#3b82f6">
                  <span className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                    Bleu
                  </span>
                </SelectItem>
                <SelectItem value="#8b5cf6">
                  <span className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                    Violet
                  </span>
                </SelectItem>
                <SelectItem value="#6b7280">
                  <span className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-gray-500"></div>
                    Gris
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="border-purple-200 hover:bg-purple-50"
            >
              Annuler
            </Button>
            <Button 
              onClick={onSave} 
              disabled={!columnData.title.trim()}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
            >
              Créer la colonne
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}