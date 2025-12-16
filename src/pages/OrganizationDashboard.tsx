import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { EventsTab } from '@/components/organization/EventsTab';
import { PeopleTab } from '@/components/organization/PeopleTab';
import { OrganizationTab } from '@/components/organization/OrganizationTab';
import { MobileBottomNav } from '@/components/MobileBottomNav';

export default function OrganizationDashboard() {
  const [activeTab, setActiveTab] = useState('events');

  return (
    <div className="min-h-screen bg-background">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="container mx-auto px-4 pt-20 md:pt-32 pb-20 md:pb-8">
        <div className="max-w-5xl mx-auto">
          {activeTab === 'events' && <EventsTab />}
          {activeTab === 'people' && <PeopleTab />}
          {activeTab === 'organization' && <OrganizationTab />}
        </div>
      </main>
      
      <MobileBottomNav />
    </div>
  );
}
