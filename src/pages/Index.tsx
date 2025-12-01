import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EventCard from "@/components/EventCard";

const Index = () => {
  const events = [
    {
      id: 1,
      title: "Nettoyage de la plage des Dunes",
      organization: "EcoAction France",
      date: "15 janvier 2025, 9h00",
      location: "Plage des Dunes, Dunkerque",
      category: "Environnement",
      categoryColor: "bg-green-600 text-white",
      image: "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=800&auto=format&fit=crop",
    },
    {
      id: 2,
      title: "Distribution alimentaire solidaire",
      organization: "Restos du Cœur",
      date: "18 janvier 2025, 14h00",
      location: "Centre communal, Lyon 3e",
      category: "Social",
      categoryColor: "bg-accent text-accent-foreground",
      image: "https://images.unsplash.com/photo-1593113646773-028c64a8f1b8?w=800&auto=format&fit=crop",
    },
    {
      id: 3,
      title: "Atelier permaculture urbaine",
      organization: "Jardins Partagés",
      date: "20 janvier 2025, 10h00",
      location: "Jardin Collective, Bordeaux",
      category: "Éducation",
      categoryColor: "bg-blue-600 text-white",
      image: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&auto=format&fit=crop",
    },
    {
      id: 4,
      title: "Maraude solidaire nocturne",
      organization: "Samu Social",
      date: "22 janvier 2025, 20h00",
      location: "Gare du Nord, Paris",
      category: "Social",
      categoryColor: "bg-accent text-accent-foreground",
      image: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&auto=format&fit=crop",
    },
    {
      id: 5,
      title: "Plantation d'arbres en forêt",
      organization: "Reforestation Nationale",
      date: "25 janvier 2025, 8h00",
      location: "Forêt de Fontainebleau",
      category: "Environnement",
      categoryColor: "bg-green-600 text-white",
      image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop",
    },
    {
      id: 6,
      title: "Collecte de sang - Don du cœur",
      organization: "Croix-Rouge Française",
      date: "28 janvier 2025, 9h00",
      location: "Hôtel de Ville, Toulouse",
      category: "Santé",
      categoryColor: "bg-red-600 text-white",
      image: "https://images.unsplash.com/photo-1615461066159-fea0960485d5?w=800&auto=format&fit=crop",
    },
    {
      id: 7,
      title: "Collecte de vêtements chauds",
      organization: "Emmaüs Solidarité",
      date: "1 février 2025, 10h00",
      location: "Centre Emmaüs, Marseille",
      category: "Solidarité",
      categoryColor: "bg-orange-600 text-white",
      image: "https://images.unsplash.com/photo-1445510861639-5651173bc5d5?w=800&auto=format&fit=crop",
    },
    {
      id: 8,
      title: "Atelier cuisine pour seniors isolés",
      organization: "Les Petits Frères des Pauvres",
      date: "5 février 2025, 15h00",
      location: "Maison de retraite, Lille",
      category: "Social",
      categoryColor: "bg-accent text-accent-foreground",
      image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&auto=format&fit=crop",
    },
    {
      id: 9,
      title: "Ramassage des déchets en forêt",
      organization: "Green Team",
      date: "8 février 2025, 9h30",
      location: "Bois de Vincennes, Paris",
      category: "Environnement",
      categoryColor: "bg-green-600 text-white",
      image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-foreground">CitizenVitae</h1>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Rechercher un événement..."
                  className="pl-10 bg-background border-border"
                />
              </div>
            </div>

            {/* Login Button */}
            <div className="flex-shrink-0">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Connexion
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard key={event.id} {...event} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default Index;
