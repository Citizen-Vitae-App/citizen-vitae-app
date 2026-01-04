import { useState } from 'react';
import { useOrganizationMembers, OrganizationMember } from '@/hooks/useOrganizationMembers';
import { usePendingInvitations } from '@/hooks/usePendingInvitations';
import { useTeams } from '@/hooks/useTeams';
import { useOrganizationSupervisors } from '@/hooks/useEventSupervisors';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
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
  Crown,
  Eye,
  Users2,
  Clock,
  Mail,
  X,
  RefreshCw,
  Lock
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

const ROLES = [
  { value: 'admin', label: 'Administrateur', icon: Shield, description: 'Accès complet à toutes les fonctionnalités' },
  { value: 'member', label: 'Membre', icon: UserCheck, description: 'Peut voir et participer aux événements' },
];

interface RoleBadgesProps {
  member: OrganizationMember;
  supervisorUserIds?: string[];
}

function RoleBadges({ member, supervisorUserIds = [] }: RoleBadgesProps) {
  const isSupervisor = supervisorUserIds.includes(member.user_id);
  
  return (
    <div className="flex flex-wrap gap-1">
      {/* Owner badge */}
      {member.is_owner && (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-400">
          <Crown className="h-3 w-3 mr-1" />
          Owner
        </Badge>
      )}
      
      {/* Admin badge */}
      {member.role === 'admin' && !member.is_owner && (
        <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
          <Shield className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      )}
      
      {/* Leader badge */}
      {member.isLeader && (
        <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-400">
          <Users2 className="h-3 w-3 mr-1" />
          Leader
        </Badge>
      )}
      
      {/* Supervisor badge */}
      {isSupervisor && (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-400">
          <Eye className="h-3 w-3 mr-1" />
          Superviseur
        </Badge>
      )}
      
      {/* Member badge (only if no other significant role) */}
      {member.role === 'member' && !member.is_owner && !member.isLeader && !isSupervisor && (
        <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">
          <UserCheck className="h-3 w-3 mr-1" />
          Membre
        </Badge>
      )}
    </div>
  );
}

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
  onAdd: (email: string, role: string, customRoleTitle?: string, teamId?: string) => void;
  isLoading: boolean;
  organizationId?: string;
  userTeamId?: string;
  isLeader?: boolean;
}

