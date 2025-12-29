import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { EventsTab } from '@/components/organization/EventsTab';
import { PeopleTab } from '@/components/organization/PeopleTab';
import { MembersTab } from '@/components/organization/MembersTab';
import { TeamsTab } from '@/components/organization/TeamsTab';
import { OrganizationTab } from '@/components/organization/OrganizationTab';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { useUserRole } from '@/hooks/useUserRole';
import { Skeleton } from '@/components/ui/skeleton';

export default function OrganizationDashboard() {
  const [activeTab, setActiveTab] = useState('events');
  const { 
    isOwner, 
    isAdmin, 
    isLeader, 
    userTeamId,
    canViewOrganizationSettings,
    isLoading 
  } = useUserRole();

  // Debug log for role checking
  console.log('useUserRole result:', { isOwner, isAdmin, isLeader, userTeamId, isLoading });

  // Redirect Leaders to appropriate default tab if they try to access organization settings
  useEffect(() => {
    if (!isLoading && isLeader && !isAdmin && !isOwner) {
      // Leaders should not see 'organization' tab, redirect to events if needed
      if (activeTab === 'organization') {
        setActiveTab('events');
      }
    }
  }, [isLoading, isLeader, isAdmin, isOwner, activeTab]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-20 md:pt-32 pb-20 md:pb-8">
          <div className="max-w-5xl mx-auto space-y-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        </main>
      </div>
    );
  }

  // Get available tabs based on role
  const getAvailableTabs = () => {
    // Owners and Admins see everything
    if (isOwner || isAdmin) {
      return ['events', 'people', 'members', 'teams', 'organization'];
    }
    // Leaders see events (filtered), people (filtered), members (filtered), their team
    if (isLeader) {
      return ['events', 'people', 'members', 'teams'];
    }
    // Regular members shouldn't access dashboard normally
    return ['events'];
  };

  const availableTabs = getAvailableTabs();

  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        userRole={{ isOwner, isAdmin, isLeader, canViewOrganizationSettings }}
      />
      
      <main className="container mx-auto px-4 pt-20 md:pt-32 pb-20 md:pb-8">
        <div className="max-w-5xl mx-auto">
          {activeTab === 'events' && (
            <EventsTab 
              userTeamId={isLeader && !isAdmin && !isOwner ? userTeamId : undefined}
              canManageAllEvents={isOwner || isAdmin}
            />
          )}
          {activeTab === 'people' && (
            <PeopleTab 
              userTeamId={isLeader && !isAdmin && !isOwner ? userTeamId : undefined}
              isLeader={isLeader && !isAdmin && !isOwner}
            />
          )}
          {activeTab === 'members' && (
            <MembersTab 
              userTeamId={isLeader && !isAdmin && !isOwner ? userTeamId : undefined}
              canManageMembers={isOwner || isAdmin}
              isLeader={isLeader}
            />
          )}
          {activeTab === 'teams' && (
            <TeamsTab 
              userTeamId={isLeader && !isAdmin && !isOwner ? userTeamId : undefined}
              canCreateTeams={isOwner || isAdmin}
              isLeader={isLeader && !isAdmin && !isOwner}
            />
          )}
          {activeTab === 'organization' && canViewOrganizationSettings && (
            <OrganizationTab 
              onNavigateToMembers={() => setActiveTab('members')}
              onNavigateToTeams={() => setActiveTab('teams')}
            />
          )}
        </div>
      </main>
      
      <MobileBottomNav />
    </div>
  );
}
