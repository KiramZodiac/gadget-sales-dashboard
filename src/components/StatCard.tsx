
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  change?: number;
  className?: string;
}

const StatCard = ({ 
  title, 
  value, 
  description, 
  icon,
  change,
  className 
}: StatCardProps) => {
  const formattedValue = typeof value === 'number' 
    ? new Intl.NumberFormat('en-US', {
        style: value.toString().includes('$') ? 'currency' : 'decimal',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value)
    : value;

  const showChange = change !== undefined;
  const isPositive = change && change > 0;

  return (
    <Card className={cn("dashboard-card", className)}>
      <CardContent className="p-4 pt-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="stat-title">{title}</p>
            <p className="stat-value">{formattedValue}</p>
            
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
