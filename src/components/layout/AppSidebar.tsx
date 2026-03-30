import { Home, Package, Users, Box, Building2, BarChart3, ChevronLeft } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const allNavItems = [
  { title: 'Dashboard', url: '/dashboard', icon: Home, adminOnly: false },
  { title: 'Orders', url: '/orders', icon: Package, adminOnly: false },
  { title: 'Users', url: '/users', icon: Users, adminOnly: true },
  { title: 'Products', url: '/products', icon: Box, adminOnly: true },
  { title: 'Clients', url: '/clients', icon: Building2, adminOnly: true },
  { title: 'Analytics', url: '/analytics', icon: BarChart3, adminOnly: false },
];

export function AppSidebar() {
  const { isAdmin } = useAuth();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';
  const navItems = allNavItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold text-sm shrink-0">
          D
        </div>
        {!collapsed && <span className="text-lg font-bold text-sidebar-foreground tracking-tight">Deal</span>}
      </div>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-10">
                    <NavLink
                      to={item.url}
                      end={item.url === '/dashboard'}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="w-full justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
