import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ArrowLeftRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { OrganizationSettingsContent } from '@/components/organization/OrganizationSettingsContent';

export default function OrganizationSettings() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <>
      <Helmet>
        <title>Paramètres de l'organisation | Citizen Vitae</title>
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="container mx-auto px-4 pt-20 md:pt-24 pb-24 md:pb-8">
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
        
        {/* FAB Mobile - Revenir au mode citoyen */}
        {isMobile && (
          <button
            onClick={() => navigate('/')}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-black text-white px-5 py-3 rounded-full shadow-lg transition-all duration-300 ease-out hover:scale-105 active:scale-95"
          >
            <ArrowLeftRight className="h-4 w-4" />
            <span className="text-sm font-medium whitespace-nowrap">Revenir au mode citoyen</span>
          </button>
        )}
      </div>
    </>
  );
}
function CitizenModeFAB() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  if (!isMobile) return null;
  
  return (
    <button
      onClick={() => navigate('/')}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-black text-white px-5 py-3 rounded-full shadow-lg transition-all duration-300 ease-out hover:scale-105 active:scale-95"
    >
      <ArrowLeftRight className="h-4 w-4" />
      <span className="text-sm font-medium whitespace-nowrap">Revenir au mode citoyen</span>
    </button>
  );
}