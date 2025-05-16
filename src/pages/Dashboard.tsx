
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

const Dashboard = () => {
  const { currentBusiness, businesses, setCurrentBusiness, createBusiness } = useBusiness();
  const { toast } = useToast();
  
  // State for dashboard data
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [salesByBranch, setSalesByBranch] = useState<SalesByBranch[]>([]);
  const [dashboardStats, setDashboardStats] = useState({
    todaySales: 0,
    revenueToday: 0,
    monthlyRevenue: 0,
    monthlyProfit: 0,
    lowStockItems: 0,
    profitGrowth: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // Function to fetch dashboard data
  const fetchDashboardData = async () => {
    if (!currentBusiness) return;

    setIsLoading(true);
    try {
      // Fetch recent sales
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          product:products(*),
          branch:branches(*),
          customer:customers(*)
        `)
        .eq('business_id', currentBusiness.id)
        .order('date', { ascending: false })
        .limit(10);
        
      if (salesError) throw salesError;
      setRecentSales(salesData || []);
      
      // Fetch top products
      // In a real implementation, this would be a more complex query 
      // using group by and sum functions
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .limit(5);
        
      if (productsError) throw productsError;

      // Get sales totals for products (in real app, use a database query for this)
      const { data: allSales, error: allSalesError } = await supabase
        .from('sales')
        .select('product_id, quantity, total')
        .eq('business_id', currentBusiness.id);
        
      if (allSalesError) throw allSalesError;
      
      // Calculate top products based on sales data
      const productSales: Record<string, { totalSold: number, totalRevenue: number }> = {};
      
      allSales?.forEach(sale => {
        if (!productSales[sale.product_id]) {
          productSales[sale.product_id] = { totalSold: 0, totalRevenue: 0 };
        }
        productSales[sale.product_id].totalSold += sale.quantity;
        productSales[sale.product_id].totalRevenue += sale.total;
      });
      
      const topProductsData: TopProduct[] = products?.map(product => ({
        id: product.id,
        name: product.name,
        brand: product.brand,
        totalSold: productSales[product.id]?.totalSold || 0,
        totalRevenue: productSales[product.id]?.totalRevenue || 0,
      })) || [];
      
      // Sort by total revenue
      topProductsData.sort((a, b) => b.totalRevenue - a.totalRevenue);
      setTopProducts(topProductsData);
      
      // Fetch branches
      const { data: branches, error: branchesError } = await supabase
        .from('branches')
        .select('id, name')
        .eq('business_id', currentBusiness.id);
        
      if (branchesError) throw branchesError;
      
      // Calculate sales by branch
      const branchSalesData: SalesByBranch[] = [];
      
      if (branches) {
        for (const branch of branches) {
          const { data: branchSales, error: branchSalesError } = await supabase
            .from('sales')
            .select('quantity, total')
            .eq('business_id', currentBusiness.id)
            .eq('branch_id', branch.id);
            
          if (branchSalesError) throw branchSalesError;
          
          const totalSales = branchSales?.length || 0;
          const totalRevenue = branchSales?.reduce((sum, sale) => sum + sale.total, 0) || 0;
          
          branchSalesData.push({
            branch: branch.name,
            sales: totalSales,
            revenue: totalRevenue
          });
        }
      }
      
      setSalesByBranch(branchSalesData);
      
      // Calculate today's date and first day of month for filters
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      // Calculate dashboard stats
      // Today's sales count and revenue
      const { data: todaySales, error: todaySalesError } = await supabase
        .from('sales')
        .select('total')
        .eq('business_id', currentBusiness.id)
        .gte('date', today.toISOString());
        
      if (todaySalesError) throw todaySalesError;
      
      const todaySalesCount = todaySales?.length || 0;
      const todayRevenue = todaySales?.reduce((sum, sale) => sum + sale.total, 0) || 0;
      
      // Monthly sales revenue and profit
      const { data: monthlySales, error: monthlySalesError } = await supabase
        .from('sales')
        .select('total, quantity, product_id')
        .eq('business_id', currentBusiness.id)
        .gte('date', firstDayOfMonth.toISOString());
        
      if (monthlySalesError) throw monthlySalesError;
      
      const monthlyRevenue = monthlySales?.reduce((sum, sale) => sum + sale.total, 0) || 0;
      
      // Calculate monthly profit (need to get product cost prices)
      let monthlyProfit = 0;
      if (monthlySales && monthlySales.length > 0) {
        for (const sale of monthlySales) {
          const { data: product } = await supabase
            .from('products')
            .select('cost_price')
            .eq('id', sale.product_id)
            .single();
            
          if (product) {
            const cost = product.cost_price * sale.quantity;
            monthlyProfit += (sale.total - cost);
          }
        }
      }
      
      // Count low stock items (in real app, get from branch_products with quantity below threshold)
      const { count: lowStockCount, error: lowStockError } = await supabase
        .from('branch_products')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', currentBusiness.id)
        .lt('quantity', 5);
        
      if (lowStockError) throw lowStockError;
      
      // Set dashboard stats
      setDashboardStats({
        todaySales: todaySalesCount,
        revenueToday: todayRevenue,
        monthlyRevenue: monthlyRevenue,
        monthlyProfit: monthlyProfit,
        lowStockItems: lowStockCount || 0,
        profitGrowth: monthlyProfit > 0 ? 5.2 : -3.1 // Mock growth rate for now
      });

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast({
        variant: "destructive",
        title: "Failed to load dashboard data",
        description: error.message || "An error occurred while loading your dashboard.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentBusiness]);

  const handleBusinessCreated = (businessId: string, businessName: string) => {
    setCurrentBusiness({
      id: businessId,
      name: businessName
    });
  };

  // Show business setup if no business is configured
  if (!currentBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/50">
        <BusinessSetup onBusinessCreated={handleBusinessCreated} />
      </div>
    );
  }

  // Calculate whether overall profit is positive or negative
  const isProfitPositive = dashboardStats.monthlyProfit >= 0;

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
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
        
        <main className="flex-1 p-6 bg-muted/20">
          <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              Loading dashboard data...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard 
                  title="Total Sales Today" 
                  value={dashboardStats.todaySales}
                  description="Number of transactions"
                  icon={<Wallet className="h-5 w-5 text-primary" />}
                />
                <StatCard 
                  title="Revenue Today" 
                  value={dashboardStats.revenueToday}
                  description="Total sales amount"
                  icon={<ChartBar className="h-5 w-5 text-primary" />}
                />
                <StatCard 
                  title="Monthly Revenue" 
                  value={dashboardStats.monthlyRevenue}
                  description={`${new Date().toLocaleString('default', { month: 'long' })} Sales`}
                  icon={<Calendar className="h-5 w-5 text-primary" />}
                />
                <StatCard 
                  title={isProfitPositive ? "Monthly Profit" : "Monthly Loss"} 
                  value={Math.abs(dashboardStats.monthlyProfit)}
                  description={isProfitPositive ? "Profit growth" : "Looking to improve"}
                  change={dashboardStats.profitGrowth}
                  icon={<AlertTriangle className="h-5 w-5 text-primary" />}
                  className={!isProfitPositive ? "border-red-300" : ""}
                />
              </div>
              
              <div className="mb-8">
                <SalesByBranchChart data={salesByBranch} />
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <RecentSalesTable sales={recentSales} />
                <TopProductsTable products={topProducts} />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
