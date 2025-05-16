
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import StatCard from '@/components/StatCard';
import RecentSalesTable from '@/components/RecentSalesTable';
import TopProductsTable from '@/components/TopProductsTable';
import SalesByBranchChart from '@/components/SalesByBranchChart';
import BusinessSetup from '@/components/BusinessSetup';
import { Sale, TopProduct, SalesByBranch } from '@/types';
import { ChartBar, Calendar, Square, CircleCheck } from 'lucide-react';
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
    lowStockItems: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // Function to fetch dashboard data
  const fetchDashboardData = async () => {
    if (!currentBusiness) return;

    setIsLoading(true);
    try {
      // For now, we'll use mock data until we implement actual queries
      // This would be replaced with actual Supabase queries

      // Mock recent sales
      const mockSales: Sale[] = [
        {
          id: "sale-1",
          product_id: "product-1",
          branch_id: "branch-1",
          customer_id: "customer-1",
          quantity: 2,
          total: 1999.98,
          date: "2023-05-15T10:30:00",
          business_id: currentBusiness.id,
          product: { id: "product-1", name: "iPhone 13", brand: "Apple", price: 999.99, cost_price: 800, business_id: currentBusiness.id },
          branch: { id: "branch-1", name: "Main Store", business_id: currentBusiness.id },
          customer: { id: "customer-1", name: "John Doe", phone: "123-456-7890", business_id: currentBusiness.id }
        },
        {
          id: "sale-2",
          product_id: "product-2",
          branch_id: "branch-2",
          quantity: 1,
          total: 1299.99,
          date: "2023-05-15T11:45:00",
          business_id: currentBusiness.id,
          product: { id: "product-2", name: "MacBook Air", brand: "Apple", price: 1299.99, cost_price: 1000, business_id: currentBusiness.id },
          branch: { id: "branch-2", name: "Downtown Branch", business_id: currentBusiness.id }
        },
        {
          id: "sale-3",
          product_id: "product-3",
          branch_id: "branch-1",
          customer_id: "customer-2",
          quantity: 3,
          total: 359.97,
          date: "2023-05-14T14:20:00",
          business_id: currentBusiness.id,
          product: { id: "product-3", name: "Samsung Buds Pro", brand: "Samsung", price: 119.99, cost_price: 70, business_id: currentBusiness.id },
          branch: { id: "branch-1", name: "Main Store", business_id: currentBusiness.id },
          customer: { id: "customer-2", name: "Jane Smith", phone: "987-654-3210", business_id: currentBusiness.id }
        }
      ];
      setRecentSales(mockSales);

      // Mock top products
      const topProductsData: TopProduct[] = [
        { id: "product-1", name: "iPhone 13", brand: "Apple", totalSold: 24, totalRevenue: 23999.76 },
        { id: "product-3", name: "Samsung Buds Pro", brand: "Samsung", totalSold: 18, totalRevenue: 2159.82 },
        { id: "product-2", name: "MacBook Air", brand: "Apple", totalSold: 12, totalRevenue: 15599.88 },
        { id: "product-4", name: "Galaxy S22", brand: "Samsung", totalSold: 10, totalRevenue: 8999.90 }
      ];
      setTopProducts(topProductsData);

      // Mock sales by branch
      const salesByBranchData: SalesByBranch[] = [
        { branch: "Main Store", sales: 42, revenue: 32580 },
        { branch: "Downtown Branch", sales: 28, revenue: 21450 },
        { branch: "Mall Kiosk", sales: 15, revenue: 12200 },
      ];
      setSalesByBranch(salesByBranchData);

      // Mock dashboard stats
      setDashboardStats({
        todaySales: 6,
        revenueToday: 3659.94,
        monthlyRevenue: 51250,
        lowStockItems: 4
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
                  change={12.5}
                  icon={<Square className="h-5 w-5 text-primary" />}
                />
                <StatCard 
                  title="Revenue Today" 
                  value={dashboardStats.revenueToday}
                  description="$823 more than yesterday"
                  change={15.2}
                  icon={<ChartBar className="h-5 w-5 text-primary" />}
                />
                <StatCard 
                  title="Monthly Revenue" 
                  value={dashboardStats.monthlyRevenue}
                  description="May 1 - May 15"
                  change={8.1}
                  icon={<Calendar className="h-5 w-5 text-primary" />}
                />
                <StatCard 
                  title="Low Stock Items" 
                  value={dashboardStats.lowStockItems}
                  description="Items below threshold"
                  change={-2.5}
                  icon={<CircleCheck className="h-5 w-5 text-primary" />}
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
