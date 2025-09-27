import { ReactNode } from 'react';
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ProjectCardDesignProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export const ProjectCardDesign = ({ children, className, onClick }: ProjectCardDesignProps) => {
  return (
    <Card 
      className={cn(
        "group relative bg-white border border-[#ECEEF1] rounded-2xl p-6",
        "shadow-[0_4px_16px_rgba(0,0,0,0.06)]",
        "transition-transform duration-200",
        "hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </Card>
  );
};

// Styles partagés pour les sections de projets
export const projectSectionStyles = {
  header: "mt-6",
  title: "flex items-center gap-3 text-4xl font-extrabold text-[#0E0F12]",
  subtitle: "mt-2 text-lg text-[#6B7280]",
  
  tabs: {
    list: "flex gap-8 border-b border-[#ECEEF1] bg-transparent p-0 h-auto rounded-none",
    trigger: "pb-3 px-0 bg-transparent border-b-2 border-transparent data-[state=active]:border-[#7B3EF4] data-[state=active]:text-[#0E0F12] text-[#6B7280] hover:text-[#0E0F12] transition-colors duration-200 rounded-none font-medium"
  },
  
  content: {
    wrapper: "bg-[#F7F8FA] rounded-xl p-6 mt-6", // Fond gris clair pour faire ressortir les cards
    grid: "grid grid-cols-1 lg:grid-cols-2 gap-6"
  },
  
  badge: {
    new: "bg-[#F1F3F5] text-[#6B7280] text-xs font-medium px-2 py-1 rounded",
    status: {
      play: "bg-[#7B3EF4] text-white",
      pause: "bg-[#F7F8FA] text-[#6B7280]",
      attente: "bg-orange-100 text-orange-700",
      termine: "bg-green-100 text-green-700"
    }
  },
  
  pricing: {
    container: "flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#F7F8FA] border border-[#ECEEF1]",
    icon: "h-4 w-4 text-[#7B3EF4]",
    label: "text-xs text-[#6B7280] uppercase",
    value: "text-sm font-medium text-[#0E0F12]"
  },
  
  button: {
    primary: "h-11 px-5 bg-[#7B3EF4] hover:bg-[#6A35D3] text-white rounded-full shadow-[0_6px_20px_rgba(123,62,244,0.18)] transition-all duration-200 font-medium",
    secondary: "text-sm text-[#0E0F12] underline-offset-4 hover:underline",
    disabled: "h-11 px-5 bg-[#F7F8FA] text-[#6B7280] rounded-full font-medium cursor-not-allowed"
  }
};