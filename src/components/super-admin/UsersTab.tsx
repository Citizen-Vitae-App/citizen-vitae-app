import { useState } from 'react';
import { Search, MoreHorizontal, Eye, Award, Building2, ClipboardList, Trash2, Ban, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { useSuperAdminUsers, type User } from '@/hooks/useSuperAdminUsers';
import { UserDetailsDialog } from './UserDetailsDialog';
import { DeleteUserDialog } from './DeleteUserDialog';
import { SuspendUserDialog } from './SuspendUserDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function UsersTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogMode, setDialogMode] = useState<'registrations' | 'certifications'>('registrations');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [userToManage, setUserToManage] = useState<User | null>(null);
  const { users, isLoading } = useSuperAdminUsers();

  const filteredUsers = users?.filter(user =>
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const openDetails = (user: User, mode: 'registrations' | 'certifications') => {
    setSelectedUser(user);
    setDialogMode(mode);
    setDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setUserToManage(user);
    setDeleteDialogOpen(true);
  };

  const openSuspendDialog = (user: User) => {
    setUserToManage(user);
    setSuspendDialogOpen(true);
  };

  const getRoleBadges = (user: User) => {
    const badges = [];
    
    if (user.is_suspended) {
      badges.push(
        <Badge key="suspended" className="bg-red-600/20 text-red-400 hover:bg-red-600/30">
          Suspendu
        </Badge>
      );
    }
    
    if (user.is_super_admin) {
      badges.push(
        <Badge key="super" className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30">
          Super Admin
        </Badge>
      );
    }
    
    if (user.is_org_admin) {
      badges.push(
        <Badge key="admin" className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30">
          Admin Orga
        </Badge>
      );
    }
    
    if (user.is_org_owner) {
      badges.push(
        <Badge key="owner" className="bg-purple-600/20 text-purple-400 hover:bg-purple-600/30">
          Owner
        </Badge>
      );
    }
    
    if (user.is_team_leader) {
      badges.push(
        <Badge key="leader" className="bg-amber-600/20 text-amber-400 hover:bg-amber-600/30">
          Leader
        </Badge>
      );
    }
    
    if (badges.length === 0 || (badges.length === 1 && user.is_suspended)) {
      badges.push(
        <Badge key="user" className="bg-[hsl(217.2,32.6%,25%)] text-[hsl(215,20.2%,65.1%)]">
          Citoyen
        </Badge>
      );
    }
    
    return badges;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[hsl(210,40%,98%)]">Utilisateurs</h2>
        <p className="text-[hsl(215,20.2%,65.1%)]">Gestion de tous les citoyens de la plateforme</p>
      </div>

      <Card className="bg-[hsl(217.2,32.6%,17.5%)] border-[hsl(217.2,32.6%,20%)]">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(215,20.2%,65.1%)]" />
              <Input
                placeholder="Rechercher un utilisateur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-[hsl(222.2,84%,4.9%)] border-[hsl(217.2,32.6%,25%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20.2%,50%)]"
              />
            </div>
            <Badge variant="secondary" className="bg-[hsl(217.2,32.6%,25%)] text-[hsl(210,40%,98%)]">
              {filteredUsers.length} utilisateurs
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-[hsl(217.2,32.6%,25%)] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-[hsl(217.2,32.6%,25%)] hover:bg-transparent">
                  <TableHead className="text-[hsl(215,20.2%,65.1%)]">Utilisateur</TableHead>
                  <TableHead className="text-[hsl(215,20.2%,65.1%)]">Rôles</TableHead>
                  <TableHead className="text-[hsl(215,20.2%,65.1%)]">Organisation(s)</TableHead>
                  <TableHead className="text-[hsl(215,20.2%,65.1%)]">Inscriptions</TableHead>
                  <TableHead className="text-[hsl(215,20.2%,65.1%)]">Certifications</TableHead>
                  <TableHead className="text-[hsl(215,20.2%,65.1%)]">Inscrit le</TableHead>
                  <TableHead className="text-[hsl(215,20.2%,65.1%)] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-[hsl(217.2,32.6%,25%)]">
                      <TableCell><Skeleton className="h-10 w-full bg-[hsl(217.2,32.6%,25%)]" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24 bg-[hsl(217.2,32.6%,25%)]" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24 bg-[hsl(217.2,32.6%,25%)]" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-12 bg-[hsl(217.2,32.6%,25%)]" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-12 bg-[hsl(217.2,32.6%,25%)]" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24 bg-[hsl(217.2,32.6%,25%)]" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 bg-[hsl(217.2,32.6%,25%)]" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <TableRow className="border-[hsl(217.2,32.6%,25%)]">
                    <TableCell colSpan={7} className="text-center py-8 text-[hsl(215,20.2%,65.1%)]">
                      Aucun utilisateur trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className={`border-[hsl(217.2,32.6%,25%)] hover:bg-[hsl(217.2,32.6%,20%)] ${user.is_suspended ? 'opacity-60' : ''}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={user.avatar_url || ''} />
                            <AvatarFallback className="bg-[hsl(217.2,32.6%,30%)] text-[hsl(210,40%,98%)]">
                              {user.full_name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium text-[hsl(210,40%,98%)]">{user.full_name}</span>
                            <p className="text-xs text-[hsl(215,20.2%,65.1%)]">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {getRoleBadges(user)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.organizations.length === 0 ? (
                          <span className="text-[hsl(215,20.2%,65.1%)]">-</span>
                        ) : (
                          <div className="space-y-1">
                            {user.organizations.slice(0, 2).map((org) => (
                              <div key={org.id} className="flex items-center gap-1 text-xs">
                                <Building2 className="w-3 h-3 text-[hsl(215,20.2%,65.1%)]" />
                                <span className="text-[hsl(210,40%,98%)] truncate max-w-[120px]">{org.name}</span>
                              </div>
                            ))}
                            {user.organizations.length > 2 && (
                              <span className="text-xs text-[hsl(215,20.2%,65.1%)]">
                                +{user.organizations.length - 2} autre(s)
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => openDetails(user, 'registrations')}
                          className="flex items-center gap-1 text-[hsl(210,40%,98%)] hover:text-blue-400 transition-colors"
                          disabled={user.registration_count === 0}
                        >
                          <ClipboardList className="w-3 h-3 text-blue-400" />
                          <span className={user.registration_count > 0 ? 'underline underline-offset-2' : ''}>
                            {user.registration_count}
                          </span>
                        </button>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => openDetails(user, 'certifications')}
                          className="flex items-center gap-1 text-[hsl(210,40%,98%)] hover:text-amber-400 transition-colors"
                          disabled={user.certification_count === 0}
                        >
                          <Award className="w-3 h-3 text-amber-400" />
                          <span className={user.certification_count > 0 ? 'underline underline-offset-2' : ''}>
                            {user.certification_count}
                          </span>
                        </button>
                      </TableCell>
                      <TableCell className="text-[hsl(215,20.2%,65.1%)]">
                        {user.created_at ? format(new Date(user.created_at), 'dd MMM yyyy', { locale: fr }) : '-'}
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
                              Voir profil
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-[hsl(217.2,32.6%,25%)]" />
                            <DropdownMenuItem 
                              onClick={() => openSuspendDialog(user)}
                              className={`focus:bg-[hsl(217.2,32.6%,25%)] ${user.is_suspended ? 'text-green-400 focus:text-green-400' : 'text-amber-400 focus:text-amber-400'}`}
                            >
                              {user.is_suspended ? (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Réactiver
                                </>
                              ) : (
                                <>
                                  <Ban className="w-4 h-4 mr-2" />
                                  Suspendre
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(user)}
                              className="text-red-400 focus:bg-[hsl(217.2,32.6%,25%)] focus:text-red-400"
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

      <UserDetailsDialog
        user={selectedUser}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
      />

      <DeleteUserDialog
        user={userToManage}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />

      <SuspendUserDialog
        user={userToManage}
        open={suspendDialogOpen}
        onOpenChange={setSuspendDialogOpen}
      />
    </div>
  );
}
