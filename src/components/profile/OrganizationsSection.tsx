import { Building2, Users, Heart } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { UserOrganization } from '@/hooks/useUserProfile';

interface OrganizationsSectionProps {
  organizations: UserOrganization[];
}

export function OrganizationsSection({ organizations }: OrganizationsSectionProps) {
  const companies = organizations.filter((org) => org.type === 'company');
  const associations = organizations.filter(
    (org) => org.type === 'association' || org.type === 'foundation'
  );

  // Don't render anything if user has no organizations
  if (organizations.length === 0) {
    return null;
  }

  return (
    <section className="mb-6">
      {/* Companies */}
      {companies.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            {companies.length > 1 ? 'Mes entreprises' : 'Mon entreprise'}
          </h2>
          <div className="grid gap-3">
            {companies.map((org) => (
              <OrganizationCard key={org.id} organization={org} />
            ))}
          </div>
        </div>
      )}

      {/* Associations / Foundations */}
      {associations.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Heart className="h-5 w-5 text-muted-foreground" />
            {associations.length > 1 ? 'Mes associations' : 'Mon association'}
          </h2>
          <div className="grid gap-3">
            {associations.map((org) => (
              <OrganizationCard key={org.id} organization={org} variant="association" />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

interface OrganizationCardProps {
  organization: UserOrganization;
  variant?: 'company' | 'association';
}

function OrganizationCard({ organization, variant = 'company' }: OrganizationCardProps) {
  const getInitials = () => {
    return organization.name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const roleLabel = organization.role === 'admin' ? 'Administrateur' : 'Membre';

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={organization.logo_url || undefined} alt={organization.name} />
            <AvatarFallback
              className={
                variant === 'association'
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-blue-100 text-blue-700'
              }
            >
              {getInitials()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{organization.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {roleLabel}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                {organization.member_count} membre{organization.member_count > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
