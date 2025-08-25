import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Sparkles, ArrowRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const ValidationPromoBanner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isValidated, setIsValidated] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkValidationStatus = async () => {
      if (!user?.id) return;

      const { data } = await supabase
        .from('candidate_profiles')
        .select('qualification_status')
        .eq('user_id', user.id)
        .single();

      if (data) {
        // qualified = validé, pending = en attente, rejected = rejeté
        const isQualified = data.qualification_status === 'qualified';
        setIsValidated(isQualified);
        // Montrer la bannière si le candidat est pending ou rejected (ou null)
        setShowBanner(data.qualification_status !== 'qualified');
      }
      setLoading(false);
    };

    checkValidationStatus();
  }, [user]);

  if (loading || !showBanner) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 shadow-xl">
      <div className="relative">
        {/* Animation de fond */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-orange-600/20 animate-pulse" />
        
        <div className="relative px-4 py-3">
          <div className="flex items-center justify-between max-w-full">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-400 blur-xl opacity-50 animate-pulse" />
                <AlertTriangle className="h-6 w-6 text-yellow-300 relative animate-bounce" />
                <Sparkles className="h-4 w-4 text-white absolute -top-1 -right-1 animate-spin" />
              </div>
              
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold text-lg">
                    ⚡ Profil non validé
                  </span>
                  <Badge className="bg-yellow-400 text-yellow-900 font-bold animate-pulse">
                    ACTION REQUISE
                  </Badge>
                </div>
                <span className="text-white/90 text-sm hidden md:block">
                  Validez vos compétences pour accéder aux missions et être visible des clients
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate('/candidate/skill-test')}
                className="bg-white text-purple-600 hover:bg-gray-100 font-bold shadow-lg hover:shadow-xl transition-all group animate-pulse hover:animate-none"
                size="default"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Démarrer le test IA
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowBanner(false)}
                className="text-white/70 hover:text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};