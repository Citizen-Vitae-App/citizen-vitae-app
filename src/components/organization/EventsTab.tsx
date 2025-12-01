import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, ChevronRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Données temporaires pour l'affichage
const mockEvents = [
  {
    id: '1',
    name: 'Nettoyage des plages',
    date: '15 Mars 2024',
    status: 'Actif',
    invitations: 45,
    participants: 32,
    certificates: 28,
    image: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=100&h=100&fit=crop'
  },
  {
    id: '2',
    name: 'Distribution de repas',
    date: '22 Mars 2024',
    status: 'Planifié',
    invitations: 30,
    participants: 0,
    certificates: 0,
    image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=100&h=100&fit=crop'
  },
  {
    id: '3',
    name: 'Plantation d\'arbres',
    date: '8 Avril 2024',
    status: 'Actif',
    invitations: 60,
    participants: 48,
    certificates: 42,
    image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=100&h=100&fit=crop'
  }
];

export function EventsTab() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6">
      {/* Header avec titre et bouton */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">My Events</h2>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Créer
        </Button>
      </div>

      {/* Barre de recherche */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un événement..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table des événements */}
      <div className="border-t border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border">
              <TableHead className="font-semibold">Nom</TableHead>
              <TableHead className="font-semibold">Statut</TableHead>
              <TableHead className="font-semibold">Invitations</TableHead>
              <TableHead className="font-semibold">Participants</TableHead>
              <TableHead className="font-semibold">Certificats</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockEvents.map((event) => (
              <TableRow 
                key={event.id}
                className="cursor-pointer hover:bg-muted/50 border-0"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <img 
                      src={event.image} 
                      alt={event.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{event.name}</span>
                      <span className="text-sm text-muted-foreground">{event.date}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{event.status}</TableCell>
                <TableCell>{event.invitations}</TableCell>
                <TableCell>{event.participants}</TableCell>
                <TableCell>{event.certificates}</TableCell>
                <TableCell>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
