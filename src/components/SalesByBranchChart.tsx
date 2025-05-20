
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SalesByBranch } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';

interface SalesByBranchChartProps {
  data: SalesByBranch[];
}

const SalesByBranchChart = ({ data }: SalesByBranchChartProps) => {
  const isMobile = useIsMobile();

  // Format currency in Ugandan shillings
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Custom tooltip to display values in UGX
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border rounded shadow-sm">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }}>
              {entry.name === 'Revenue' ? formatCurrency(entry.value) : `${entry.value} Sales`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Simplified mobile view when there are many branches
  const simplifyDataForMobile = (originalData: SalesByBranch[]) => {
    if (!isMobile || originalData.length <= 4) return originalData;
    
    // For mobile with many branches, show top 3 and combine the rest
    if (originalData.length > 4) {
      // Sort by revenue
      const sortedData = [...originalData].sort((a, b) => b.revenue - a.revenue);
      const top3 = sortedData.slice(0, 3);
      
      // Combine the rest
      const others = sortedData.slice(3).reduce(
        (acc, curr) => {
          return {
            branch: 'Others',
            sales: acc.sales + curr.sales,
            revenue: acc.revenue + curr.revenue
          };
        },
        { branch: 'Others', sales: 0, revenue: 0 }
      );
      
      return [...top3, others];
    }
    
    return originalData;
  };

  const chartData = simplifyDataForMobile(data);

  return (
    <Card className="dashboard-card col-span-2">
      <CardHeader className="pb-2">
        <CardTitle>Sales by Branch</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No sales data available by branch
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 5,
                right: isMobile ? 5 : 30,
                left: isMobile ? 0 : 20,
                bottom: 5,
              }}
              barSize={isMobile ? 15 : 20}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="branch" 
                tick={{ fontSize: isMobile ? 10 : 12 }}
                tickFormatter={isMobile ? (value) => value.substring(0, 6) + (value.length > 6 ? '...' : '') : undefined}
              />
              <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="sales" name="Sales" fill="#0ea5e9" />
              <Bar dataKey="revenue" name="Revenue" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default SalesByBranchChart;
