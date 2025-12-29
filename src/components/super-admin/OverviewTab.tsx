import { Building2, Users, Calendar, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSuperAdminStats } from '@/hooks/useSuperAdminStats';
import { Skeleton } from '@/components/ui/skeleton';

export function OverviewTab() {
  const { stats, isLoading } = useSuperAdminStats();

  const statCards = [
    {
      title: 'Organisations',
      value: stats?.totalOrganizations || 0,
      subtitle: `${stats?.activeOrganizations || 0} actives`,
      icon: Building2,
      color: 'from-blue-500 to-blue-700',
    },
    {
      title: 'Utilisateurs',
      value: stats?.totalUsers || 0,
      subtitle: 'Citoyens inscrits',
      icon: Users,
      color: 'from-emerald-500 to-emerald-700',
    },
    {
      title: 'Événements',
      value: stats?.totalEvents || 0,
      subtitle: `${stats?.publicEvents || 0} publics`,
      icon: Calendar,
      color: 'from-purple-500 to-purple-700',
    },
    {
      title: 'Certifications',
      value: stats?.totalCertifications || 0,
      subtitle: 'Missions certifiées',
      icon: Award,
      color: 'from-amber-500 to-amber-700',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[hsl(210,40%,98%)]">Vue d'ensemble</h2>
        <p className="text-[hsl(215,20.2%,65.1%)]">Statistiques globales de la plateforme Citizen Vitae</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="bg-[hsl(217.2,32.6%,17.5%)] border-[hsl(217.2,32.6%,20%)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[hsl(215,20.2%,65.1%)]">
                {stat.title}
              </CardTitle>
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20 bg-[hsl(217.2,32.6%,25%)]" />
              ) : (
                <>
                  <p className="text-3xl font-bold text-[hsl(210,40%,98%)]">{stat.value}</p>
                  <p className="text-xs text-[hsl(215,20.2%,65.1%)] mt-1">{stat.subtitle}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[hsl(217.2,32.6%,17.5%)] border-[hsl(217.2,32.6%,20%)]">
          <CardHeader>
            <CardTitle className="text-[hsl(210,40%,98%)]">Activité récente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[hsl(215,20.2%,65.1%)] text-sm">
              Les graphiques d'activité seront disponibles prochainement.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[hsl(217.2,32.6%,17.5%)] border-[hsl(217.2,32.6%,20%)]">
          <CardHeader>
            <CardTitle className="text-[hsl(210,40%,98%)]">Dernières organisations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[hsl(215,20.2%,65.1%)] text-sm">
              La liste des dernières organisations créées sera affichée ici.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
