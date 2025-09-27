import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function IntroOverlay() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem("introSeen");
    if (!seen) setShow(true);
  }, []);

  const close = () => {
    sessionStorage.setItem("introSeen", "1");
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black noise"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6, ease: "easeInOut" } }}
          role="dialog" 
          aria-label="Introduction"
        >
          {/* Gradient subtle */}
          <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black opacity-50" />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              transition: { 
                duration: 0.8, 
                ease: [0.43, 0.13, 0.23, 0.96] // Custom easing
              } 
            }}
            className="relative flex flex-col items-center gap-8"
          >
            {/* Logo - Vaya */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                transition: { delay: 0.2, duration: 0.6 }
              }}
              className="flex flex-col items-center"
            >
              <div className="relative">
                <motion.div
                  className="absolute inset-0 bg-accent/20 blur-3xl"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <h1 className="relative text-6xl md:text-7xl font-bold text-white tracking-tight">
                  <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                    Vaya
                  </span>
                </h1>
              </div>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%", transition: { delay: 0.6, duration: 0.8 } }}
                className="h-px bg-gradient-to-r from-transparent via-accent to-transparent mt-4"
              />
            </motion.div>
            
            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ 
                opacity: 1, 
                y: 0, 
                transition: { delay: 0.8, duration: 0.6 } 
              }}
              className="text-gray-400 text-sm md:text-base tracking-widest uppercase"
            >
              The future of work
            </motion.p>

            {/* Loading dots animation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 1 } }}
              className="flex gap-2"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-accent rounded-full"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </motion.div>
          </motion.div>

          {/* Auto close après 2.5s */}
          <AutoClose onDone={close} delay={2500} />

          {/* Skip button (accessibilité) */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 1 } }}
            onClick={close}
            className="absolute bottom-8 right-8 text-xs md:text-sm text-gray-500 hover:text-white 
                       transition-colors duration-200 flex items-center gap-2 group"
            aria-label="Passer l'introduction"
          >
            <span className="underline underline-offset-4">Passer</span>
            <ArrowRight className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" />
          </motion.button>

          {/* Corner marks pour style premium */}
          <div className="absolute top-8 left-8 w-8 h-8 border-l-2 border-t-2 border-accent/30" />
          <div className="absolute top-8 right-8 w-8 h-8 border-r-2 border-t-2 border-accent/30" />
          <div className="absolute bottom-8 left-8 w-8 h-8 border-l-2 border-b-2 border-accent/30" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AutoClose({ onDone, delay = 2500 }: { onDone: () => void; delay?: number }) {
  useEffect(() => {
    const t = setTimeout(onDone, delay);
    return () => clearTimeout(t);
  }, [onDone, delay]);
  return null;
}