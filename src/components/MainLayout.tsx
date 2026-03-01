import { useIsMobile } from '@/hooks/use-mobile';
import BottomNavigation from './BottomNavigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter
} from '@/components/ui/sidebar';
import { Home, AlertTriangle, Map, User, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const items = [
    { title: "Home", url: "/home", icon: Home },
    { title: "Alerts", url: "/alerts", icon: AlertTriangle },
    { title: "Peta", url: "/map", icon: Map },
    { title: "Profil", url: "/profile", icon: User },
  ];

  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col bg-background pb-20">
        <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
           <div className="font-semibold">Alert App</div>
        </div>
        {children}
        <BottomNavigation />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="border-b p-4">
          <div className="flex items-center gap-2 font-bold text-xl px-2">
            <span className="text-primary">🚨</span> Alert App
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                        asChild 
                        isActive={location.pathname.startsWith(item.url)}
                        tooltip={item.title}
                        size="lg"
                    >
                      <button onClick={() => navigate(item.url)} className="text-base font-medium">
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t p-4">
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton size="lg" onClick={handleLogout} className="text-destructive hover:text-destructive">
                        <LogOut className="h-5 w-5" />
                        <span>Logout</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sticky top-0 z-10">
          <SidebarTrigger className="-ml-1" />
          <div className="ml-auto flex items-center gap-4">
             <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                    <AvatarImage src="" />
                    <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{user?.name || 'User'}</span>
             </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-8 max-w-7xl mx-auto w-full">
            {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
