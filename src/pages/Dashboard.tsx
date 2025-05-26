'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { debounce } from 'lodash';
import { Parser } from 'papaparse';
import { motion } from 'framer-motion';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import StatCard from '@/components/StatCard';
import RecentSalesTable from '@/components/RecentSalesTable';
import TopProductsTable from '@/components/TopProductsTable';
import SalesByBranchChart from '@/components/SalesByBranchChart';
import BusinessSetup from '@/components/BusinessSetup';
import { Sale, TopProduct, SalesByBranch, Product } from '@/types';
import { ChartBar, Calendar, Wallet, AlertTriangle, EyeOff, Eye, Menu, Sun, Moon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/context/BusinessContext';
import { useToast } from '@/components/ui/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type TimeRange = 'day' | 'week' | 'month' | 'year' | 'custom';

const Dashboard = () => {
  const { currentBusiness, setCurrentBusiness, businesses } = useBusiness();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [salesByBranch, setSalesByBranch] = useState<SalesByBranch[]>([]);
  const [lowStockDetails, setLowStockDetails] = useState<Product[]>([]);
  const [isSalesLoading, setSalesLoading] = useState(true);
  const [isProductsLoading, setProductsLoading] = useState(true);
  const [isBranchesLoading, setBranchesLoading] = useState(true);
  const [isLowStockLoading, setLowStockLoading] = useState(true);
  const [todaySales, setTodaySales] = useState(0);
  const [revenueToday, setRevenueToday] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [monthlyProfit, setMonthlyProfit] = useState(0);
  const [lowStockItems, setLowStockItems] = useState(0);
  const [profitGrowth, setProfitGrowth] = useState(0);
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [showValues, setShowValues] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );

  // Persist theme in localStorage and apply to document
  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Calculate date ranges based on selected time period
  const getDateRange = useMemo(() => {
    if (timeRange === 'custom' && customDateRange && customDateRange.start && customDateRange.end) {
      if (customDateRange.end < customDateRange.start) {
        toast({
          variant: 'destructive',
          title: 'Invalid Date Range',
          description: 'End date cannot be before start date.',
        });
        return { start: new Date(), end: new Date() }; // Fallback to today
      }
      return customDateRange;
    }
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
  }, [timeRange, customDateRange, toast]);

  // Calculate previous period for profit growth
  const getPreviousDateRange = useMemo(() => {
    const now = getDateRange.start;
    const startDate = new Date(now);

    switch (timeRange) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        return { start: startDate, end: getDateRange.start };
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        return { start: startDate, end: getDateRange.start };
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        return { start: startDate, end: getDateRange.start };
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);
        return { start: startDate, end: getDateRange.start };
      default:
        return { start: startDate, end: now };
    }
  }, [getDateRange, timeRange]);

  // Format date range for display
  const formattedDateRange = useMemo(() => {
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric',
      ...(timeRange === 'year' && { year: 'numeric' })
    };

    return `${getDateRange.start.toLocaleDateString(undefined, options)} - ${getDateRange.end.toLocaleDateString(undefined, options)}`;
  }, [getDateRange, timeRange]);
  

  const fetchDashboardData = async () => {
    if (!currentBusiness) return;

    // Skip fetching if custom date range is incomplete
    if (timeRange === 'custom' && (!customDateRange || !customDateRange.start || !customDateRange.end)) {
      return;
    }

    setSalesLoading(true);
    setProductsLoading(true);
    setBranchesLoading(true);
    setLowStockLoading(true);

    const businessId = currentBusiness.id;
    const { start: startDate, end: endDate } = getDateRange;
    const { start: prevStartDate, end: prevEndDate } = getPreviousDateRange;

    try {
      const [
        { data: salesData, error: salesError },
        { data: productData, error: productError },
        { data: recentSalesData, error: recentError },
        { data: branchProductsData, count: lowStockCount, error: lowStockError },
        { data: branchesData, error: branchesError },
        { data: prevSalesData, error: prevSalesError }
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
          .select('*, available_quantity', { count: 'exact' }) 
          .eq('business_id', businessId)
          .lt('quantity', 2),
          
        supabase.from('branches').select('*').eq('business_id', businessId),

        supabase
          .from('sales')
          .select('*')
          .eq('business_id', businessId)
          .gte('date', prevStartDate.toISOString())
          .lte('date', prevEndDate.toISOString()),
      ]);

      if (salesError) {
        toast({ variant: 'destructive', title: 'Error fetching sales', description: salesError.message });
        throw salesError;
      }
      if (productError) {
        toast({ variant: 'destructive', title: 'Error fetching products', description: productError.message });
        throw productError;
      }
      if (recentError) {
        toast({ variant: 'destructive', title: 'Error fetching recent sales', description: recentError.message });
        throw recentError;
      }
      if (lowStockError) {
        toast({ variant: 'destructive', title: 'Error fetching low stock items', description: lowStockError.message });
        throw lowStockError;
      }
      if (branchesError) {
        toast({ variant: 'destructive', title: 'Error fetching branches', description: branchesError.message });
        throw branchesError;
      }
      if (prevSalesError) {
        toast({ variant: 'destructive', title: 'Error fetching previous period sales', description: prevSalesError.message });
        throw prevSalesError;
      }

      setRecentSales(recentSalesData || []);
      setSalesLoading(false);

      const periodSalesList = salesData || [];
      setTodaySales(periodSalesList.length);
      setRevenueToday(periodSalesList.reduce((sum, sale) => sum + sale.total, 0));

      const periodRevenueValue = periodSalesList.reduce((sum, sale) => sum + sale.total, 0);
      setMonthlyRevenue(periodRevenueValue);

      let periodProfitTotal = 0;
      for (const sale of periodSalesList) {
        const product = productData?.find(p => p.id === sale.product_id);
        if (product) {
          periodProfitTotal += sale.total - (sale.quantity * product.cost_price);
        } else {
          console.warn(`Product ${sale.product_id} not found for sale ${sale.id}`);
        }
      }
      setMonthlyProfit(periodProfitTotal);

      let prevPeriodProfit = 0;
      for (const sale of prevSalesData || []) {
        const product = productData?.find(p => p.id === sale.product_id);
        if (product) {
          prevPeriodProfit += sale.total - (sale.quantity * product.cost_price);
        }
      }
      const profitDiff = periodProfitTotal - prevPeriodProfit;
      const profitGrowthValue = prevPeriodProfit !== 0 ? (profitDiff / Math.abs(prevPeriodProfit)) * 100 : 0;
      setProfitGrowth(Number(profitGrowthValue.toFixed(1)));

      const productSalesMap = new Map<string, { totalSold: number; totalRevenue: number }>();
      periodSalesList.forEach(sale => {
        const pid = sale.product_id;
        if (!productSalesMap.has(pid)) {
          productSalesMap.set(pid, { totalSold: 0, totalRevenue: 0 });
        }
        const current = productSalesMap.get(pid)!;
        current.totalSold += sale.quantity;
        current.totalRevenue += sale.total;
      });

      const topProductsList: TopProduct[] = productData
        ?.map(product => ({
          id: product.id,
          name: product.name,
          brand: product.brand,
          totalSold: productSalesMap.get(product.id)?.totalSold || 0,
          totalRevenue: productSalesMap.get(product.id)?.totalRevenue || 0,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 5) || [];

      setTopProducts(topProductsList);
      setProductsLoading(false);

      setLowStockItems(lowStockCount || 0);
      setLowStockDetails(branchProductsData || []);
      setLowStockLoading(false);

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
      setBranchesLoading(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading dashboard',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  };

  const debouncedFetchDashboardData = useMemo(
    () => debounce(fetchDashboardData, 300),
    [currentBusiness, getDateRange]
  );

  useEffect(() => {
    if (!currentBusiness) return;
    if (timeRange === 'custom' && (!customDateRange || !customDateRange.start || !customDateRange.end)) {
      return; // Skip fetching until valid custom date range is set
    }
    debouncedFetchDashboardData();
    return () => debouncedFetchDashboardData.cancel();
  }, [currentBusiness, getDateRange, debouncedFetchDashboardData]);

  if (!currentBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 dark:bg-gray-800 p-4">
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
      {isSidebarOpen && <Sidebar />}
      <div className="flex-1 flex flex-col w-full">
        <DashboardHeader
          businessName={currentBusiness.name}
          userBusinesses={businesses}
          onBusinessChange={(businessId) => {
            const business = businesses.find((b) => b.id === businessId);
            if (business) {
              setCurrentBusiness(business);
            } else {
              toast({ variant: 'destructive', title: 'Error', description: 'Business not found' });
            }
          }}
          onSidebarToggle={isMobile ? () => setIsSidebarOpen(!isSidebarOpen) : undefined}
        />

        <main className={cn("flex-1 bg-muted/20 dark:bg-gray-900", isMobile ? "p-3 overflow-y-auto" : "p-6")}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
            <div className="flex items-center gap-4">
              {isMobile && (
                <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} aria-label="Toggle sidebar">
                  <Menu className="h-6 w-6" />
                </Button>
              )}
              <h1 className={cn("font-bold", isMobile ? "text-2xl" : "text-3xl", "dark:text-white")}>
                Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-2   justify-end ">
              <p className="text-sm text-muted-foreground dark:text-gray-300">{formattedDateRange}</p>
              <Select value={timeRange} onValueChange={(value: TimeRange) => { setTimeRange(value); if (value !== 'custom') setCustomDateRange(null); }}>
                <SelectTrigger className="w-[120px] dark:bg-gray-800 dark:text-white">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="year">Yearly</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              {timeRange === 'custom' && (
                <DatePicker
                  selectsRange
                  startDate={customDateRange?.start}
                  endDate={customDateRange?.end}
                  onChange={(dates: [Date | null, Date | null]) => {
                    const [start, end] = dates;
                    if (start && end && end >= start) {
                      setCustomDateRange({ start, end });
                    } else if (start && !end) {
                      setCustomDateRange({ start, end: null });
                    } else {
                      setCustomDateRange(null);
                    }
                  }}
                  className="w-[200px] p-2 border rounded dark:bg-gray-800 dark:text-white"
                  placeholderText="Select date range"
                  selectsEnd
                  minDate={new Date(2000, 0, 1)} // Prevent invalid dates
                  maxDate={new Date()} // Limit to today
                />
              )}
         
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                className="dark:text-white"
              >
                {theme === 'light' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {timeRange === 'custom' && (!customDateRange || !customDateRange.end) && (
            <div className="mb-4 w-full bg-blue-50 dark:bg-blue-900/50 border border-blue-400 dark:border-blue-600 p-4 rounded-lg shadow">
              <p className="text-blue-800 dark:text-blue-200 font-semibold">
                Please select a valid date range
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Choose both start and end dates to view data.
              </p>
            </div>
          )}

          {isLowStockLoading ? (
            <Skeleton className="h-16 w-full rounded-xl mb-4" />
          ) : (
            lowStockItems > 0 && (
              <div className="mb-4 w-full">
                <Link
                  to="/lowstock"
                  className="flex items-center gap-3 bg-yellow-50 dark:bg-yellow-900/50 border border-yellow-400 dark:border-yellow-600 p-4 rounded-lg shadow hover:bg-yellow-100 dark:hover:bg-yellow-900 transition"
                >
                  <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 animate-bounce" />
                  <div className="flex-1">
                    <p className="text-yellow-800 dark:text-yellow-200 font-semibold">
                      {lowStockItems} item{lowStockItems > 1 ? "s are" : " is"} low in stock
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Click to review inventory
                    </p>
                    {lowStockDetails.map(item => (
                      <div key={item.id} className="mt-2">
                        <p className="text-sm dark:text-white">{item.name}</p>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                          <div
                            className="bg-yellow-600 dark:bg-yellow-400 h-2.5 rounded-full"
                            style={{ width: `${(item.quantity / item.available_quantity) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Link>
              </div>
            )
          )}

          <div className="flex justify-end mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowValues(!showValues)}
              className="flex items-center gap-2 dark:text-white"
              aria-label={showValues ? "Hide values" : "Show values"}
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

          {(isSalesLoading || isProductsLoading) ? (
            <div className={cn("grid gap-4", isMobile ? "grid-cols-2" : "md:grid-cols-2 lg:grid-cols-4")}>
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl mb-6" />
              ))}
            </div>
          ) : (
            <TooltipProvider>
              <motion.div
                className={cn("grid gap-4 mb-6 ", isMobile ? "grid-cols-2" : "md:grid-cols-3 lg:grid-cols-4")}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <Tooltip>
                  <TooltipTrigger>
                    <StatCard
                      title={`Total ${timeRange === 'day' ? 'Today' : timeRange === 'week' ? 'This Week' : timeRange === 'month' ? 'This Month' : timeRange === 'year' ? 'This Year' : 'Custom Period'}`}
                      value={showValues ? todaySales : '****'}
                      description={`Number of ${timeRange === 'day' ? 'transactions today' : `transactions this ${timeRange === 'custom' ? 'period' : timeRange}`}`}
                      icon={<Wallet className="h-4 w-4 text-primary dark:text-blue-400" />}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total transactions recorded for the selected period.</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger>
                    <StatCard
                      title={`Revenue (${timeRange})`}
                      value={showValues ? revenueToday : '****'}
                      description={`Total sales amount`}
                      currency={true}
                      icon={<ChartBar className="h-4 w-4 text-primary dark:text-blue-400" />}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total revenue from sales in the selected period.</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger>
                    <StatCard
                      title={`${timeRange === 'day' ? 'Daily' : timeRange === 'week' ? 'Weekly' : timeRange === 'month' ? 'Monthly' : timeRange === 'year' ? 'Yearly' : 'Custom'} Revenue`}
                      value={showValues ? monthlyRevenue : '****'}
                      description={formattedDateRange}
                      currency={true}
                      icon={<Calendar className="h-4 w-4 text-primary dark:text-blue-400" />}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Aggregate revenue for the selected date range.</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger>
                    <StatCard
                      title={isProfitPositive ? `${timeRange === 'day' ? 'Daily' : timeRange === 'week' ? 'Weekly' : timeRange === 'month' ? 'Monthly' : timeRange === 'year' ? 'Yearly' : 'Custom'} Profit` : 'Loss'}
                      value={showValues ? Math.abs(monthlyProfit) : '****'}
                      description={isProfitPositive ? "Profit growth" : "Looking to improve"}
                      change={showValues ? profitGrowth : undefined}
                      currency={true}
                      icon={<AlertTriangle className="h-4 w-4 text-primary dark:text-blue-400" />}
                      className={!isProfitPositive ? "border-red-300 dark:border-red-700" : ""}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isProfitPositive ? 'Profit calculated as revenue minus cost price.' : 'Loss indicates negative profit for the period.'}</p>
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            </TooltipProvider>
          )}

          {isBranchesLoading ? (
            <Skeleton className="h-96 w-full rounded-xl" />
          ) : (
            salesByBranch.length > 0 && (
              <div className="mb-6">
                <div>
                  <h2 className="text-lg font-semibold mb-4 dark:text-white">
                    Sales by Branch ({timeRange === 'day' ? 'Today' : timeRange === 'week' ? 'This Week' : timeRange === 'month' ? 'This Month' : timeRange === 'year' ? 'This Year' : 'Custom Period'})
                  </h2>
                  <SalesByBranchChart 
                    data={salesByBranch} 
                  />
                </div>
              </div>
            )
          )}

          {(isSalesLoading || isProductsLoading) ? (
            <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "lg:grid-cols-2")}>
              <Skeleton className="h-64 w-full rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          ) : (
            hasData ? (
              <Accordion type="single" collapsible className="mb-6">
                {recentSales.length > 0 && (
                  <AccordionItem value="recent-sales">
                    <AccordionTrigger className="dark:text-white">
                      Recent Sales ({timeRange === 'day' ? 'Today' : timeRange === 'week' ? 'This Week' : timeRange === 'month' ? 'This Month' : timeRange === 'year' ? 'This Year' : 'Custom Period'})
                    </AccordionTrigger>
                    <AccordionContent>
                      <RecentSalesTable sales={recentSales} title="" />
                    </AccordionContent>
                  </AccordionItem>
                )}
                {topProducts.length > 0 && topProducts.some((p) => p.totalSold > 0) && (
                  <AccordionItem value="top-products">
                    <AccordionTrigger className="dark:text-white">
                      Top Products ({timeRange === 'day' ? 'Today' : timeRange === 'week' ? 'This Week' : timeRange === 'month' ? 'This Month' : timeRange === 'year' ? 'This Year' : 'Custom Period'})
                    </AccordionTrigger>
                    <AccordionContent>
                      <TopProductsTable products={topProducts} title="" />
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            ) : (
              <div className="text-center py-8 bg-card dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-2 dark:text-white">
                  No sales data available for this period
                </h3>
                <p className="text-muted-foreground dark:text-gray-300">
                  Start by adding products and making sales to see your dashboard come alive.
                </p>
              </div>
            )
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;