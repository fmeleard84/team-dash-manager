import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/ui/components/button";
import { useRef } from "react";

export default function HeroLyniqBlend() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  // Remove parallax - keep hero fixed
  const opacity = useTransform(scrollYProgress, [0, 0.8, 1], [1, 0.8, 0.6]);

  return (
    <section ref={containerRef} className="relative min-h-[100svh] w-full overflow-hidden bg-black">
      {/* Background image fixed - no parallax */}
      <div className="fixed inset-0">
        <img
          src="/src/assets/hp_charlie.jpg"
          alt="Vaya Hero"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
      </div>

      {/* Gradient overlays - much lighter for brighter image */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/10" />
      </div>

      {/* Main content with blend modes */}
      <motion.div 
        className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-center px-6 md:px-12"
        style={{ opacity }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8">
            
            {/* Main title with blend effect - no movement */}
            <motion.div 
              className="relative"
            >
              {/* Duplicate title for blend effect */}
              <div className="absolute inset-0">
                <h1 className="font-black text-white leading-[0.85] tracking-[-0.03em]
                             text-[clamp(3rem,8vw,7rem)] mix-blend-overlay">
                  <span className="block">Digital</span>
                  <span className="block">design</span>
                  <span className="block">studio</span>
                </h1>
              </div>
              
              {/* Main title with different blend mode */}
              <motion.h1
                initial={{ opacity: 0, filter: "blur(20px)" }}
                animate={{ 
                  opacity: 1, 
                  filter: "blur(0px)",
                  transition: { duration: 1.2, ease: [0.43, 0.13, 0.23, 0.96] }
                }}
                className="relative font-black leading-[0.85] tracking-[-0.03em]
                         text-[clamp(3rem,8vw,7rem)] mix-blend-screen"
              >
                <span className="block bg-gradient-to-r from-white via-white to-gray-300 bg-clip-text text-transparent">
                  Digital
                </span>
                <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                  design
                </span>
                <span className="block bg-gradient-to-r from-gray-300 via-white to-white bg-clip-text text-transparent">
                  studio
                </span>
              </motion.h1>

              {/* Glow effect behind text */}
              <div className="absolute -inset-x-20 -inset-y-10 -z-10">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-purple-600/20 blur-3xl mix-blend-color-dodge" />
              </div>
            </motion.div>

            {/* Pre-title with blend */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
              className="mb-6 order-first"
            >
              <span className="inline-flex items-center gap-2 text-sm md:text-base tracking-widest uppercase mix-blend-difference">
                <span className="w-12 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
                <span className="text-white/80">Digital Excellence</span>
              </span>
            </motion.div>

            {/* Subtitle with softer blend */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.5 }}
              className="mt-8 max-w-xl text-white/90 text-base md:text-lg leading-relaxed mix-blend-soft-light"
            >
              Nous orchestrons la transformation digitale des entreprises ambitieuses. 
              Design premium, développement sur-mesure, résultats exceptionnels.
            </motion.p>

            {/* CTA Buttons with glass effect */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.7 }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <Button
                size="lg"
                className="relative overflow-hidden backdrop-blur-md bg-white/10 border border-white/20 
                         hover:bg-white/20 text-white transition-all duration-300 group"
              >
                <span className="relative z-10 flex items-center gap-2 mix-blend-plus-lighter">
                  Découvrir nos projets
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/30 to-pink-600/30 
                              opacity-0 group-hover:opacity-100 transition-opacity duration-300 mix-blend-color" />
              </Button>
              
              <Button
                size="lg"
                className="relative overflow-hidden border border-white/40 bg-transparent
                         hover:bg-white hover:text-black text-white transition-all duration-300 group"
              >
                <span className="relative z-10 font-medium">
                  Voir les tarifs
                </span>
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-100 
                              transition-opacity duration-300" />
              </Button>
            </motion.div>
          </div>

          {/* Side content with overlay blend */}
          <div className="lg:col-span-4 lg:pl-12">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.9 }}
              className="relative"
            >
              {/* Glass card with stats */}
              <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                {[
                  { number: "150+", label: "Projets livrés" },
                  { number: "98%", label: "Satisfaction" },
                  { number: "24h", label: "Réponse" },
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 1 + index * 0.1 }}
                    className="flex items-center gap-4 border-l-2 border-white/20 pl-4 mix-blend-screen"
                  >
                    <span className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-gray-400 
                                   bg-clip-text text-transparent">
                      {stat.number}
                    </span>
                    <span className="text-sm text-white/60 uppercase tracking-wider">
                      {stat.label}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Glow effect */}
              <div className="absolute -inset-4 -z-10 opacity-50">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 
                              blur-2xl mix-blend-color-dodge" />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator with blend */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 mix-blend-difference"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center gap-2 text-white"
          >
            <span className="text-xs uppercase tracking-widest">Scroll</span>
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Decorative elements with blend */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mix-blend-overlay" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mix-blend-overlay" />
      
      {/* Noise texture overlay for depth */}
      <div className="absolute inset-0 noise opacity-[0.03] mix-blend-overlay pointer-events-none" />
    </section>
  );
}