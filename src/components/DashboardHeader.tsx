
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, Settings } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface DashboardHeaderProps {
  businessName: string;
  userBusinesses: { id: string; name: string }[];
  onBusinessChange: (businessId: string) => void;
}

const DashboardHeader = ({ 
  businessName, 
  userBusinesses, 
  onBusinessChange 
}: DashboardHeaderProps) => {
  const { toast } = useToast();
  const [newBusiness, setNewBusiness] = useState("");
  
  const handleNotificationClick = () => {
    toast({
      title: "No new notifications",
      description: "You're all caught up!",
    });
  };

  return (
    <header className="border-b bg-card">
      <div className="container flex items-center justify-between py-4">
        <div className="flex items-center gap-4">
          <h1 className="font-semibold text-lg">{businessName}</h1>
          
          {userBusinesses.length > 0 && (
            <Select onValueChange={onBusinessChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Switch business" />
              </SelectTrigger>
              <SelectContent>
                {userBusinesses.map((business) => (
                  <SelectItem key={business.id} value={business.id}>
                    {business.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleNotificationClick}
          >
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
