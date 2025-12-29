import { LayoutDashboard, Building2, Calendar, Users, FileText, Shield } from 'lucide-react';
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
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

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
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar 
      className="border-r border-[hsl(217.2,32.6%,17.5%)] bg-[hsl(222.2,84%,4.9%)]"
      collapsible="icon"
    >
      <SidebarHeader className="p-4 border-b border-[hsl(217.2,32.6%,17.5%)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed && (
            <div>
              <h2 className="font-semibold text-sm text-[hsl(210,40%,98%)]">Super Admin</h2>
              <p className="text-xs text-[hsl(215,20.2%,65.1%)]">Citizen Vitae</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onTabChange(item.id)}
                    className={cn(
                      "w-full justify-start gap-3 px-4 py-2.5 rounded-lg transition-colors",
                      "text-[hsl(215,20.2%,65.1%)] hover:text-[hsl(210,40%,98%)] hover:bg-[hsl(217.2,32.6%,17.5%)]",
                      activeTab === item.id && "bg-[hsl(217.2,32.6%,17.5%)] text-[hsl(210,40%,98%)]"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
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
