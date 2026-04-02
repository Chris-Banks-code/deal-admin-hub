import { Home, Package, Users, Box, Building2, BarChart3, Target, ChevronLeft } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

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
      <div className="flex items-center px-4 py-5 border-b border-white/[0.06]">
        {!collapsed && (
          <h1 className="text-xl font-bold text-gradient">Deal</h1>
        )}
        {collapsed && (
          <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <span className="text-sm font-bold text-white">D</span>
          </div>
        )}
      </div>

      <SidebarContent className="px-3 py-4">
        {/* Main Nav */}
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-[10px] font-medium tracking-widest uppercase text-white/30 px-3 mb-1">Overview</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-10">
                    <NavLink
                      to={item.url}
                      end={item.url === '/dashboard'}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-white/50 transition-all duration-200 hover:bg-white/[0.08] hover:text-white group"
                      activeClassName="bg-white/[0.1] text-white font-medium"
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0 group-hover:scale-110 transition-transform duration-200" />
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
            {!collapsed && <SidebarGroupLabel className="text-[10px] font-medium tracking-widest uppercase text-white/30 px-3 mb-1">Management</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {mgmtItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-10">
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3 rounded-xl px-3 py-2 text-white/50 transition-all duration-200 hover:bg-white/[0.08] hover:text-white group"
                        activeClassName="bg-white/[0.1] text-white font-medium"
                      >
                        <item.icon className="h-[18px] w-[18px] shrink-0 group-hover:scale-110 transition-transform duration-200" />
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

      <SidebarFooter className="p-3 border-t border-white/[0.06]">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="w-full justify-center text-white/30 hover:text-white hover:bg-white/[0.08] h-8"
        >
          <ChevronLeft className={`h-4 w-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
