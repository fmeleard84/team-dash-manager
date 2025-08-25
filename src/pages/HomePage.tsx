import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Users, 
  Zap, 
  Target, 
  Building2, 
  Code, 
  TrendingUp,
  Shield,
  Clock,
  Star,
  ArrowRight,
  CheckCircle2,
  Menu,
  X,
  Sparkles,
  Rocket,
  Globe,
  BarChart3,
  Briefcase,
  HeartHandshake
} from 'lucide-react';

export const HomePage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Activation instantanée",
      description: "Constituez votre équipe en quelques clics, sans processus de recrutement"
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "Matching intelligent",
      description: "Notre IA sélectionne les experts parfaitement adaptés à vos besoins"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "100% Autonome",
      description: "Des équipes externes qui fonctionnent sans supervision constante"
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Flexible & Scalable",
      description: "Ajustez votre équipe selon l'évolution de vos projets"
    }
  ];

  const useCases = [
    {
      icon: <Code className="w-8 h-8" />,
      title: "Développement Web/App",
      description: "Créez votre produit digital avec une équipe complète de développeurs"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Comptabilité externalisée",
      description: "Une équipe comptable dédiée pour votre gestion financière"
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Force commerciale",
      description: "Déployez une équipe commerciale sur-mesure rapidement"
    },
    {
      icon: <Briefcase className="w-8 h-8" />,
      title: "Marketing digital",
      description: "Experts en stratégie digitale et croissance"
    }
  ];

  const testimonials = [
    {
      name: "Marie Dupont",
      role: "CEO, TechStart",
      content: "Ialla nous a permis de lancer notre MVP en 3 mois avec une équipe de 5 développeurs experts, sans aucun recrutement.",
      rating: 5
    },
    {
      name: "Thomas Martin",
      role: "Directeur, Innovate Corp",
      content: "La flexibilité d'Ialla est incroyable. Nous avons pu adapter notre équipe externe selon les phases du projet.",
      rating: 5
    },
    {
      name: "Sophie Bernard",
      role: "Fondatrice, GrowthLab",
      content: "Plus besoin de CV ou d'entretiens. En 48h, j'avais une équipe commerciale opérationnelle.",
      rating: 5
    }
  ];

  const steps = [
    {
      number: "1",
      title: "Définissez votre besoin",
      description: "Décrivez votre projet et les compétences recherchées"
    },
    {
      number: "2",
      title: "Matching automatique",
      description: "Notre IA sélectionne et assemble l'équipe idéale"
    },
    {
      number: "3",
      title: "Validation rapide",
      description: "Validez les profils et le budget en un clic"
    },
    {
      number: "4",
      title: "Lancez votre projet",
      description: "Votre équipe externe est opérationnelle immédiatement"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header Navigation */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'
      }`}>
        <div className="container mx-auto px-6">
          <nav className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Ialla
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#concept" className="text-gray-700 hover:text-blue-600 transition-colors">
                Concept
              </a>
              <a href="#fonctionnement" className="text-gray-700 hover:text-blue-600 transition-colors">
                Comment ça marche
              </a>
              <a href="#usecases" className="text-gray-700 hover:text-blue-600 transition-colors">
                Cas d'usage
              </a>
              <a href="#testimonials" className="text-gray-700 hover:text-blue-600 transition-colors">
                Témoignages
              </a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <Link to="/login">
                <Button variant="ghost" className="text-gray-700">
                  Connexion
                </Button>
              </Link>
              <Link to="/register">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Commencer gratuitement
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </nav>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden bg-white border-t">
              <div className="px-4 py-6 space-y-4">
                <a href="#concept" className="block text-gray-700 hover:text-blue-600">
                  Concept
                </a>
                <a href="#fonctionnement" className="block text-gray-700 hover:text-blue-600">
                  Comment ça marche
                </a>
                <a href="#usecases" className="block text-gray-700 hover:text-blue-600">
                  Cas d'usage
                </a>
                <a href="#testimonials" className="block text-gray-700 hover:text-blue-600">
                  Témoignages
                </a>
                <div className="pt-4 space-y-3">
                  <Link to="/login" className="block">
                    <Button variant="outline" className="w-full">
                      Connexion
                    </Button>
                  </Link>
                  <Link to="/register" className="block">
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600">
                      Commencer gratuitement
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Rocket className="w-4 h-4" />
              <span>La nouvelle façon de constituer des équipes</span>
            </div>

            {/* Main Title */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Pluggez des expertises,
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Créez votre équipe externe
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto">
              Plus de recrutement, plus de CV. Constituez instantanément une équipe d'experts 
              100% autonome pour tous vos projets.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link to="/register">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-6">
                  Créer mon équipe maintenant
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                <a href="#fonctionnement">Voir comment ça marche</a>
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center gap-8 text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>Sans engagement</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>Activation en 48h</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>+500 experts vérifiés</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Concept Section */}
      <section id="concept" className="py-20 px-6 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Fini les contraintes RH traditionnelles
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Ialla révolutionne la constitution d'équipes en connectant instantanément 
              les bonnes expertises pour créer des équipes externes performantes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <div className="text-blue-600">
                      {feature.icon}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section id="usecases" className="py-20 px-6 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Une solution pour chaque besoin
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Que vous ayez besoin de développeurs, comptables, commerciaux ou marketeurs, 
              Ialla assemble l'équipe parfaite.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((useCase, index) => (
              <Card key={index} className="bg-white hover:scale-105 transition-transform cursor-pointer">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white">
                    {useCase.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{useCase.title}</h3>
                  <p className="text-gray-600 text-sm">{useCase.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="fonctionnement" className="py-20 px-6 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Comment ça marche ?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              4 étapes simples pour constituer votre équipe externe
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-gradient-to-r from-blue-200 to-purple-200"></div>
                )}
                
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-3xl font-bold relative z-10">
                    {step.number}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-gray-600 text-sm">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link to="/register">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                Commencer maintenant
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-6 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Ils ont transformé leur façon de travailler
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Découvrez comment des entreprises comme la vôtre utilisent Ialla
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-white">
                <CardContent className="p-8">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-6 italic">"{testimonial.content}"</p>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-blue-600 to-purple-600">
        <div className="container mx-auto max-w-4xl text-center text-white">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Prêt à révolutionner votre façon de travailler ?
          </h2>
          <p className="text-xl mb-10 opacity-95">
            Rejoignez les centaines d'entreprises qui ont déjà adopté Ialla 
            pour constituer leurs équipes externes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-6">
                Créer mon compte gratuitement
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10 text-lg px-8 py-6">
              Planifier une démo
            </Button>
          </div>
          <p className="mt-8 text-sm opacity-75">
            Sans carte bancaire • Activation en 48h • Support dédié
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Ialla</span>
              </div>
              <p className="text-sm">
                La plateforme qui révolutionne la constitution d'équipes externes.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Produit</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Fonctionnalités</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Tarifs</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cas d'usage</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Entreprise</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">À propos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Carrières</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Centre d'aide</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Statut</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2024 Ialla. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};