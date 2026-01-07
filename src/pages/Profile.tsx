import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { OrganizationsSection } from '@/components/profile/OrganizationsSection';
import { FavoriteCausesSection } from '@/components/profile/FavoriteCausesSection';
import { CitizenImpactSection } from '@/components/profile/CitizenImpactSection';
import { CitizenExperiencesSection } from '@/components/profile/CitizenExperiencesSection';
import { UpcomingEventsSection } from '@/components/profile/UpcomingEventsSection';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Helmet } from 'react-helmet-async';
import { Settings } from 'lucide-react';

export default function Profile() {
  const {
    organizations,
    favoriteCauses,
    certifiedMissions,
    radarData,
    isRadarEligible,
    totalCertifiedMissions,
    isLoading
  } = useUserProfile();
  if (isLoading) {
    return <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-24 max-w-2xl">
          <div className="space-y-6">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </main>
        <MobileBottomNav />
      </div>;
  }
  return <>
      <Helmet>
        <title>Mon Profil | Citizen Vitae</title>
        <meta name="description" content="Consultez votre profil citoyen, vos organisations et vos missions certifiées sur Citizen Vitae." />
      </Helmet>

      <div className="min-h-screen bg-background">
        

        <main className="container mx-auto px-4 pt-6 md:pt-24 pb-24 max-w-2xl">
          {/* Settings button */}
          <div className="flex justify-end mb-1">
            <Link to="/settings">
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-full">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Header with identity */}
          <ProfileHeader organizations={organizations} />

          {/* Organizations */}
          <OrganizationsSection organizations={organizations} />

          {/* Favorite causes */}
          <FavoriteCausesSection causes={favoriteCauses} />

          {/* Citizen impact radar - conditional */}
          <CitizenImpactSection radarData={radarData} totalMissions={totalCertifiedMissions} isEligible={isRadarEligible} />

          {/* Citizen experiences / missions */}
          <CitizenExperiencesSection missions={certifiedMissions} totalCount={totalCertifiedMissions} />

          {/* Upcoming events */}
          <UpcomingEventsSection />
        </main>

        <MobileBottomNav />

        {/* Bottom padding for mobile nav */}
        <div className="h-16 md:hidden" />
      </div>
    </>;
}