function AddMemberDialog({ open, onOpenChange, onAdd, isLoading, organizationId, userTeamId, isLeader = false }: AddMemberDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [customRoleTitle, setCustomRoleTitle] = useState('');
  const [teamId, setTeamId] = useState<string>('none');
  const { teams } = useTeams(organizationId || '');

  // For leaders, auto-select and lock their team
  const isTeamLocked = isLeader && !!userTeamId;
  const effectiveTeamId = isTeamLocked ? userTeamId : teamId;
  const userTeam = teams?.find(t => t.id === userTeamId);

  const handleAdd = () => {
    const finalTeamId = isTeamLocked ? userTeamId : (teamId !== 'none' ? teamId : undefined);
    onAdd(email, role, customRoleTitle || undefined, finalTeamId);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setEmail('');
      setRole('member');
      setCustomRoleTitle('');
      setTeamId('none');
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un collaborateur</DialogTitle>
          <DialogDescription>
            Invitez un nouveau collaborateur à rejoindre votre organisation. S'il n'a pas encore de compte, il recevra un email d'invitation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="collaborateur@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Rôle</Label>
            <Select value={role} onValueChange={setRole} disabled={isLeader}>
              <SelectTrigger className={isLeader ? 'opacity-70 cursor-not-allowed' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(isLeader ? ROLES.filter(r => r.value === 'member') : ROLES).map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <div className="flex items-center gap-2">
                      <r.icon className="h-4 w-4" />
                      <span>{r.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isLeader && (
              <p className="text-sm text-muted-foreground">
                En tant que Team Leader, vous ne pouvez ajouter que des membres
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="team" className="flex items-center gap-2">
              Équipe
              {isTeamLocked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
            </Label>
            <Select 
              value={effectiveTeamId || 'none'} 
              onValueChange={setTeamId}
              disabled={isTeamLocked}
            >
              <SelectTrigger className={isTeamLocked ? 'opacity-70 cursor-not-allowed' : ''}>
                <SelectValue placeholder="Sélectionner une équipe" />
              </SelectTrigger>
              <SelectContent>
                {!isTeamLocked && <SelectItem value="none">Aucune équipe</SelectItem>}
                {isTeamLocked && userTeam ? (
                  <SelectItem value={userTeam.id}>{userTeam.name}</SelectItem>
                ) : (
                  teams?.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {isTeamLocked 
                ? 'En tant que Team Leader, vous ne pouvez ajouter des membres qu\'à votre équipe'
                : 'L\'équipe dans laquelle le collaborateur sera ajouté'
              }
            </p>
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
            {isLoading ? 'Envoi en cours...' : 'Inviter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AssignTeamDialogProps {
  member: OrganizationMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

function AssignTeamDialog({ member, open, onOpenChange, organizationId }: AssignTeamDialogProps) {
  const { teams } = useTeams(organizationId);
  const { addTeamMember, removeTeamMember } = useTeams(organizationId);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('none');
  const [isLoading, setIsLoading] = useState(false);

  const handleAssign = async () => {
    if (!member) return;
    setIsLoading(true);
    
    try {
      // Remove from current team if exists
      if (member.team) {
        await removeTeamMember.mutateAsync({ teamId: member.team.id, userId: member.user_id });
      }
      
      // Add to new team if selected
      if (selectedTeamId !== 'none') {
        await addTeamMember.mutateAsync({ teamId: selectedTeamId, userId: member.user_id });
      }
      
      toast.success('Équipe mise à jour');
      onOpenChange(false);
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assigner à une équipe</DialogTitle>
          <DialogDescription>
            Choisissez l'équipe pour {member?.profile?.first_name} {member?.profile?.last_name}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une équipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucune équipe</SelectItem>
              {teams?.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleAssign} disabled={isLoading}>
            {isLoading ? 'Mise à jour...' : 'Confirmer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface MembersTabProps {
  userTeamId?: string;
  canManageMembers?: boolean;
  isLeader?: boolean;
}

export function MembersTab({ userTeamId, canManageMembers = true, isLeader = false }: MembersTabProps) {
  const { 
    members, 
    isLoading, 
    isAdmin, 
    organizationId,
    updateMemberRole, 
    removeMember, 
    addMember,
    currentUserId 
  } = useOrganizationMembers();
  
  // Get organization info for invitation emails
  const { organization } = useOrganizationSettings();
  
  // Get pending invitations
  const { invitations, cancelInvitation, resendInvitation, updateInvitationTeam } = usePendingInvitations(organizationId);
  const { teams } = useTeams(organizationId || '');
  
  // Get all supervisor user IDs for this organization
  const { supervisorUserIds } = useOrganizationSupervisors(organizationId);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMember, setEditingMember] = useState<OrganizationMember | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteConfirmMember, setDeleteConfirmMember] = useState<OrganizationMember | null>(null);
  const [assignTeamMember, setAssignTeamMember] = useState<OrganizationMember | null>(null);
  const [assignTeamInvitation, setAssignTeamInvitation] = useState<typeof invitations[0] | null>(null);
  const [cancelInvitationId, setCancelInvitationId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Filter members by team for Leaders
  const filteredMembers = members?.filter(m => {
    // First filter by team if user is a Leader
    if (userTeamId && !canManageMembers) {
      // Leaders only see members in their team
      if (m.team?.id !== userTeamId) return false;
    }
    
    // Then apply search filter
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const fullName = `${m.profile?.first_name || ''} ${m.profile?.last_name || ''}`.toLowerCase();
    const email = (m.profile?.email || '').toLowerCase();
    const customRole = (m.custom_role_title || '').toLowerCase();
    const teamName = (m.team?.name || '').toLowerCase();
    return fullName.includes(query) || email.includes(query) || customRole.includes(query) || teamName.includes(query);
  });

  
  // Filter invitations: Leaders only see their team's invitations
  const filteredInvitations = invitations.filter(inv => {
    // Leaders only see invitations for their team
    if (isLeader && !isAdmin && userTeamId) {
      if (inv.team_id !== userTeamId) return false;
    }
    
    // Then apply search filter
    if (!searchQuery) return true;
    return inv.email.toLowerCase().includes(searchQuery.toLowerCase());
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

  const handleAddMember = (email: string, role: string, customRoleTitle?: string, teamId?: string) => {
    addMember.mutate(
      { 
        email, 
        role, 
        customRoleTitle,
        teamId,
        organizationName: organization?.name,
        organizationLogoUrl: organization?.logo_url || undefined,
      },
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
          <h2 className="text-2xl md:text-3xl font-bold">
            {isLeader && userTeamId ? 'Membres de mon équipe' : 'Membres'}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {isLeader && userTeamId 
              ? 'Gérez les membres de votre équipe'
              : 'Gérez les membres de votre organisation'
            }
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
          {(canManageMembers || isLeader) && (
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
                    {member.team && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Équipe: {member.team.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <RoleBadges member={member} supervisorUserIds={supervisorUserIds} />
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
                          <DropdownMenuItem onClick={() => setAssignTeamMember(member)}>
                            <Users2 className="h-4 w-4 mr-2" />
                            Assigner à une équipe
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
                <TableHead>Rôles</TableHead>
                <TableHead>Équipe</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Membre depuis</TableHead>
                {(isAdmin || isLeader) && <TableHead className="w-[50px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Pending invitations */}
              {filteredInvitations.map((invitation) => (
                <TableRow key={`inv-${invitation.id}`} className="bg-amber-50/50 dark:bg-amber-900/10">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-amber-100 text-amber-700">
                          <Mail className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{invitation.email}</span>
                        <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {invitation.role === 'admin' ? (
                      <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                        <Shield className="h-3 w-3 mr-1" />
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">
                        <UserCheck className="h-3 w-3 mr-1" />
                        Membre
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {invitation.team ? (
                      <span className="text-muted-foreground">{invitation.team.name}</span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setAssignTeamInvitation(invitation)}
                      >
                        <Users2 className="h-3 w-3 mr-1" />
                        Assigner
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {invitation.custom_role_title || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(invitation.created_at), 'dd MMM yyyy', { locale: fr })}
                  </TableCell>
                  {(isAdmin || (isLeader && invitation.team_id === userTeamId)) && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {/* Only admins can reassign teams */}
                          {isAdmin && (
                            <DropdownMenuItem onClick={() => setAssignTeamInvitation(invitation)}>
                              <Users2 className="h-4 w-4 mr-2" />
                              Assigner à une équipe
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => resendInvitation.mutate({
                              invitationId: invitation.id,
                              email: invitation.email,
                              organizationName: organization?.name,
                              organizationLogoUrl: organization?.logo_url || undefined,
                            })}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Renvoyer l'invitation
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => setCancelInvitationId(invitation.id)}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Annuler l'invitation
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              
              {/* Active members */}
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
                      <div>
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
                        <span className="text-sm text-muted-foreground">
                          {member.profile?.email || 'Email non renseigné'}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <RoleBadges member={member} supervisorUserIds={supervisorUserIds} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.team ? (
                      <div className="flex items-center gap-2">
                        <span>{member.team.name}</span>
                        {member.isLeader && (
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-400 text-xs">
                            <Crown className="h-2.5 w-2.5 mr-0.5" />
                            Leader
                          </Badge>
                        )}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.custom_role_title || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.created_at 
                      ? format(new Date(member.created_at), 'dd MMM yyyy', { locale: fr })
                      : 'N/A'}
                  </TableCell>
                  {(isAdmin || isLeader) && (
                    <TableCell>
                      {!isCurrentUser(member) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {/* Only admins can edit roles and assign teams */}
                            {isAdmin && (
                              <>
                                <DropdownMenuItem onClick={() => setEditingMember(member)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setAssignTeamMember(member)}>
                                  <Users2 className="h-4 w-4 mr-2" />
                                  Assigner à une équipe
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
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
        organizationId={organizationId}
        userTeamId={userTeamId}
        isLeader={isLeader}
      />

      {/* Assign Team Dialog for Members */}
      {organizationId && (
        <AssignTeamDialog
          member={assignTeamMember}
          open={!!assignTeamMember}
          onOpenChange={(open) => !open && setAssignTeamMember(null)}
          organizationId={organizationId}
        />
      )}

      {/* Assign Team Dialog for Pending Invitations */}
      {organizationId && assignTeamInvitation && (
        <Dialog open={!!assignTeamInvitation} onOpenChange={(open) => !open && setAssignTeamInvitation(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assigner à une équipe</DialogTitle>
              <DialogDescription>
                Choisissez l'équipe pour {assignTeamInvitation.email}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Select
                defaultValue={assignTeamInvitation.team_id || 'none'}
                onValueChange={(value) => {
                  updateInvitationTeam.mutate({
                    invitationId: assignTeamInvitation.id,
                    teamId: value === 'none' ? null : value,
                  });
                  setAssignTeamInvitation(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une équipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune équipe</SelectItem>
                  {teams?.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </DialogContent>
        </Dialog>
      )}

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

      {/* Cancel Invitation Confirmation */}
      <AlertDialog open={!!cancelInvitationId} onOpenChange={(open) => !open && setCancelInvitationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cette invitation ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'invitation sera annulée et le destinataire ne pourra plus rejoindre l'organisation avec ce lien.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (cancelInvitationId) {
                  cancelInvitation.mutate(cancelInvitationId);
                  setCancelInvitationId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Annuler l'invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
