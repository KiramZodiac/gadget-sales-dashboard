
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  change?: number;
  className?: string;
  currency?: boolean;
}

const StatCard = ({ 
  title, 
  value, 
  description, 
  icon,
  change,
  className,
  currency = false
}: StatCardProps) => {
  const isMobile = useIsMobile();
  
  // Format currency in Ugandan shillings
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  const formattedValue = typeof value === 'number' 
    ? (currency ? formatCurrency(value) : value.toLocaleString())
    : value;

  const showChange = change !== undefined;
  const isPositive = change && change > 0;

  return (
    <Card className={cn("dashboard-card", className)}>
      <CardContent className={cn("p-4 pt-4", isMobile && "p-3 pt-3")}>
        <div className="flex items-start justify-between">
          <div>
            <p className="stat-title">{title}</p>
            <p className={cn("stat-value", isMobile && "text-xl")}>{formattedValue}</p>
            
            {showChange && (
              <div className={isPositive ? "stat-change-positive" : "stat-change-negative"}>
                {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(change)}%
              </div>
            )}
            
            {description && (
              <p className="stat-description">{description}</p>
            )}
          </div>
          
          {icon && (
            <div className="rounded-md bg-primary/10 p-2">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
