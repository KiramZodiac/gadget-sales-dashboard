
import React from "react";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, Settings, LogOut } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { useBusiness } from "@/context/BusinessContext";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

interface DashboardHeaderProps {
  businessName: string;
  userBusinesses: { id: string; name: string }[];
  onBusinessChange: (businessId: string) => void;
}

const DashboardHeader = ({ 
  businessName
}: DashboardHeaderProps) => {
  const { toast } = useToast();
  const { businesses, currentBusiness, setCurrentBusiness } = useBusiness();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  
  const handleNotificationClick = () => {
    toast({
      title: "No new notifications",
      description: "You're all caught up!",
    });
  };

  const handleBusinessChange = (businessId: string) => {
    const business = businesses.find(b => b.id === businessId);
    if (business) {
      setCurrentBusiness(business);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="border-b bg-card">
      <div className="container flex items-center justify-between py-4">
        <div className="flex items-center gap-4">
          <h1 className="font-semibold text-lg">{businessName}</h1>
          
          {businesses.length > 0 && (
            <Select
              value={currentBusiness?.id}
              onValueChange={handleBusinessChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Switch business" />
              </SelectTrigger>
              <SelectContent>
                {businesses.map((business) => (
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings')}
          >
            <Settings className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
