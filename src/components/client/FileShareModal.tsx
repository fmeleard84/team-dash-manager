
import { useEffect, useMemo, useState } from "react";
import { FullScreenModal, ModalActions } from "@/components/ui/fullscreen-modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Visibility = "team" | "custom" | "private";

interface FileShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  path: string; // storage.objects.name (ex: project/{projectId}/folder/file.pdf)
}

type ProjectMemberRow = {
  user_id: string;
  profiles?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  role?: string | null;
  status?: string | null;
};

export default function FileShareModal({ isOpen, onClose, projectId, path }: FileShareModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<ProjectMemberRow[]>([]);
  const [visibility, setVisibility] = useState<Visibility>("team");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Charger les membres acceptés du projet
  useEffect(() => {
    if (!isOpen || !projectId) return;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("project_members")
        .select("user_id, role, status, profiles:profiles(id, first_name, last_name, email)")
        .eq("project_id", projectId)
        .eq("status", "accepted");
      if (error) {
        console.error("load members error", error);
        toast({ title: "Erreur", description: "Impossible de charger les membres du projet" });
        return;
      }
      setMembers(((data ?? []) as unknown) as ProjectMemberRow[]);
    })();
  }, [isOpen, projectId]);

  // Charger l'ACL existante pour ce path
  useEffect(() => {
    if (!isOpen || !path) return;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("project_file_acls")
        .select("*")
        .eq("path", path)
        .maybeSingle();

      if (error) {
        console.error("load acl error", error);
        return;
      }
      if (data) {
        const row = data as any;
        setVisibility((row.visibility as Visibility) ?? "team");
        setSelectedUserIds(((row.allowed_user_ids ?? []) as string[]) ?? []);
      } else {
        // Par défaut, équipe
        setVisibility("team");
        setSelectedUserIds([]);
      }
    })();
  }, [isOpen, path]);

  const toggleUser = (id: string) => {
    setSelectedUserIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  const memberLabel = (m: ProjectMemberRow) => {
    const fn = m.profiles?.first_name ?? "";
    const ln = m.profiles?.last_name ?? "";
    const full = `${fn} ${ln}`.trim();
    return full || m.profiles?.email || m.user_id;
  };

  const canSave = useMemo(() => {
    if (visibility === "custom") return selectedUserIds.length > 0;
    return true;
  }, [visibility, selectedUserIds]);

  const handleSave = async () => {
    setLoading(true);
    const payload = {
      path,
      project_id: projectId,
      visibility,
      allowed_user_ids: visibility === "custom" ? selectedUserIds : [],
    };
    const { error } = await (supabase as any).from("project_file_acls").upsert(payload);
    setLoading(false);
    if (error) {
      console.error("save acl error", error);
      toast({ title: "Erreur", description: "Impossible d'enregistrer les droits" });
      return;
    }
    toast({ title: "Droits mis à jour" });
    onClose();
  };

  return (
    <FullScreenModal isOpen={isOpen} onClose={() => onClose(false)} title="" description="">
      <div className="space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Partager le fichier</h2>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-sm">Qui peut voir ce fichier ?</Label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={visibility === "team" ? "default" : "outline"}
                onClick={() => setVisibility("team")}
                className="text-sm"
              >
                Toute l'équipe
              </Button>
              <Button
                type="button"
                variant={visibility === "custom" ? "default" : "outline"}
                onClick={() => setVisibility("custom")}
                className="text-sm"
              >
                Personnalisé
              </Button>
              <Button
                type="button"
                variant={visibility === "private" ? "default" : "outline"}
                onClick={() => setVisibility("private")}
                className="text-sm"
              >
                Privé (propriétaire)
              </Button>
            </div>
          </div>

          {visibility === "custom" && (
            <div className="space-y-2">
              <Label className="text-sm">Sélectionnez les membres autorisés</Label>
              <div className="max-h-64 overflow-auto rounded border p-3 space-y-2">
                {members.length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucun membre accepté pour ce projet.</p>
                )}
                {members.map((m) => (
                  <label key={m.user_id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedUserIds.includes(m.user_id)}
                      onCheckedChange={() => toggleUser(m.user_id)}
                    />
                    <span>{memberLabel(m)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>Annuler</Button>
            <Button onClick={handleSave} disabled={!canSave || loading}>
              {loading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      </div>
    </FullScreenModal>
  );
}

