
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { 
  ChartBar, 
  Home, 
  ArrowLeft, 
  ArrowRight,
  Calendar, 
  Square, 
  CircleCheck
} from "lucide-react";

interface SidebarProps {
  className?: string;
}

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  active?: boolean;
}

const mainNav: NavItem[] = [
  { 
    icon: Home, 
    label: "Dashboard", 
    href: "/dashboard", 
    active: true 
  },
  { 
    icon: Square, 
    label: "Products", 
    href: "/products" 
  },
  { 
    icon: CircleCheck, 
    label: "Inventory", 
    href: "/inventory" 
  },
  { 
    icon: Calendar, 
    label: "Sales", 
    href: "/sales" 
  },
  { 
    icon: ChartBar, 
    label: "Reports", 
    href: "/reports" 
  },
];

const Sidebar = ({ className }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={cn(
      "flex flex-col border-r bg-card transition-all duration-300",
      collapsed ? "w-16" : "w-60",
      className
    )}>
      <div className="flex h-14 items-center px-3 justify-between">
        {!collapsed && (
          <span className="font-semibold text-lg">GadgetSell</span>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setCollapsed(!collapsed)}
          className={cn("ml-auto", collapsed && "mx-auto")}
        >
          {collapsed ? 
            <ArrowRight className="h-4 w-4" /> : 
            <ArrowLeft className="h-4 w-4" />
          }
        </Button>
      </div>
      
      <Separator />
      
      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="flex flex-col gap-1">
          {mainNav.map((item, index) => (
            <Button
              key={index}
              variant={item.active ? "secondary" : "ghost"}
              className={cn(
                "justify-start gap-2",
                collapsed && "justify-center px-2"
              )}
              asChild
            >
              <a href={item.href}>
                <item.icon className="h-4 w-4" />
                {!collapsed && <span>{item.label}</span>}
              </a>
            </Button>
          ))}
        </nav>
      </ScrollArea>
      
      <div className="p-4">
        <Button 
          variant="default" 
          className={cn(
            "w-full", 
            collapsed && "px-2"
          )}
        >
          {collapsed ? 
            <ChartBar className="h-4 w-4" /> : 
            "Create Sale"
          }
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
