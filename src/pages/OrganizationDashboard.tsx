import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { EventsTab } from '@/components/organization/EventsTab';
import { PeopleTab } from '@/components/organization/PeopleTab';
import { MembersTab } from '@/components/organization/MembersTab';
import { TeamsTab } from '@/components/organization/TeamsTab';
import { OrganizationTab } from '@/components/organization/OrganizationTab';
import { OrganizationBottomNav } from '@/components/OrganizationBottomNav';
import { OrganizationMobileHeader } from '@/components/organization/OrganizationMobileHeader';
import { useUserRole } from '@/hooks/useUserRole';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';

export default function OrganizationDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('events');
  const { 
    isOwner, 
    isAdmin, 
    isLeader,
    isMember,
    userTeamId,
    canViewOrganizationSettings,
    isLoading 
  } = useUserRole();

  // Apply ?tab=... deep-linking (used by /organization/scan bottom nav)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
      // Clean the URL (optional but keeps it tidy)
      searchParams.delete('tab');
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect non-admin users to appropriate default tab if they try to access restricted tabs
  useEffect(() => {
    if (!isLoading) {
      // Leaders and members should not see 'organization' tab
      if ((isLeader || isMember) && !isAdmin && !isOwner) {
        if (activeTab === 'organization') {
          setActiveTab('events');
        }
      }
      // Members also shouldn't see 'members' or 'teams' tabs
      if (isMember && !isLeader && !isAdmin && !isOwner) {
        if (activeTab === 'members' || activeTab === 'teams') {
          setActiveTab('events');
        }
      }
    }
  }, [isLoading, isLeader, isMember, isAdmin, isOwner, activeTab]);

  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        {isMobile ? <OrganizationMobileHeader /> : <Navbar />}
        <main className={`container mx-auto px-4 pb-20 md:pb-8 ${isMobile ? 'pt-20' : 'pt-20 md:pt-32'}`}>
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
    // Regular members see events and people (filtered to their team)
    if (isMember) {
      return ['events', 'people'];
    }
    return ['events', 'people'];
  };

  const availableTabs = getAvailableTabs();

  return (
    <div className="min-h-screen bg-background">
      {/* Header: Mobile uses OrganizationMobileHeader, Desktop uses Navbar */}
      {isMobile ? (
        <OrganizationMobileHeader />
      ) : (
        <Navbar 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          userRole={{ isOwner, isAdmin, isLeader, isMember, canViewOrganizationSettings }}
        />
      )}
      
      <main className={`container mx-auto px-4 pb-20 md:pb-8 ${isMobile ? 'pt-20' : 'pt-20 md:pt-32'}`}>
        <div className="max-w-5xl mx-auto">
          {activeTab === 'events' && (
            <EventsTab 
              userTeamId={(isLeader || isMember) && !isAdmin && !isOwner ? userTeamId : undefined}
              canManageAllEvents={isOwner || isAdmin}
              isMember={isMember && !isLeader && !isAdmin && !isOwner}
            />
          )}
          {activeTab === 'people' && (
            <PeopleTab 
              userTeamId={(isLeader || isMember) && !isAdmin && !isOwner ? userTeamId : undefined}
              isLeader={isLeader && !isAdmin && !isOwner}
              isMember={isMember && !isLeader && !isAdmin && !isOwner}
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
      
      <OrganizationBottomNav 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        availableTabs={availableTabs}
      />
    </div>
  );
}
