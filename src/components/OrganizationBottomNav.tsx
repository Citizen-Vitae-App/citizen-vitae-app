import { Calendar, Users, ScanLine, Users2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
interface OrganizationBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  availableTabs?: string[];
}
export const OrganizationBottomNav = ({
  activeTab,
  onTabChange,
  availableTabs
}: OrganizationBottomNavProps) => {
  const navigate = useNavigate();
  const allNavItems = [{
    id: 'events',
    label: 'Événements',
    icon: Calendar,
    isCentral: false
  }, {
    id: 'people',
    label: 'Contributeurs',
    icon: Users,
    isCentral: false
  }, {
    id: 'scan',
    label: 'Scan',
    icon: ScanLine,
    isCentral: true,
    action: () => navigate('/organization/scan')
  }, {
    id: 'teams',
    label: 'Équipes',
    icon: Users2,
    isCentral: false
  }, {
    id: 'organization',
    label: 'Paramètres',
    icon: Settings,
    isCentral: false
  }];

  // Filter nav items based on available tabs, but always include scan
  // If no availableTabs provided, show all items
  const navItems = availableTabs 
    ? allNavItems.filter(item => item.id === 'scan' || availableTabs.includes(item.id))
    : allNavItems;
  return <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map(item => {
        const Icon = item.icon;
        const isActive = item.id === 'scan' ? false : activeTab === item.id;
        return <button key={item.id} onClick={() => {
          if (item.action) {
            item.action();
          } else {
            onTabChange(item.id);
          }
        }} className={cn("flex flex-col items-center justify-center gap-1 flex-1 py-2 relative", item.isCentral ? "-mt-4" : "", isActive ? "text-foreground" : "text-muted-foreground")}>
              <div className={cn("relative flex items-center justify-center", item.isCentral && "bg-primary rounded-full p-3 shadow-lg")}>
                <Icon className={cn(item.isCentral ? "h-6 w-6 text-primary-foreground" : "h-6 w-6")} />
              </div>
              
            </button>;
      })}
      </div>
    </nav>;
};