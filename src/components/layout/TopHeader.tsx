import { LogOut, ChevronDown, Bell, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
    <header className="sticky top-0 z-30 flex h-[56px] items-center justify-between border-b border-white/[0.06] bg-background/80 glass px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="lg:hidden text-white/50 hover:text-white" />
        <div>
          <h1 className="text-sm font-semibold text-foreground tracking-tight">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Notification bell */}
        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/[0.08] relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
        </Button>

        <div className="w-px h-5 bg-white/[0.08] mx-2" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2.5 h-auto py-1.5 px-2 rounded-xl hover:bg-white/[0.08]">
              <Avatar className="h-7 w-7 ring-1 ring-white/10">
                <AvatarFallback className="bg-gradient-primary text-white text-[10px] font-semibold">
                  {profile ? getInitials(profile.full_name) : '?'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-xs font-medium leading-none text-foreground">{profile?.full_name}</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {profile ? getRoleLabel(profile.role) : ''}
                </span>
              </div>
              <ChevronDown className="h-3 w-3 text-white/30 ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 bg-card/95 glass border-white/10 shadow-premium">
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-foreground">{profile?.full_name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{profile?.email}</p>
            </div>
            <DropdownMenuSeparator className="bg-white/[0.06]" />
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
