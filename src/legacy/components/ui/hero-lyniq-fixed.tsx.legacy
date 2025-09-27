import { motion } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HeroLyniqFixed() {
  return (
    <>
      {/* Hero Section - Fixed Background */}
      <div className="fixed inset-0 w-full h-screen z-0">
        {/* Background video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src="/src/assets/video_hp_2.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        {/* Hero Content - No z-index to allow mix-blend-mode */}
        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8">
              
              {/* Pre-title */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="mb-6"
              >
                <span className="inline-flex items-center gap-2 text-sm md:text-base tracking-widest uppercase text-white/90">
                  <span className="w-12 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
                  Future of work
                </span>
              </motion.div>
              
              {/* Main title with Division effect */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
                className="relative"
              >
                {/* Main title with mix-blend-mode effect */}
                <h1 className="font-black leading-[0.85] tracking-[-0.03em]
                         text-[clamp(3rem,8vw,7rem)] text-white"
                    style={{
                      mixBlendMode: 'difference'
                    }}>
                  <span className="block">Plug talent</span>
                  <span className="block">play result</span>
                </h1>
              </motion.div>

              {/* Subtitle */}

            </div>

            {/* Side stats */}
            <div className="lg:col-span-4 lg:pl-12">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.7 }}
                className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6 space-y-6"
              >
                {[
                  { number: "150+", label: "Projets livrés" },
                  { number: "98%", label: "Satisfaction" },
                  { number: "24h", label: "Réponse" },
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.8 + index * 0.1 }}
                    className="flex items-center gap-4 border-l-2 border-white/30 pl-4"
                  >
                    <span className="text-3xl md:text-4xl font-bold text-white">
                      {stat.number}
                    </span>
                    <span className="text-sm text-white/70 uppercase tracking-wider">
                      {stat.label}
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.2 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="flex flex-col items-center gap-2 text-white/80"
            >
              <span className="text-xs uppercase tracking-widest">Scroll</span>
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Spacer to push content down */}
      <div className="h-screen" />
    </>
  );
}