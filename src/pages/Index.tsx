import { Search, Calendar, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EventCard from "@/components/EventCard";

const Index = () => {
  const events = [
    {
      id: 1,
      title: "Nettoyage de la plage des Dunes",
      shortTitle: "Nettoyage Plage",
      organization: "EcoAction France",
      date: "15 janvier 2025, 9h00",
      location: "Paris 3e",
      image: "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=800&auto=format&fit=crop",
      isNew: true,
    },
    {
      id: 2,
      title: "Distribution alimentaire solidaire",
      shortTitle: "Distribution Alimentaire",
      organization: "Restos du Cœur",
      date: "18 janvier 2025, 14h00",
      location: "Lyon 3e",
      image: "https://images.unsplash.com/photo-1593113646773-028c64a8f1b8?w=800&auto=format&fit=crop",
    },
    {
      id: 3,
      title: "Atelier permaculture urbaine",
      shortTitle: "Atelier Permaculture",
      organization: "Jardins Partagés",
      date: "20 janvier 2025, 10h00",
      location: "Bordeaux",
      image: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&auto=format&fit=crop",
    },
    {
      id: 4,
      title: "Maraude solidaire nocturne",
      shortTitle: "Maraude Solidaire",
      organization: "Samu Social",
      date: "22 janvier 2025, 20h00",
      location: "Paris 10e",
      image: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&auto=format&fit=crop",
      isNew: true,
    },
    {
      id: 5,
      title: "Plantation d'arbres en forêt",
      shortTitle: "Plantation Arbres",
      organization: "Reforestation Nationale",
      date: "25 janvier 2025, 8h00",
      location: "Fontainebleau",
      image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop",
    },
    {
      id: 6,
      title: "Collecte de sang - Don du cœur",
      shortTitle: "Don Sang",
      organization: "Croix-Rouge Française",
      date: "28 janvier 2025, 9h00",
      location: "Toulouse",
      image: "https://images.unsplash.com/photo-1615461066159-fea0960485d5?w=800&auto=format&fit=crop",
    },
    {
      id: 7,
      title: "Collecte de vêtements chauds",
      shortTitle: "Collecte Vêtements",
      organization: "Emmaüs Solidarité",
      date: "1 février 2025, 10h00",
      location: "Marseille",
      image: "https://images.unsplash.com/photo-1445510861639-5651173bc5d5?w=800&auto=format&fit=crop",
    },
    {
      id: 8,
      title: "Atelier cuisine pour seniors isolés",
      shortTitle: "Atelier Cuisine",
      organization: "Les Petits Frères des Pauvres",
      date: "5 février 2025, 15h00",
      location: "Lille",
      image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&auto=format&fit=crop",
    },
    {
      id: 9,
      title: "Ramassage des déchets en forêt",
      shortTitle: "Ramassage Déchets",
      organization: "Green Team",
      date: "8 février 2025, 9h30",
      location: "Paris 12e",
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
            <div className="flex-1 max-w-xl mx-8 flex items-center gap-4">
              {/* Search + Date Combined */}
              <div className="flex-1 border border-border rounded-md px-6 py-2 flex items-center gap-4 shadow-sm bg-background/50 backdrop-blur-sm">
                <div className="flex items-center gap-3 flex-1">
                  <Search className="w-5 h-5 text-foreground flex-shrink-0" />
                  <Input
                    type="search"
                    placeholder="Autour de Paris"
                    className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-foreground font-medium"
                  />
                </div>
                
                {/* Vertical Separator */}
                <div className="h-8 w-px bg-border"></div>
                
                <button className="flex items-center gap-3 whitespace-nowrap hover:opacity-70 transition-opacity">
                  <Calendar className="w-5 h-5 text-foreground" />
                  <span className="text-foreground text-sm">Quand ?</span>
                </button>
              </div>

              {/* Filters Button */}
              <button className="border border-border rounded-md px-6 py-2 flex items-center gap-3 shadow-sm whitespace-nowrap bg-background/50 backdrop-blur-sm hover:bg-background/70">
                <SlidersHorizontal className="w-5 h-5 text-foreground" />
                <span className="text-foreground font-medium">Filtres</span>
              </button>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
          {events.map((event) => (
            <EventCard key={event.id} {...event} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default Index;
