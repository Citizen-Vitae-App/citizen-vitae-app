import { useState } from 'react';
import { useOrganizationMembers, OrganizationMember } from '@/hooks/useOrganizationMembers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Users, 
  Plus, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Shield, 
  UserCheck,
  Search,
  Crown
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';

const ROLES = [
  { value: 'admin', label: 'Administrateur', icon: Shield, description: 'Accès complet à toutes les fonctionnalités' },
  { value: 'member', label: 'Membre', icon: UserCheck, description: 'Peut voir et participer aux événements' },
];

const getRoleBadge = (role: string) => {
  switch (role) {
    case 'admin':
      return (
        <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
          <Shield className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      );
    case 'member':
    default:
      return (
        <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
          <UserCheck className="h-3 w-3 mr-1" />
          Membre
        </Badge>
      );
  }
};

interface EditMemberDialogProps {
  member: OrganizationMember;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (role: string, customRoleTitle: string | null) => void;
  isLoading: boolean;
}

function EditMemberDialog({ member, open, onOpenChange, onSave, isLoading }: EditMemberDialogProps) {
  const [role, setRole] = useState(member.role);
  const [customRoleTitle, setCustomRoleTitle] = useState(member.custom_role_title || '');

  const handleSave = () => {
    onSave(role, customRoleTitle || null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le membre</DialogTitle>
          <DialogDescription>
            Modifier le rôle de {member.profile?.first_name} {member.profile?.last_name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="role">Rôle</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <div className="flex items-center gap-2">
                      <r.icon className="h-4 w-4" />
                      <span>{r.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {ROLES.find(r => r.value === role)?.description}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customRole">Titre personnalisé (optionnel)</Label>
            <Input
              id="customRole"
              placeholder="Ex: Responsable Marketing"
              value={customRoleTitle}
              onChange={(e) => setCustomRoleTitle(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Affichage personnalisé pour ce membre
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (email: string, role: string, customRoleTitle?: string) => void;
  isLoading: boolean;
}

function AddMemberDialog({ open, onOpenChange, onAdd, isLoading }: AddMemberDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [customRoleTitle, setCustomRoleTitle] = useState('');

  const handleAdd = () => {
    onAdd(email, role, customRoleTitle || undefined);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setEmail('');
      setRole('member');
      setCustomRoleTitle('');
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un membre</DialogTitle>
          <DialogDescription>
            Invitez un utilisateur existant à rejoindre votre organisation
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="exemple@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              L'utilisateur doit déjà avoir un compte sur la plateforme
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Rôle</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <div className="flex items-center gap-2">
                      <r.icon className="h-4 w-4" />
                      <span>{r.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customRoleTitle">Titre personnalisé (optionnel)</Label>
            <Input
              id="customRoleTitle"
              placeholder="Ex: Responsable Marketing"
              value={customRoleTitle}
              onChange={(e) => setCustomRoleTitle(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Annuler
          </Button>
          <Button onClick={handleAdd} disabled={isLoading || !email}>
            {isLoading ? 'Ajout en cours...' : 'Ajouter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MembersTab() {
  const { 
    members, 
    isLoading, 
    isAdmin, 
    updateMemberRole, 
    removeMember, 
    addMember,
    currentUserId 
  } = useOrganizationMembers();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMember, setEditingMember] = useState<OrganizationMember | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteConfirmMember, setDeleteConfirmMember] = useState<OrganizationMember | null>(null);
  const isMobile = useIsMobile();

  const filteredMembers = members?.filter(m => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const fullName = `${m.profile?.first_name || ''} ${m.profile?.last_name || ''}`.toLowerCase();
    const email = (m.profile?.email || '').toLowerCase();
    const customRole = (m.custom_role_title || '').toLowerCase();
    return fullName.includes(query) || email.includes(query) || customRole.includes(query);
  });

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return `${first}${last}`.toUpperCase() || '?';
  };

  const handleEditSave = (role: string, customRoleTitle: string | null) => {
    if (!editingMember) return;
    updateMemberRole.mutate(
      { memberId: editingMember.id, role, customRoleTitle },
      { onSuccess: () => setEditingMember(null) }
    );
  };

  const handleAddMember = (email: string, role: string, customRoleTitle?: string) => {
    addMember.mutate(
      { email, role, customRoleTitle },
      { onSuccess: () => setAddDialogOpen(false) }
    );
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirmMember) return;
    removeMember.mutate(deleteConfirmMember.id, {
      onSuccess: () => setDeleteConfirmMember(null)
    });
  };

  const isCurrentUser = (member: OrganizationMember) => member.user_id === currentUserId;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Membres</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gérez les membres de votre organisation
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted border-0"
            />
          </div>
          {isAdmin && (
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !filteredMembers || filteredMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="max-w-md w-full text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-muted mb-6">
              <Users className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {searchQuery ? 'Aucun résultat' : 'Aucun membre'}
            </h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? 'Aucun membre ne correspond à votre recherche'
                : 'Ajoutez des membres à votre organisation'}
            </p>
          </div>
        </div>
      ) : isMobile ? (
        // Mobile: Card list view
        <div className="space-y-3">
          {filteredMembers.map((member) => (
            <div key={member.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <Avatar className="h-12 w-12 flex-shrink-0">
                <AvatarImage src={member.profile?.avatar_url || undefined} />
                <AvatarFallback>
                  {getInitials(member.profile?.first_name || null, member.profile?.last_name || null)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm truncate">
                        {member.profile?.first_name && member.profile?.last_name
                          ? `${member.profile.first_name} ${member.profile.last_name}`
                          : 'Nom non renseigné'}
                      </h3>
                      {isCurrentUser(member) && (
                        <Badge variant="secondary" className="text-xs">Vous</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {member.profile?.email || 'Email non renseigné'}
                    </p>
                    {member.custom_role_title && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {member.custom_role_title}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getRoleBadge(member.role)}
                    {isAdmin && !isCurrentUser(member) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingMember(member)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => setDeleteConfirmMember(member)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Retirer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>
                    Membre depuis {member.created_at ? format(new Date(member.created_at), 'MMM yyyy', { locale: fr }) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Desktop: Table view
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Membre depuis</TableHead>
                {isAdmin && <TableHead className="w-[50px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {getInitials(member.profile?.first_name || null, member.profile?.last_name || null)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {member.profile?.first_name && member.profile?.last_name
                            ? `${member.profile.first_name} ${member.profile.last_name}`
                            : 'Nom non renseigné'}
                        </span>
                        {isCurrentUser(member) && (
                          <Badge variant="secondary" className="text-xs">Vous</Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.profile?.email || 'Email non renseigné'}
                  </TableCell>
                  <TableCell>
                    {getRoleBadge(member.role)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.custom_role_title || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.created_at 
                      ? format(new Date(member.created_at), 'dd MMM yyyy', { locale: fr })
                      : 'N/A'}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      {!isCurrentUser(member) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingMember(member)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => setDeleteConfirmMember(member)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Retirer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Dialog */}
      {editingMember && (
        <EditMemberDialog
          member={editingMember}
          open={!!editingMember}
          onOpenChange={(open) => !open && setEditingMember(null)}
          onSave={handleEditSave}
          isLoading={updateMemberRole.isPending}
        />
      )}

      {/* Add Dialog */}
      <AddMemberDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={handleAddMember}
        isLoading={addMember.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmMember} onOpenChange={(open) => !open && setDeleteConfirmMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce membre ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmMember?.profile?.first_name} {deleteConfirmMember?.profile?.last_name} sera retiré de l'organisation. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
