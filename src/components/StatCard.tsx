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
    <Card className={cn("dashboard-card w-full", className)}>
      <CardContent className={cn("p-4 pt-4 min-h-[96px]", isMobile && "p-3 pt-3 min-h-[80px]")}>
        <div className="flex items-start justify-between h-full">
          <div className="max-w-[75%] flex flex-col justify-between">
            <p className={cn("text-sm font-medium text-muted-foreground truncate", isMobile && "text-xs")}>{title}</p>
            <p className={cn("text-2xl font-bold ", isMobile && "text-base")}>{formattedValue}</p>
            <div className="min-h-[16px]">
              {showChange && (
                <div className={cn("flex items-center text-xs", isPositive ? "text-green-600" : "text-red-600")}>
                  {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {Math.abs(change)}%
                </div>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1 truncate">{description}</p>
            )}
          </div>
          {icon && (
            <div className="rounded-md bg-primary/10 p-2 flex-shrink-0">{icon}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;