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
          <source src="/src/assets/video_hp_charlie.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        {/* Light gradient overlays for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/10" />
        
        {/* Hero Content */}
        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 md:px-12">
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
                  Digital Excellence
                </span>
              </motion.div>
              
              {/* Main title with Division effect */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
                className="relative"
              >
                {/* Division effect layers */}
                <h1 className="font-black leading-[0.85] tracking-[-0.03em]
                         text-[clamp(3rem,8vw,7rem)] relative">
                  {/* Bottom layer - cyan shift */}
                  <div className="absolute inset-0 opacity-60" style={{ transform: 'translate(-2px, 2px)' }}>
                    <span className="block text-cyan-400 mix-blend-screen">Digital</span>
                    <span className="block text-cyan-400 mix-blend-screen">design</span>
                    <span className="block text-cyan-400 mix-blend-screen">studio</span>
                  </div>
                  
                  {/* Middle layer - magenta shift */}
                  <div className="absolute inset-0 opacity-60" style={{ transform: 'translate(2px, -2px)' }}>
                    <span className="block text-pink-500 mix-blend-screen">Digital</span>
                    <span className="block text-pink-500 mix-blend-screen">design</span>
                    <span className="block text-pink-500 mix-blend-screen">studio</span>
                  </div>
                  
                  {/* Top layer - main text */}
                  <div className="relative mix-blend-lighten">
                    <span className="block text-white">Digital</span>
                    <span className="block text-white">design</span>
                    <span className="block text-white">studio</span>
                  </div>
                </h1>
              </motion.div>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                className="mt-8 max-w-xl text-white/90 text-base md:text-lg leading-relaxed drop-shadow-lg"
              >
                Nous orchestrons la transformation digitale des entreprises ambitieuses. 
                Design premium, développement sur-mesure, résultats exceptionnels.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.5 }}
                className="mt-10 flex flex-wrap gap-4"
              >
                <Button
                  size="lg"
                  className="bg-white text-black hover:bg-gray-100 font-semibold transition-all duration-300 group"
                >
                  <span className="flex items-center gap-2">
                    Découvrir nos projets
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Button>
                
                <Button
                  size="lg"
                  className="border-2 border-white bg-transparent text-white hover:bg-white hover:text-black 
                           font-semibold transition-all duration-300"
                >
                  Voir les tarifs
                </Button>
              </motion.div>
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