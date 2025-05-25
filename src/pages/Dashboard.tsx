'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import StatCard from '@/components/StatCard';
import RecentSalesTable from '@/components/RecentSalesTable';
import TopProductsTable from '@/components/TopProductsTable';
import SalesByBranchChart from '@/components/SalesByBranchChart';
import BusinessSetup from '@/components/BusinessSetup';
import { Sale, TopProduct, SalesByBranch } from '@/types';
import { ChartBar, Calendar, Wallet, AlertTriangle, EyeOff, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/context/BusinessContext';
import { useToast } from '@/components/ui/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

type TimeRange = 'day' | 'week' | 'month' | 'year';

const Dashboard = () => {
  const { currentBusiness, setCurrentBusiness, businesses } = useBusiness();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [salesByBranch, setSalesByBranch] = useState<SalesByBranch[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [todaySales, setTodaySales] = useState(0);
  const [revenueToday, setRevenueToday] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [monthlyProfit, setMonthlyProfit] = useState(0);
  const [lowStockItems, setLowStockItems] = useState(0);
  const [profitGrowth, setProfitGrowth] = useState(0);
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  const [showValues, setShowValues] = useState(true);

  // Calculate date ranges based on selected time period
  const getDateRange = useMemo(() => {
    const now = new Date();
    const startDate = new Date(now);

    switch (timeRange) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        return { start: startDate, end: now };
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        return { start: startDate, end: now };
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        return { start: startDate, end: now };
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);
        return { start: startDate, end: now };
      default:
        return { start: startDate, end: now };
    }
  }, [timeRange]);

  // Format date range for display
  const formattedDateRange = useMemo(() => {
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric',
      ...(timeRange === 'year' && { year: 'numeric' })
    };

    return `${getDateRange.start.toLocaleDateString(undefined, options)} - ${getDateRange.end.toLocaleDateString(undefined, options)}`;
  }, [getDateRange, timeRange]);

  useEffect(() => {
    if (!currentBusiness) return;

    const fetchDashboardData = async () => {
      setLoading(true);

      const businessId = currentBusiness.id;
      const { start: startDate, end: endDate } = getDateRange;

      try {
        const [
          { data: salesData, error: salesError },
          { data: productData, error: productError },
          { data: recentSalesData, error: recentError },
          { data: branchProductsData, count: lowStockCount, error: lowStockError },
          { data: branchesData, error: branchesError }
        ] = await Promise.all([
          supabase
            .from('sales')
            .select('*')
            .eq('business_id', businessId)
            .gte('date', startDate.toISOString())
            .lte('date', endDate.toISOString()),
          
          supabase.from('products').select('*').eq('business_id', businessId),

          supabase
            .from('sales')
            .select('*, product:products(*), branch:branches(*), customer:customers(*)')
            .eq('business_id', businessId)
            .gte('date', startDate.toISOString())
            .lte('date', endDate.toISOString())
            .order('date', { ascending: false })
            .limit(10),

          supabase
            .from('products')
            .select('*', { count: 'exact' }) 
            .eq('business_id', businessId)
            .lt('quantity', 2),
            
          supabase.from('branches').select('*').eq('business_id', businessId),
        ]);

        if (salesError || productError || recentError || lowStockError || branchesError) {
          throw salesError || productError || recentError || lowStockError || branchesError;
        }

        // Set recent sales
        setRecentSales(recentSalesData || []);

        // Time period stats
        const periodSalesList = salesData || [];
        setTodaySales(periodSalesList.length);
        setRevenueToday(periodSalesList.reduce((sum, sale) => sum + sale.total, 0));

        // Calculate revenue and profit for the period
        const periodRevenueValue = periodSalesList.reduce((sum, sale) => sum + sale.total, 0);
        setMonthlyRevenue(periodRevenueValue);

        let periodProfitTotal = 0;
        for (const sale of periodSalesList) {
          const product = productData?.find(p => p.id === sale.product_id);
          if (product) {
            periodProfitTotal += sale.total - (sale.quantity * product.cost_price);
          }
        }
        setMonthlyProfit(periodProfitTotal);
        setProfitGrowth(periodProfitTotal > 0 ? 4.3 : -2.1);

        // Top products
        const productSalesMap: Record<string, { totalSold: number; totalRevenue: number }> = {};
        periodSalesList.forEach(sale => {
          const pid = sale.product_id;
          if (!productSalesMap[pid]) {
            productSalesMap[pid] = { totalSold: 0, totalRevenue: 0 };
          }
          productSalesMap[pid].totalSold += sale.quantity;
          productSalesMap[pid].totalRevenue += sale.total;
        });

        const topProductsList: TopProduct[] = productData
          ?.map(product => ({
            id: product.id,
            name: product.name,
            brand: product.brand,
            totalSold: productSalesMap[product.id]?.totalSold || 0,
            totalRevenue: productSalesMap[product.id]?.totalRevenue || 0,
          }))
          .sort((a, b) => b.totalRevenue - a.totalRevenue)
          .slice(0, 5) || [];

        setTopProducts(topProductsList);

        // Low stock
        setLowStockItems(lowStockCount || 0);

        // Sales by branch
        const branchSales: SalesByBranch[] = branchesData?.map(branch => {
          const branchSales = salesData?.filter(sale => sale.branch_id === branch.id) || [];
          const totalSales = branchSales.length;
          const totalRevenue = branchSales.reduce((sum, s) => sum + s.total, 0);
          return {
            branch: branch.name,
            sales: totalSales,
            revenue: totalRevenue,
          };
        }) || [];

        setSalesByBranch(branchSales);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error loading dashboard',
          description: error.message,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentBusiness, getDateRange, toast]);

  if (!currentBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
        <BusinessSetup onBusinessCreated={(id, name) => setCurrentBusiness({ id, name })} />
      </div>
    );
  }
  
  const isProfitPositive = monthlyProfit >= 0;
  const hasData = recentSales.length > 0 || 
    (topProducts.length > 0 && topProducts.some(p => p.totalSold > 0)) || 
    salesByBranch.length > 0;

  return (
    <div className="min-h-screen flex">
      <Sidebar />

      <div className="flex-1 flex flex-col w-full">
        <DashboardHeader
          businessName={currentBusiness.name}
          userBusinesses={businesses}
          onBusinessChange={(businessId) => {
            const business = businesses.find((b) => b.id === businessId);
            if (business) {
              setCurrentBusiness(business);
            }
          }}
        />

        <main className={cn("flex-1 bg-muted/20", isMobile ? "p-3 overflow-y-auto" : "p-6")}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
            <h1 className={cn("font-bold", isMobile ? "text-2xl" : "text-3xl")}>
              Dashboard
            </h1>
            
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">{formattedDateRange}</p>
              <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="year">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              {/* Low Stock Alert */}
              {!isLoading && lowStockItems > 0 && (
                <div className="mb-4 w-full">
                  <Link
                    to="/lowstock"
                    className="flex items-center gap-3 bg-yellow-50 border border-yellow-400 p-4 rounded-lg shadow hover:bg-yellow-100 transition"
                  >
                    <AlertTriangle className="w-6 h-6 text-yellow-600 animate-bounce" />
                    <div>
                      <p className="text-yellow-800 font-semibold">
                        {lowStockItems} item{lowStockItems > 1 ? "s are" : " is"} low in stock
                      </p>
                      <p className="text-sm text-yellow-700">
                        Click to review inventory
                      </p>
                    </div>
                  </Link>
                </div>
              )}

              {/* Stats Cards */}
              <div className="flex justify-end mb-2">
  <Button
    variant="ghost"
    size="sm"
    onClick={() => setShowValues(!showValues)}
    className="flex items-center gap-2"
  >
    {showValues ? (
      <>
        <EyeOff className="w-4 h-4" /> Hide Values
      </>
    ) : (
      <>
        <Eye className="w-4 h-4" /> Show Values
      </>
    )}
  </Button>
</div>

<div className={cn("grid gap-4 mb-6", isMobile ? "grid-cols-2" : "md:grid-cols-2 lg:grid-cols-4")}>
  <StatCard
    title={`Total ${timeRange === 'day' ? 'Today' : timeRange === 'week' ? 'This Week' : timeRange === 'month' ? 'This Month' : 'This Year'}`}
    value={showValues ? todaySales : '****'}
    description={`Number of ${timeRange === 'day' ? 'transactions today' : `transactions this ${timeRange}`}`}
    icon={<Wallet className="h-4 w-4 text-primary" />}
  />
  <StatCard
    title={`Revenue (${timeRange})`}
    value={showValues ? revenueToday : '****'}
    description={`Total sales amount`}
    currency={true}
    icon={<ChartBar className="h-4 w-4 text-primary" />}
  />
  <StatCard
    title={`${timeRange === 'day' ? 'Daily' : timeRange === 'week' ? 'Weekly' : timeRange === 'month' ? 'Monthly' : 'Yearly'} Revenue`}
    value={showValues ? monthlyRevenue : '****'}
    description={formattedDateRange}
    currency={true}
    icon={<Calendar className="h-4 w-4 text-primary" />}
  />
  <StatCard
    title={isProfitPositive ? `${timeRange === 'day' ? 'Daily' : timeRange === 'week' ? 'Weekly' : timeRange === 'month' ? 'Monthly' : 'Yearly'} Profit` : 'Loss'}
    value={showValues ? Math.abs(monthlyProfit) : '****'}
    description={isProfitPositive ? "Profit growth" : "Looking to improve"}
    change={showValues ? profitGrowth : undefined}
    currency={true}
    icon={<AlertTriangle className="h-4 w-4 text-primary" />}
    className={!isProfitPositive ? "border-red-300" : ""}
  />
</div>


              {/* Sales Chart */}
              {isLoading ? (
                <Skeleton className="h-96 w-full rounded-xl" />
              ) : (
                salesByBranch.length > 0 && (
                  <div className="mb-6">
                    <div>
                      <h2 className="text-lg font-semibold mb-4">
                        Sales by Branch ({timeRange === 'day' ? 'Today' : timeRange === 'week' ? 'This Week' : timeRange === 'month' ? 'This Month' : 'This Year'})
                      </h2>
                      <SalesByBranchChart 
                        data={salesByBranch} 
                      />
                    </div>
                  </div>
                )
              )}

              {/* Sales & Products Tables */}
              {hasData ? (
                <div className={cn("grid gap-6 mb-6", isMobile ? "grid-cols-1" : "lg:grid-cols-2")}>
                  {recentSales.length > 0 && (
                    <RecentSalesTable 
                      sales={recentSales} 
                      title={`Recent Sales (${timeRange === 'day' ? 'Today' : timeRange === 'week' ? 'This Week' : timeRange === 'month' ? 'This Month' : 'This Year'})`}
                    />
                  )}
                  {topProducts.length > 0 && topProducts.some((p) => p.totalSold > 0) && (
                    <TopProductsTable 
                      products={topProducts} 
                      title={`Top Products (${timeRange === 'day' ? 'Today' : timeRange === 'week' ? 'This Week' : timeRange === 'month' ? 'This Month' : 'This Year'})`}
                    />
                  )}
                </div>
              ) : (
                <div className="text-center py-8 bg-card rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-2">
                    No sales data available for this period
                  </h3>
                  <p className="text-muted-foreground">
                    Start by adding products and making sales to see your dashboard come alive.
                  </p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;