'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import StatCard from '@/components/StatCard';
import RecentSalesTable from '@/components/RecentSalesTable';
import TopProductsTable from '@/components/TopProductsTable';
import SalesByBranchChart from '@/components/SalesByBranchChart';
import BusinessSetup from '@/components/BusinessSetup';
import { Sale, TopProduct, SalesByBranch } from '@/types';
import { ChartBar, Calendar, Wallet, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/context/BusinessContext';
import { useToast } from '@/components/ui/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
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

  

  useEffect(() => {
    if (!currentBusiness) return;

    const fetchDashboardData = async () => {
      setLoading(true);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const businessId = currentBusiness.id;

      try {
        const [
          { data: salesData, error: salesError },
          { data: productData, error: productError },
          { data: recentSalesData, error: recentError },
          { data: branchProductsData, count: lowStockCount, error: lowStockError },
          { data: branchesData, error: branchesError }
        ] = await Promise.all([
          supabase.from('sales').select('*').eq('business_id', businessId),
          supabase.from('products').select('*').eq('business_id', businessId),
          supabase
            .from('sales')
            .select('*, product:products(*), branch:branches(*), customer:customers(*)')
            .eq('business_id', businessId)
            .order('date', { ascending: false })
            .limit(10),
          supabase
            .from('branch_products')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', businessId)
            .lt('quantity', 5),
          supabase.from('branches').select('*').eq('business_id', businessId),
        ]);

        if (salesError || productError || recentError || lowStockError || branchesError) {
          throw salesError || productError || recentError || lowStockError || branchesError;
        }

        // Set recent sales
        setRecentSales(recentSalesData || []);

        // Today stats
        const todaySalesList = salesData?.filter(sale => new Date(sale.date) >= today) || [];
        setTodaySales(todaySalesList.length);
        setRevenueToday(todaySalesList.reduce((sum, sale) => sum + sale.total, 0));

        // Monthly stats
        const monthlySalesList = salesData?.filter(sale => new Date(sale.date) >= firstDayOfMonth) || [];
        const monthlyRevenueValue = monthlySalesList.reduce((sum, sale) => sum + sale.total, 0);
        setMonthlyRevenue(monthlyRevenueValue);

        // Monthly profit
        let monthlyProfitTotal = 0;
        for (const sale of monthlySalesList) {
          const product = productData?.find(p => p.id === sale.product_id);
          if (product) {
            monthlyProfitTotal += sale.total - (sale.quantity * product.cost_price);
          }
        }
        setMonthlyProfit(monthlyProfitTotal);
        setProfitGrowth(monthlyProfitTotal > 0 ? 4.3 : -2.1);

        // Top products
        const productSalesMap: Record<string, { totalSold: number; totalRevenue: number }> = {};
        salesData?.forEach(sale => {
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
  }, [currentBusiness]);

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
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 p-4 space-y-4">
      <DashboardHeader 
          businessName={currentBusiness.name}
          userBusinesses={businesses}
          onBusinessChange={(businessId) => {
            const business = businesses.find(b => b.id === businessId);
            if (business) {
              setCurrentBusiness(business);
            }
          }}
        />

<div className="min-h-screen  flex">
      <Sidebar />
      
      <div className="flex-1 flex flex-col w-full">
        <DashboardHeader 
          businessName={currentBusiness.name}
          userBusinesses={businesses}
          onBusinessChange={(businessId) => {
            const business = businesses.find(b => b.id === businessId);
            if (business) {
              setCurrentBusiness(business);
            }
          }}
        />
        
        <main className={cn("flex-1 bg-muted/20", isMobile ? "p-3 overflow-y-auto" : "p-6")}>
          <h1 className={cn("font-bold mb-6", isMobile ? "text-2xl" : "text-3xl")}>Dashboard</h1>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              Loading dashboard data...
            </div>
          ) : (
            <>
              <div className={cn("grid gap-4 mb-6 ", 
                isMobile ? "grid-cols-2 " : "md:grid-cols-2 lg:grid-cols-4")}>
                <StatCard 
                  title="Total Sales Today" 
                  value={todaySales}
                  description="Number of transactions"
                  icon={<Wallet className="h-4 w-4 text-primary" />}
                />
                <StatCard 
                  title="Revenue Today" 
                  value={revenueToday}
                  description="Total sales amount"
                  currency={true}
                  icon={<ChartBar className="h-4 w-4 text-primary" />}
                />
                <StatCard 
                  title="Monthly Revenue" 
                  value={monthlyRevenue}
                  description={`${new Date().toLocaleString('default', { month: 'long' })} Sales`}
                  currency={true}
                  icon={<Calendar className="h-4 w-4 text-primary" />}
                />
                <StatCard 
                  title={isProfitPositive ? "Monthly Profit" : "Monthly Loss"} 
                  value={Math.abs(monthlyProfit)}
                  description={isProfitPositive ? "Profit growth" : "Looking to improve"}
                  change={profitGrowth}
                  currency={true}
                  icon={<AlertTriangle className="h-4 w-4 text-primary" />}
                  className={!isProfitPositive ? "border-red-300" : ""}
                />
              </div>
              
              {salesByBranch.length > 0 && (
                <div className="mb-6">
                  <SalesByBranchChart data={salesByBranch} />
                </div>
              )}
              
              {hasData ? (
                <div className={cn("grid gap-6 mb-6", 
                  isMobile ? "grid-cols-1" : "lg:grid-cols-2")}>
                  {recentSales.length > 0 && <RecentSalesTable sales={recentSales} title={''} />}
                  {topProducts.length > 0 && topProducts.some(p => p.totalSold > 0) && 
                    <TopProductsTable products={topProducts} title={''} />}
                </div>
              ) : (
                <div className="text-center py-8 bg-card rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-2">No sales data available</h3>
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
    </div>
  </div>
  );
};

export default Dashboard;
