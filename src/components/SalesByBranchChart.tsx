
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
              data={data}
              margin={{
                top: 5,
                right: isMobile ? 5 : 30,
                left: isMobile ? 0 : 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="branch" tick={{ fontSize: isMobile ? 10 : 12 }} />
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
