
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useMobile } from '@/hooks/use-mobile';
import { ChartBar, User, Package, Home, Settings, FileText, Users } from 'lucide-react';

const Sidebar = () => {
  const { isMobile } = useMobile();
  const location = useLocation();
  const pathname = location.pathname;

  const isActive = (path: string) => {
    if (path === '/dashboard' && pathname === '/dashboard') {
      return true;
    }
    return pathname.startsWith(path) && path !== '/dashboard';
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <Home className="w-5 h-5" /> },
    { name: 'Products', path: '/products', icon: <Package className="w-5 h-5" /> },
    { name: 'Branches', path: '/branches', icon: <FileText className="w-5 h-5" /> },
    { name: 'Customers', path: '/customers', icon: <Users className="w-5 h-5" /> },
    { name: 'Sales', path: '/sales', icon: <ChartBar className="w-5 h-5" /> },
    { name: 'Settings', path: '/settings', icon: <Settings className="w-5 h-5" /> },
  ];

  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background z-10">
        <div className="grid grid-cols-5 gap-0">
          {navItems.slice(0, 5).map((item) => (
            <Link to={item.path} key={item.path}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full rounded-none flex flex-col items-center py-2 px-0 h-auto gap-0 border-r last:border-r-0",
                  isActive(item.path) && "bg-accent"
                )}
              >
                {item.icon}
                <span className="text-xs mt-1">{item.name}</span>
              </Button>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border-r bg-card h-screen w-64 flex flex-col">
      <div className="p-6 border-b">
        <h2 className="font-bold text-lg tracking-tight">GadgetSell</h2>
      </div>
      <div className="flex flex-col gap-1 p-2 flex-1">
        {navItems.map((item) => (
          <Link to={item.path} key={item.path}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start",
                isActive(item.path) && "bg-accent"
              )}
            >
              {item.icon}
              <span className="ml-2">{item.name}</span>
            </Button>
          </Link>
        ))}
      </div>
      <div className="p-4 border-t">
        <Link to="/settings" className="flex items-center gap-2 hover:text-primary">
          <User className="h-5 w-5" />
          <span>Account</span>
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;
