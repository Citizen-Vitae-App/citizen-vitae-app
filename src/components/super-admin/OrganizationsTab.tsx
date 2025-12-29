import { useState } from 'react';
import { Plus, Search, MoreHorizontal, Eye, Edit, Trash2, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSuperAdminOrganizations } from '@/hooks/useSuperAdminOrganizations';
import { InviteOrganizationDialog } from './InviteOrganizationDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function OrganizationsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const { organizations, isLoading, deleteOrganization } = useSuperAdminOrganizations();

  const filteredOrgs = organizations?.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getTypeLabel = (type: string | null) => {
    switch (type) {
      case 'company': return 'Entreprise';
      case 'association': return 'Association';
      case 'foundation': return 'Fondation';
      case 'institution': return 'Institution';
      default: return type || 'Non défini';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[hsl(210,40%,98%)]">Organisations</h2>
          <p className="text-[hsl(215,20.2%,65.1%)]">Gérez toutes les organisations de la plateforme</p>
        </div>
        <Button
          onClick={() => setShowInviteDialog(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Inviter une Organisation
        </Button>
      </div>

      <Card className="bg-[hsl(217.2,32.6%,17.5%)] border-[hsl(217.2,32.6%,20%)]">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(215,20.2%,65.1%)]" />
              <Input
                placeholder="Rechercher une organisation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-[hsl(222.2,84%,4.9%)] border-[hsl(217.2,32.6%,25%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20.2%,50%)]"
              />
            </div>
            <Badge variant="secondary" className="bg-[hsl(217.2,32.6%,25%)] text-[hsl(210,40%,98%)]">
              {filteredOrgs.length} organisations
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-[hsl(217.2,32.6%,25%)] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-[hsl(217.2,32.6%,25%)] hover:bg-transparent">
                  <TableHead className="text-[hsl(215,20.2%,65.1%)]">Organisation</TableHead>
                  <TableHead className="text-[hsl(215,20.2%,65.1%)]">Type</TableHead>
                  <TableHead className="text-[hsl(215,20.2%,65.1%)]">Créée le</TableHead>
                  <TableHead className="text-[hsl(215,20.2%,65.1%)]">Membres</TableHead>
                  <TableHead className="text-[hsl(215,20.2%,65.1%)]">Statut</TableHead>
                  <TableHead className="text-[hsl(215,20.2%,65.1%)] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-[hsl(217.2,32.6%,25%)]">
                      <TableCell><Skeleton className="h-10 w-full bg-[hsl(217.2,32.6%,25%)]" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 bg-[hsl(217.2,32.6%,25%)]" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24 bg-[hsl(217.2,32.6%,25%)]" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-12 bg-[hsl(217.2,32.6%,25%)]" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16 bg-[hsl(217.2,32.6%,25%)]" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 bg-[hsl(217.2,32.6%,25%)]" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredOrgs.length === 0 ? (
                  <TableRow className="border-[hsl(217.2,32.6%,25%)]">
                    <TableCell colSpan={6} className="text-center py-8 text-[hsl(215,20.2%,65.1%)]">
                      Aucune organisation trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrgs.map((org) => (
                    <TableRow key={org.id} className="border-[hsl(217.2,32.6%,25%)] hover:bg-[hsl(217.2,32.6%,20%)]">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={org.logo_url || ''} />
                            <AvatarFallback className="bg-[hsl(217.2,32.6%,30%)] text-[hsl(210,40%,98%)]">
                              {org.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-[hsl(210,40%,98%)]">{org.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[hsl(215,20.2%,65.1%)]">
                        {getTypeLabel(org.type)}
                      </TableCell>
                      <TableCell className="text-[hsl(215,20.2%,65.1%)]">
                        {org.created_at ? format(new Date(org.created_at), 'dd MMM yyyy', { locale: fr }) : '-'}
                      </TableCell>
                      <TableCell className="text-[hsl(210,40%,98%)]">
                        {org.member_count}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={org.is_verified ? 'default' : 'secondary'}
                          className={org.is_verified 
                            ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30' 
                            : 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30'}
                        >
                          {org.is_verified ? 'Active' : 'En attente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-[hsl(215,20.2%,65.1%)] hover:text-[hsl(210,40%,98%)] hover:bg-[hsl(217.2,32.6%,25%)]">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[hsl(217.2,32.6%,17.5%)] border-[hsl(217.2,32.6%,25%)]">
                            <DropdownMenuItem className="text-[hsl(210,40%,98%)] focus:bg-[hsl(217.2,32.6%,25%)] focus:text-[hsl(210,40%,98%)]">
                              <Eye className="w-4 h-4 mr-2" />
                              Voir détails
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-[hsl(210,40%,98%)] focus:bg-[hsl(217.2,32.6%,25%)] focus:text-[hsl(210,40%,98%)]">
                              <Edit className="w-4 h-4 mr-2" />
                              Éditer
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-amber-400 focus:bg-[hsl(217.2,32.6%,25%)] focus:text-amber-400">
                              <Ban className="w-4 h-4 mr-2" />
                              Suspendre
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-400 focus:bg-[hsl(217.2,32.6%,25%)] focus:text-red-400"
                              onClick={() => deleteOrganization(org.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <InviteOrganizationDialog open={showInviteDialog} onOpenChange={setShowInviteDialog} />
    </div>
  );
}
