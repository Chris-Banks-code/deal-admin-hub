import { ChevronLeft } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions';
import { MODULES, GROUP_LABEL, type NavGroup } from '@/lib/erp-modules';
import dealLogo from '@/assets/deal-logo.jpg';

const GROUP_ORDER: NavGroup[] = ['operations', 'commerce', 'finance', 'admin'];

export function AppSidebar() {
  const { can, loading } = usePermissions();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';

  const visible = MODULES.filter(m => can(m.key, 'view'));

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="flex items-center px-4 py-5 border-b border-sidebar-border">
        {!collapsed && (
          <img src={dealLogo} alt="Deal Group" className="h-9 w-auto object-contain brightness-0 invert" />
        )}
      </div>

      <SidebarContent className="px-3 py-4">
        {GROUP_ORDER.map(group => {
          const items = visible.filter(m => m.group === group);
          if (items.length === 0) return null;
          return (
            <SidebarGroup key={group} className="mt-1">
              {!collapsed && (
                <SidebarGroupLabel className="text-[10px] font-semibold tracking-widest uppercase text-sidebar-foreground/40 px-3 mb-1">
                  {GROUP_LABEL[group]}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  {items.map(item => (
                    <SidebarMenuItem key={item.key}>
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
          );
        })}

        {!loading && visible.length === 0 && !collapsed && (
          <div className="px-3 py-6 text-[11px] text-sidebar-foreground/40">
            No modules assigned to your role.
          </div>
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
