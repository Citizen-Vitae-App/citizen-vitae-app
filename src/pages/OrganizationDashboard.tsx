import { Navbar } from '@/components/Navbar';

export default function OrganizationDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Dashboard Organisation</h1>
          <p className="text-muted-foreground text-lg mb-8">
            Gérez vos événements et votre organisation
          </p>
          
          <div className="bg-muted rounded-lg p-12 text-center">
            <p className="text-muted-foreground">
              Bientôt disponible
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
