import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { OrganizationSettingsContent } from '@/components/organization/OrganizationSettingsContent';
import { OrganizationMobileHeader } from '@/components/organization/OrganizationMobileHeader';
import { CitizenModeFAB } from '@/components/CitizenModeFAB';

export default function OrganizationSettings() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <>
      <Helmet>
        <title>Paramètres de l'organisation | Citizen Vitae</title>
      </Helmet>
      
      <div className="min-h-screen bg-background">
        {/* Header: Mobile uses OrganizationMobileHeader, Desktop uses Navbar */}
        {isMobile ? <OrganizationMobileHeader /> : <Navbar />}
        
        <main className={`container mx-auto px-4 pb-24 md:pb-8 ${isMobile ? 'pt-20' : 'pt-20 md:pt-24'}`}>
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <Button variant="ghost" size="icon" onClick={() => navigate('/organization/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Paramètres de l'organisation</h1>
                <p className="text-muted-foreground text-sm">
                  Personnalisez le profil public de votre organisation
                </p>
              </div>
            </div>

            <OrganizationSettingsContent />
          </div>
        </main>
        
        <MobileBottomNav />
        
        {/* FAB Mobile - Passer au mode citoyen */}
        <CitizenModeFAB />
      </div>
    </>
  );
}