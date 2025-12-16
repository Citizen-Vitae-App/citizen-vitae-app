import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Settings } from 'lucide-react';
import { MobileBottomNav } from '@/components/MobileBottomNav';

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-20 md:pb-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Dashboard Super Admin</h1>
          <p className="text-muted-foreground text-lg mb-8">
            Gérez les organisations et les utilisateurs de la plateforme
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Building2 className="w-8 h-8 mb-2 text-primary" />
                <CardTitle>Organisations</CardTitle>
                <CardDescription>Gérer les organisations</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Bientôt disponible</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="w-8 h-8 mb-2 text-primary" />
                <CardTitle>Utilisateurs</CardTitle>
                <CardDescription>Gérer les utilisateurs</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Bientôt disponible</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Settings className="w-8 h-8 mb-2 text-primary" />
                <CardTitle>Paramètres</CardTitle>
                <CardDescription>Configuration de la plateforme</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Bientôt disponible</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <MobileBottomNav />
    </div>
  );
}
