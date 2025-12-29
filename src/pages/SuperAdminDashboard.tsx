import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SuperAdminSidebar } from '@/components/super-admin/SuperAdminSidebar';
import { SuperAdminHeader } from '@/components/super-admin/SuperAdminHeader';
import { OverviewTab } from '@/components/super-admin/OverviewTab';
import { OrganizationsTab } from '@/components/super-admin/OrganizationsTab';
import { EventsTab } from '@/components/super-admin/EventsTab';
import { UsersTab } from '@/components/super-admin/UsersTab';
import { LogsTab } from '@/components/super-admin/LogsTab';
import { SidebarProvider } from '@/components/ui/sidebar';

export type SuperAdminTab = 'overview' | 'organizations' | 'events' | 'users' | 'logs';

export default function SuperAdminDashboard() {
  const { user, isLoading, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState<SuperAdminTab>('overview');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(222.2,84%,4.9%)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!user || !hasRole('super_admin')) {
    return <Navigate to="/" replace />;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'organizations':
        return <OrganizationsTab />;
      case 'events':
        return <EventsTab />;
      case 'users':
        return <UsersTab />;
      case 'logs':
        return <LogsTab />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(222.2,84%,4.9%)] text-[hsl(210,40%,98%)]">
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <SuperAdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
          
          <div className="flex-1 flex flex-col">
            <SuperAdminHeader />
            
            <main className="flex-1 p-6 overflow-auto">
              {renderTabContent()}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}
