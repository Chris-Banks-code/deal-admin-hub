import { Home, Package, Users, Box, Building2, BarChart3, Target, ChevronLeft } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import dealLogo from '@/assets/deal-logo.jpg';

const mainNavItems = [
  { title: 'Dashboard',  url: '/dashboard', icon: Home,     adminOnly: false },
  { title: 'Orders',     url: '/orders',    icon: Package,  adminOnly: false },
  { title: 'Targets',    url: '/targets',   icon: Target,   adminOnly: false },
  { title: 'Analytics',  url: '/analytics', icon: BarChart3,adminOnly: false },
];

const managementNavItems = [
  { title: 'Users', url: '/users', icon: Users, adminOnly: true },
  { title: 'Products', url: '/products', icon: Box, adminOnly: true },
  { title: 'Clients', url: '/clients', icon: Building2, adminOnly: true },
];

export function AppSidebar() {
  const { isAdmin } = useAuth();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';
  const mainItems = mainNavItems.filter(item => !item.adminOnly || isAdmin);
  const mgmtItems = managementNavItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      {/* Logo */}
      <div className="flex items-center px-4 py-5 border-b border-sidebar-border">
        {!collapsed && (
          <img src={dealLogo} alt="Deal Group" className="h-9 w-auto object-contain brightness-0 invert" />
        )}
      </div>

      <SidebarContent className="px-3 py-4">
        {/* Main Nav */}
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-[10px] font-semibold tracking-widest uppercase text-sidebar-foreground/40 px-3 mb-1">Overview</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-10">
                    <NavLink
                      to={item.url}
                      end={item.url === '/dashboard'}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/60 transition-all duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold shadow-sm"
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed && <span className="text-[13px]">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Management Nav */}
        {mgmtItems.length > 0 && (
          <SidebarGroup className="mt-4">
            {!collapsed && <SidebarGroupLabel className="text-[10px] font-semibold tracking-widest uppercase text-sidebar-foreground/40 px-3 mb-1">Management</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {mgmtItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-10">
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/60 transition-all duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold shadow-sm"
                      >
                        <item.icon className="h-[18px] w-[18px] shrink-0" />
                        {!collapsed && <span className="text-[13px]">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="w-full justify-center text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent h-8"
        >
          <ChevronLeft className={`h-4 w-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
