import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EventsTab } from '@/components/organization/EventsTab';
import { PeopleTab } from '@/components/organization/PeopleTab';
import { OrganizationTab } from '@/components/organization/OrganizationTab';

export default function OrganizationDashboard() {
  const [activeTab, setActiveTab] = useState('events');

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Navigation tabs centrée */}
          <div className="flex justify-center mb-8">
            <TabsList className="bg-transparent border-b border-border rounded-none h-auto p-0">
              <TabsTrigger 
                value="events"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3"
              >
                Events
              </TabsTrigger>
              <TabsTrigger 
                value="people"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3"
              >
                People
              </TabsTrigger>
              <TabsTrigger 
                value="organization"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3"
              >
                Organization
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Contenu des tabs */}
          <div className="max-w-6xl mx-auto">
            <TabsContent value="events" className="mt-0">
              <EventsTab />
            </TabsContent>

            <TabsContent value="people" className="mt-0">
              <PeopleTab />
            </TabsContent>

            <TabsContent value="organization" className="mt-0">
              <OrganizationTab />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}
