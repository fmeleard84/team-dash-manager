import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef } from "react";

export default function HeroLyniq() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  // Parallax effect for background
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.8, 0.6]);

  return (
    <section ref={containerRef} className="relative min-h-[100svh] w-full overflow-hidden">
      {/* Background image with parallax */}
      <motion.div 
        className="absolute inset-0"
        style={{ y }}
      >
        <img
          src="/src/assets/hp_charlie.jpg"
          alt="Team Dash Manager Hero"
          className="absolute inset-0 h-[120%] w-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
      </motion.div>

      {/* Multi-layer gradients for depth */}
      <motion.div 
        className="absolute inset-0"
        style={{ opacity }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />
        {/* Noise texture overlay */}
        <div className="absolute inset-0 noise opacity-20" />
      </motion.div>

      {/* Main content */}
      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-center px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8">
            {/* Pre-title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="mb-6"
            >
              <span className="inline-flex items-center gap-2 text-accent text-sm md:text-base tracking-widest uppercase">
                <span className="w-12 h-px bg-accent" />
                Digital Excellence
              </span>
            </motion.div>

            {/* Main title with split animation */}
            <div className="overflow-hidden">
              <motion.h1
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
                className="font-black text-white leading-[0.85] tracking-[-0.03em]
                         text-[clamp(3rem,8vw,7rem)] max-w-[12ch]"
              >
                <span className="block">Digital</span>
                <span className="block text-accent">design</span>
                <span className="block">studio</span>
              </motion.h1>
            </div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
              className="mt-8 max-w-xl text-gray-300 text-base md:text-lg leading-relaxed"
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
                className="btn-premium group relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Découvrir nos projets
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Button>
              
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 hover:border-white/40"
              >
                Voir les tarifs
              </Button>
            </motion.div>
          </div>

          {/* Side stats/badges */}
          <div className="lg:col-span-4 lg:pl-12">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.7 }}
              className="space-y-6"
            >
              {[
                { number: "150+", label: "Projets livrés" },
                { number: "98%", label: "Satisfaction client" },
                { number: "24h", label: "Temps de réponse" },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.8 + index * 0.1 }}
                  className="flex items-center gap-4 border-l-2 border-accent/50 pl-4"
                >
                  <span className="text-3xl md:text-4xl font-bold text-white">
                    {stat.number}
                  </span>
                  <span className="text-sm text-gray-400 uppercase tracking-wider">
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
            className="flex flex-col items-center gap-2 text-white/60"
          >
            <span className="text-xs uppercase tracking-widest">Scroll</span>
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </motion.div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
    </section>
  );
}