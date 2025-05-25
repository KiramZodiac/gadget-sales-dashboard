// hooks/useDashboardData.ts
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useBusiness } from '@/lib/store/business';
import { supabase } from '@/lib/supabaseClient';

interface Sale {
  id: string;
  date: string;
  total: number;
  quantity: number;
  product_id: string;
  branch_id: string;
  // Add other relevant fields
}

interface TopProduct {
  id: string;
  name: string;
  brand: string;
  totalSold: number;
  totalRevenue: number;
}

interface SalesByBranch {
  branch: string;
  sales: number;
  revenue: number;
}

interface DashboardStats {
  todaySales: number;
  revenueToday: number;
  monthlyRevenue: number;
  monthlyProfit: number;
  lowStockItems: number;
  profitGrowth: number;
}

export const useDashboardData = () => {
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();

  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [salesByBranch, setSalesByBranch] = useState<SalesByBranch[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    todaySales: 0,
    revenueToday: 0,
    monthlyRevenue: 0,
    monthlyProfit: 0,
    lowStockItems: 0,
    profitGrowth: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
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

        // Fetch products
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('business_id', currentBusiness.id);

        if (productsError) throw productsError;

        // Fetch all sales
        const { data: allSales, error: allSalesError } = await supabase
          .from('sales')
          .select('product_id, quantity, total, date, branch_id')
          .eq('business_id', currentBusiness.id);

        if (allSalesError) throw allSalesError;

        // Calculate top products
        const productSalesMap: Record<string, { totalSold: number; totalRevenue: number }> = {};

        allSales?.forEach((sale) => {
          if (!productSalesMap[sale.product_id]) {
            productSalesMap[sale.product_id] = { totalSold: 0, totalRevenue: 0 };
          }
          productSalesMap[sale.product_id].totalSold += sale.quantity;
          productSalesMap[sale.product_id].totalRevenue += sale.total;
        });

        const topProductsData: TopProduct[] =
          products?.map((product) => ({
            id: product.id,
            name: product.name,
            brand: product.brand,
            totalSold: productSalesMap[product.id]?.totalSold || 0,
            totalRevenue: productSalesMap[product.id]?.totalRevenue || 0,
          })) || [];

        topProductsData.sort((a, b) => b.totalRevenue - a.totalRevenue);
        setTopProducts(topProductsData.slice(0, 5));

        // Fetch branches
        const { data: branches, error: branchesError } = await supabase
          .from('branches')
          .select('id, name')
          .eq('business_id', currentBusiness.id);

        if (branchesError) throw branchesError;

        // Calculate sales by branch
        const branchSalesData: SalesByBranch[] = [];

        if (branches) {
          const branchSalesPromises = branches.map(async (branch) => {
            const { data: branchSales, error: branchSalesError } = await supabase
              .from('sales')
              .select('quantity, total')
              .eq('business_id', currentBusiness.id)
              .eq('branch_id', branch.id);

            if (branchSalesError) throw branchSalesError;

            const totalSales = branchSales?.length || 0;
            const totalRevenue = branchSales?.reduce((sum, sale) => sum + sale.total, 0) || 0;

            return {
              branch: branch.name,
              sales: totalSales,
              revenue: totalRevenue,
            };
          });

          const resolvedBranchSales = await Promise.all(branchSalesPromises);
          setSalesByBranch(resolvedBranchSales);
        }

        // Calculate dashboard stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const todaySales = allSales?.filter((sale) => new Date(sale.date) >= today) || [];
        const todaySalesCount = todaySales.length;
        const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);

        const monthlySales =
          allSales?.filter((sale) => new Date(sale.date) >= firstDayOfMonth) || [];
        const monthlyRevenue = monthlySales.reduce((sum, sale) => sum + sale.total, 0);

        // Fetch product costs
        const productIds = [...new Set(monthlySales.map((s) => s.product_id))];
        const { data: productCosts, error: productCostsError } = await supabase
          .from('products')
          .select('id, cost_price')
          .in('id', productIds);

        if (productCostsError) throw productCostsError;

        const costMap = Object.fromEntries(productCosts.map((p) => [p.id, p.cost_price]));

        let monthlyProfit = 0;
        for (const sale of monthlySales) {
          const cost = (costMap[sale.product_id] || 0) * sale.quantity;
          monthlyProfit += sale.total - cost;
        }

        // Count low stock items
        const { count: lowStockCount, error: lowStockError } = await supabase
          .from('branch_products')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', currentBusiness.id)
          .lt('quantity', 5);

        if (lowStockError) throw lowStockError;

        setDashboardStats({
          todaySales: todaySalesCount,
          revenueToday: todayRevenue,
          monthlyRevenue: monthlyRevenue,
          monthlyProfit: monthlyProfit,
          lowStockItems: lowStockCount || 0,
          profitGrowth: monthlyProfit > 0 ? 5.2 : -3.1, // Mock growth rate
        });
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load dashboard data',
          description: error.message || 'An error occurred while loading your dashboard.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentBusiness]);

  return {
    recentSales,
    topProducts,
    salesByBranch,
    dashboardStats,
    isLoading,
  };
};
