import { LayoutDashboard, Building2, Calendar, Users, FileText } from 'lucide-react';
import { SuperAdminTab } from '@/pages/SuperAdminDashboard';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import sigleLogo from '@/assets/icon-sigle-czv.svg';
import fullLogo from '@/assets/logo-citizen-vitae.png';

interface SuperAdminSidebarProps {
  activeTab: SuperAdminTab;
  onTabChange: (tab: SuperAdminTab) => void;
}

const navItems: { id: SuperAdminTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { id: 'organizations', label: 'Organisations', icon: Building2 },
  { id: 'events', label: 'Événements', icon: Calendar },
  { id: 'users', label: 'Utilisateurs', icon: Users },
  { id: 'logs', label: 'Logs système', icon: FileText },
];

export function SuperAdminSidebar({ activeTab, onTabChange }: SuperAdminSidebarProps) {
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar 
      className={cn(
        "border-r border-[hsl(217.2,32.6%,17.5%)] bg-[hsl(222.2,84%,4.9%)]",
        "transition-all duration-300 ease-in-out"
      )}
      collapsible="icon"
      style={{ 
        width: isCollapsed ? '56px' : '220px',
        minWidth: isCollapsed ? '56px' : '220px',
      }}
    >
      <SidebarHeader className="p-3 border-b border-[hsl(217.2,32.6%,17.5%)]">
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity w-full"
          aria-label={isCollapsed ? "Déplier le menu" : "Replier le menu"}
        >
          {isCollapsed ? (
            <img 
              src={sigleLogo} 
              alt="Citizen Vitae" 
              className="w-8 h-8"
            />
          ) : (
            <img 
              src={fullLogo} 
              alt="Citizen Vitae" 
              className="h-7 object-contain"
            />
          )}
        </button>
      </SidebarHeader>

      <SidebarContent className="py-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onTabChange(item.id)}
                    className={cn(
                      "w-full gap-3 py-2.5 rounded-lg transition-colors",
                      isCollapsed ? "justify-center px-0" : "justify-start px-3",
                      "text-[hsl(215,20.2%,65.1%)] hover:text-[hsl(210,40%,98%)] hover:bg-[hsl(217.2,32.6%,17.5%)]",
                      activeTab === item.id && "bg-[hsl(217.2,32.6%,17.5%)] text-[hsl(210,40%,98%)]"
                    )}
                    tooltip={isCollapsed ? item.label : undefined}
                  >
                    <item.icon className={cn("w-5 h-5 flex-shrink-0", isCollapsed && "mx-auto")} />
                    {!isCollapsed && <span>{item.label}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
