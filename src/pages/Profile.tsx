import { useState } from 'react';
import { Link, useSearchParams, Navigate } from 'react-router-dom';
import { MainNavbar } from '@/components/MainNavbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { OrganizationsSection } from '@/components/profile/OrganizationsSection';
import { FavoriteCausesSection } from '@/components/profile/FavoriteCausesSection';
import { CitizenImpactSection } from '@/components/profile/CitizenImpactSection';
import { CitizenExperiencesSection } from '@/components/profile/CitizenExperiencesSection';
import { UpcomingEventsSection } from '@/components/profile/UpcomingEventsSection';
import { ProfilePrivacySheet } from '@/components/profile/ProfilePrivacySheet';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Helmet } from 'react-helmet-async';
import { Settings, Eye, Share2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { CitizenModeFAB } from '@/components/CitizenModeFAB';
import { OrganizationMobileHeader } from '@/components/organization/OrganizationMobileHeader';
import { OrganizationBottomNav } from '@/components/OrganizationBottomNav';

export default function Profile() {
  const [searchParams] = useSearchParams();
  const { hasRole, user } = useAuth();
  const isMobile = useIsMobile();
  const [privacyOpen, setPrivacyOpen] = useState(false);
  
  // Check if we're in organization context
  const isOrganizationContext = searchParams.get('context') === 'organization';
  
  // Call hooks before any conditional returns (React rules)
  const {
    organizations,
    favoriteCauses,
    certifiedMissions,
    radarData,
    isRadarEligible,
    totalCertifiedMissions,
    isLoading
  } = useUserProfile();
  
  // Security: If user tries to access organization context without proper role, redirect
  if (isOrganizationContext && !hasRole('organization')) {
    return <Navigate to="/profile" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        {isOrganizationContext && isMobile ? <OrganizationMobileHeader /> : <MainNavbar />}
        <main className={`container mx-auto px-4 pb-24 max-w-2xl ${isOrganizationContext && isMobile ? 'pt-20' : 'pt-6 md:pt-8'}`}>
          <div className="space-y-6">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </main>
        {isOrganizationContext && isMobile ? (
          <OrganizationBottomNav activeTab="" onTabChange={() => {}} />
        ) : (
          <MobileBottomNav />
        )}
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Mon Profil | Citizen Vitae</title>
        <meta name="description" content="Consultez votre profil citoyen, vos organisations et vos missions certifiées sur Citizen Vitae." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header: Organization header on mobile in org context, else MainNavbar */}
        {isOrganizationContext && isMobile ? <OrganizationMobileHeader /> : <MainNavbar />}

        <main className={`container mx-auto px-4 pb-24 max-w-2xl ${isOrganizationContext && isMobile ? 'pt-20' : 'pt-6 md:pt-8'}`}>
          {/* Action buttons */}
          {!isOrganizationContext && (
            <div className="flex justify-end gap-2 mb-1 md:hidden">
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => setPrivacyOpen(true)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/citizen/${user?.id}`);
                import('sonner').then(m => m.toast.success('Lien du CV copié !'));
              }}>
                <Share2 className="h-4 w-4" />
              </Button>
              <Link to="/settings">
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-full">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}

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

        {/* Bottom navigation based on context */}
        {isOrganizationContext && isMobile ? (
          <>
            <OrganizationBottomNav activeTab="" onTabChange={() => {}} />
            {/* Switch to citizen mode FAB */}
            <CitizenModeFAB />
          </>
        ) : (
          <MobileBottomNav />
        )}

        {/* Bottom padding for mobile nav */}
        <div className="h-16 md:hidden" />

        {/* Privacy Sheet */}
        <ProfilePrivacySheet open={privacyOpen} onOpenChange={setPrivacyOpen} />
      </div>
    </>
  );
}