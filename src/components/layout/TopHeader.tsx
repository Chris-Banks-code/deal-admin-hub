import { LogOut, ChevronDown, Bell, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { getInitials, getRoleLabel } from '@/lib/formatters';

export function TopHeader({ title }: { title: string }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between border-b border-border/60 bg-card/80 glass px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="lg:hidden" />
        <div>
          <h1 className="text-base font-semibold text-foreground tracking-tight">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Notification bell */}
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent" />
        </Button>

        <div className="w-px h-6 bg-border/60 mx-2" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2.5 h-auto py-1.5 px-2 rounded-lg hover:bg-muted/80">
              <Avatar className="h-8 w-8 ring-2 ring-border/50">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {profile ? getInitials(profile.full_name) : '?'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-medium leading-none text-foreground">{profile?.full_name}</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">
                  {profile ? getRoleLabel(profile.role) : ''}
                </span>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground/60 ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 shadow-premium">
            <div className="px-3 py-2">
              <p className="text-sm font-medium">{profile?.full_name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{profile?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
