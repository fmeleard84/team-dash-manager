import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight,
  Menu,
  X,
  ChevronRight,
  Users,
  Zap,
  Shield,
  Globe,
  Star,
  CheckCircle2,
} from 'lucide-react';
import IntroOverlay from '@/components/ui/intro-overlay';
import HeroLyniqFixed from '@/components/ui/hero-lyniq-fixed';

export const HomePage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeService, setActiveService] = useState(0);
  const servicesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Observer pour les animations au scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-inview');
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const services = [
    { 
      id: '01',
      title: 'Digital Product Design',
      description: 'Créez des expériences utilisateur exceptionnelles avec notre expertise en design system et interface'
    },
    { 
      id: '02',
      title: 'Team Building Externalisé',
      description: 'Constituez des équipes d\'experts autonomes en quelques clics, sans processus de recrutement'
    },
    { 
      id: '03',
      title: 'Consulting Stratégique',
      description: 'Accélérez votre transformation digitale avec des consultants seniors spécialisés'
    },
    { 
      id: '04',
      title: 'AI & Automation',
      description: 'Intégrez l\'intelligence artificielle pour automatiser et optimiser vos processus métier'
    }
  ];

  const stats = [
    { number: '500+', label: 'Experts vérifiés' },
    { number: '48h', label: 'Activation équipe' },
    { number: '97%', label: 'Satisfaction client' },
    { number: '15M€', label: 'Projets réalisés' }
  ];

  return (
    <>
      {/* Intro Overlay */}
      <IntroOverlay />
      
      <div className="min-h-screen bg-white">
      {/* Header Premium */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-black/90 backdrop-blur-md border-b border-white/20' : 'bg-transparent'
      }`}>
        <div className="container mx-auto">
          <nav className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="text-2xl font-bold">
                <span className="text-white">Team</span>
                <span className="text-white">Dash</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-8">
              <a href="#services" className="text-eyebrow font-bold text-white/70 hover:text-white transition-colors">
                SERVICES
              </a>
              <a href="#process" className="text-eyebrow font-bold text-white/70 hover:text-white transition-colors">
                PROCESS
              </a>
              <a href="#expertise" className="text-eyebrow font-bold text-white/70 hover:text-white transition-colors">
                EXPERTISE
              </a>
              <a href="#about" className="text-eyebrow font-bold text-white/70 hover:text-white transition-colors">
                À PROPOS
              </a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden lg:flex items-center gap-4">
              <Link to="/login">
                <button className="px-6 py-2 text-white border border-white/30 hover:bg-white/10 rounded-lg transition-all">
                  Connexion
                </button>
              </Link>
              <Link to="/register">
                <button className="px-6 py-2 bg-white text-black hover:bg-white/90 rounded-lg transition-all flex items-center gap-2">
                  Commencer
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="lg:hidden p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
            </button>
          </nav>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="lg:hidden bg-white border-t border-gray-200">
              <div className="container py-6 space-y-4">
                <a href="#services" className="block text-body text-black hover:text-accent">Services</a>
                <a href="#process" className="block text-body text-black hover:text-accent">Process</a>
                <a href="#expertise" className="block text-body text-black hover:text-accent">Expertise</a>
                <a href="#about" className="block text-body text-black hover:text-accent">À propos</a>
                <div className="pt-4 space-y-3">
                  <Link to="/login" className="block">
                    <button className="btn-premium btn-secondary-premium w-full">Connexion</button>
                  </Link>
                  <Link to="/register" className="block">
                    <button className="btn-premium btn-accent-premium w-full">
                      Commencer
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section Fixed Background */}
      <HeroLyniqFixed />

      {/* Stats Section Premium - White background that slides over hero */}
      <section className="relative bg-white py-24 border-y border-gray-200 z-10">
        <div className="container">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center reveal">
                <div className="stat-num">{stat.number}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section - Liste massive style */}
      <section id="services" className="relative py-24 bg-black text-white z-10" ref={servicesRef}>
        <div className="container">
          <div className="mb-16">
            <div className="eyebrow text-accent mb-4">↳ NOS SERVICES</div>
            <h2 className="h-display">
              Ce que nous faisons<br />
              <span className="text-gray-600">pour vous</span>
            </h2>
          </div>
          
          <div className="space-y-0">
            {services.map((service, index) => (
              <div 
                key={index}
                className={`border-b border-gray-800 py-12 cursor-pointer transition-all duration-300 hover:pl-8 ${
                  activeService === index ? 'pl-8' : ''
                }`}
                onMouseEnter={() => setActiveService(index)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-baseline gap-6 mb-4">
                      <span className={`text-eyebrow ${activeService === index ? 'text-accent' : 'text-gray-600'}`}>
                        {service.id}
                      </span>
                      <h3 className={`text-h2 font-bold transition-opacity duration-300 ${
                        activeService === index ? 'opacity-100' : 'opacity-20'
                      }`}>
                        {service.title}
                      </h3>
                    </div>
                    {activeService === index && (
                      <p className="text-gray-400 max-w-2xl animate-fade">
                        {service.description}
                      </p>
                    )}
                  </div>
                  {activeService === index && (
                    <ChevronRight className="w-8 h-8 text-accent animate-fade" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section avec cards premium */}
      <section id="process" className="relative py-24 bg-gray-50 z-10">
        <div className="container">
          <div className="text-center mb-16">
            <div className="eyebrow text-accent mb-4">↳ NOTRE PROCESS</div>
            <h2 className="h-display mb-6">
              Simple, rapide,<br />
              <span className="text-gray-400">efficace</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Définition',
                description: 'Décrivez votre besoin et vos objectifs. Notre IA analyse et identifie les profils parfaits.'
              },
              {
                step: '02',
                title: 'Matching',
                description: 'Validation instantanée des experts sélectionnés. Budget transparent et équipe sur-mesure.'
              },
              {
                step: '03',
                title: 'Activation',
                description: 'Votre équipe est opérationnelle en 48h. Collaboration fluide et résultats garantis.'
              }
            ].map((item, index) => (
              <div key={index} className="card-premium corner-mark reveal">
                <div className="text-eyebrow text-accent mb-4">{item.step}</div>
                <h3 className="text-h3 font-bold mb-4">{item.title}</h3>
                <p className="text-body text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Expertise Grid Section */}
      <section id="expertise" className="relative py-24 bg-white z-10">
        <div className="container">
          <div className="mb-16">
            <div className="eyebrow text-accent mb-4">↳ DOMAINES D'EXPERTISE</div>
            <h2 className="h-display max-w-3xl">
              Des experts pour chaque défi
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: '💻', title: 'Développement', count: '150+ experts' },
              { icon: '🎨', title: 'Design & UX', count: '80+ experts' },
              { icon: '📊', title: 'Data & IA', count: '60+ experts' },
              { icon: '📈', title: 'Marketing', count: '120+ experts' },
              { icon: '💼', title: 'Consulting', count: '90+ experts' },
              { icon: '🛡️', title: 'Cybersécurité', count: '40+ experts' },
              { icon: '⚡', title: 'DevOps', count: '50+ experts' },
              { icon: '🌐', title: 'Blockchain', count: '30+ experts' }
            ].map((item, index) => (
              <div key={index} className="group cursor-pointer reveal">
                <div className="bg-gray-100 rounded-xl p-6 hover:bg-accent hover:text-white transition-all duration-300">
                  <div className="text-4xl mb-4">{item.icon}</div>
                  <h3 className="font-bold mb-2">{item.title}</h3>
                  <p className="text-small opacity-60">{item.count}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial Section - Citation large */}
      <section className="relative py-24 bg-black text-white z-10">
        <div className="container max-w-4xl">
          <div className="text-center">
            <div className="text-6xl text-accent mb-8">"</div>
            <blockquote className="h-display mb-8">
              TeamDash a transformé notre façon de constituer des équipes. 
              <span className="text-accent"> En 48h, nous avions une équipe de 8 experts</span> parfaitement 
              alignés sur nos besoins.
            </blockquote>
            <div className="divider-dark-premium mx-auto w-24 mb-8"></div>
            <div>
              <p className="font-bold">Marie Dubois</p>
              <p className="text-gray-400 text-small">CEO, TechCorp France</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-32 bg-white overflow-hidden z-10">
        <div className="absolute inset-0 bg-accent-gradient opacity-10"></div>
        <div className="container relative z-10 text-center">
          <h2 className="h-display-xl mb-8">
            Prêt à passer au<br />
            <span className="h-hero-gradient">niveau supérieur ?</span>
          </h2>
          <p className="lead max-w-2xl mx-auto mb-12">
            Rejoignez les entreprises qui ont déjà révolutionné leur façon de constituer des équipes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <button className="btn-premium btn-accent-premium px-10 py-4 text-lg">
                Créer mon compte
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <button className="btn-premium btn-secondary-premium px-10 py-4 text-lg">
              Planifier une démo
            </button>
          </div>
        </div>
      </section>

      {/* Footer Premium */}
      <footer className="relative bg-black text-white py-16 border-t border-gray-800 z-10">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <h3 className="text-2xl font-bold mb-4">
                Team<span className="text-accent">Dash</span>
              </h3>
              <p className="text-gray-400 text-small">
                La plateforme qui révolutionne la constitution d'équipes externes.
              </p>
            </div>
            
            <div>
              <h4 className="text-eyebrow mb-4">PRODUIT</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Fonctionnalités</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Tarifs</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cas d'usage</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-eyebrow mb-4">ENTREPRISE</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">À propos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Carrières</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-eyebrow mb-4">SUPPORT</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Centre d'aide</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
          </div>
          
          <div className="divider-dark-premium mb-8"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-center text-gray-400 text-small">
            <p>&copy; 2024 TeamDash. Tous droits réservés.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-white transition-colors">Mentions légales</a>
              <a href="#" className="hover:text-white transition-colors">Confidentialité</a>
              <a href="#" className="hover:text-white transition-colors">CGU</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
};