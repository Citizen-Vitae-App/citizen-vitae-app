import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { EventsTab } from '@/components/organization/EventsTab';
import { PeopleTab } from '@/components/organization/PeopleTab';
import { OrganizationTab } from '@/components/organization/OrganizationTab';

export default function OrganizationDashboard() {
  const [activeTab, setActiveTab] = useState('events');

  return (
    <div className="min-h-screen bg-background">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="container mx-auto px-4 pt-32">
        <div className="max-w-5xl mx-auto">
          {activeTab === 'events' && <EventsTab />}
          {activeTab === 'people' && <PeopleTab />}
          {activeTab === 'organization' && <OrganizationTab />}
        </div>
      </main>
    </div>
  );
}
