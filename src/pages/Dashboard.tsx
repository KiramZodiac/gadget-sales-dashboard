'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { debounce } from 'lodash';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
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
import { ChartBar, Calendar, Wallet, AlertTriangle, EyeOff, Eye, Menu, Sun, Moon, X } from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

type TimeRange = 'day' | 'week' | 'month' | 'year' | 'custom';

// Memoize frequently used components
const MemoizedStatCard = React.memo(StatCard);
const MemoizedSalesByBranchChart = React.memo(SalesByBranchChart);
const MemoizedRecentSalesTable = React.memo(RecentSalesTable);
const MemoizedTopProductsTable = React.memo(TopProductsTable);

const Dashboard = () => {
  const { currentBusiness, setCurrentBusiness, businesses } = useBusiness();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [salesByBranch, setSalesByBranch] = useState<SalesByBranch[]>([]);
  const [lowStockDetails, setLowStockDetails] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
    typeof window !== 'undefined' ? (localStorage.getItem('theme') as 'light' | 'dark') || 'light' : 'light'
  );
  const [showFirstSaleDialog, setShowFirstSaleDialog] = useState(false);
  const [showLowStockBadge, setShowLowStockBadge] = useState(true);

  // Persist theme in localStorage and apply to document
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  // Automatically open sidebar on scroll in mobile view
  useEffect(() => {
    if (!isMobile) return;

    const handleScroll = debounce(() => {
      if (window.scrollY > 50 && !isSidebarOpen) {
        setIsSidebarOpen(true);
      }
    }, 100);

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile, isSidebarOpen]);

  // Calculate date ranges based on selected time period
  const { getDateRange, getPreviousDateRange, formattedDateRange } = useMemo(() => {
    const now = new Date();
    let startDate = new Date(now);

    // Current period calculation
    let currentStart = new Date(now);
    if (timeRange === 'custom' && customDateRange && customDateRange.start && customDateRange.end) {
      if (customDateRange.end < customDateRange.start) {
        toast({
          variant: 'destructive',
          title: 'Invalid Date Range',
          description: 'End date cannot be before start date.',
        });
        currentStart = new Date();
      } else {
        currentStart = customDateRange.start;
      }
    } else {
      switch (timeRange) {
        case 'day':
          currentStart.setHours(0, 0, 0, 0);
          break;
        case 'week':
          currentStart.setDate(currentStart.getDate() - 7);
          currentStart.setHours(0, 0, 0, 0);
          break;
        case 'month':
          currentStart.setMonth(currentStart.getMonth() - 1);
          currentStart.setHours(0, 0, 0, 0);
          break;
        case 'year':
          currentStart.setFullYear(currentStart.getFullYear() - 1);
          currentStart.setHours(0, 0, 0, 0);
          break;
      }
    }

    const currentEnd = timeRange === 'custom' && customDateRange?.end ? customDateRange.end : now;

    // Previous period calculation
    const previousEnd = new Date(currentStart.getTime() - 1);
    const previousStart = new Date(previousEnd);

    switch (timeRange) {
      case 'day':
        previousStart.setDate(previousStart.getDate() - 1);
        previousStart.setHours(0, 0, 0, 0);
        break;
      case 'week':
        previousStart.setDate(previousStart.getDate() - 7);
        previousStart.setHours(0, 0, 0, 0);
        break;
      case 'month':
        previousStart.setMonth(previousStart.getMonth() - 1);
        previousStart.setHours(0, 0, 0, 0);
        break;
      case 'year':
        previousStart.setFullYear(previousStart.getFullYear() - 1);
        previousStart.setHours(0, 0, 0, 0);
        break;
      case 'custom':
        if (!customDateRange) break;
        const duration = customDateRange.end.getTime() - customDateRange.start.getTime();
        previousStart.setTime(customDateRange.start.getTime() - duration);
        break;
    }

    // Format date range for display
    const formatOptions: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric',
      ...(timeRange === 'year' && { year: 'numeric' })
    };

    const formattedRange = `${currentStart.toLocaleDateString(undefined, formatOptions)} - ${currentEnd.toLocaleDateString(undefined, formatOptions)}`;

    return {
      getDateRange: { start: currentStart, end: currentEnd },
      getPreviousDateRange: { start: previousStart, end: previousEnd },
      formattedDateRange: formattedRange
    };
  }, [timeRange, customDateRange, toast]);

  const fetchDashboardData = useCallback(async () => {
    if (!currentBusiness || (timeRange === 'custom' && (!customDateRange?.start || !customDateRange?.end))) return;

    setIsLoading(true);
    try {
      const businessId = currentBusiness.id;
      
      // Parallel fetch for all required data
      const [
        businessDataPromise,
        allTimeSalesPromise,
        salesDataPromise,
        productDataPromise,
        recentSalesDataPromise,
        lowStockDataPromise,
        branchesDataPromise,
        prevSalesDataPromise
      ] = await Promise.all([
        supabase.from('businesses').select('has_first_sale, highest_profit_milestone').eq('id', businessId).single(),
        supabase.from('sales').select('*').eq('business_id', businessId),
        supabase.from('sales').select('*').eq('business_id', businessId)
          .gte('date', getDateRange.start.toISOString())
          .lte('date', getDateRange.end.toISOString()),
        supabase.from('products').select('*').eq('business_id', businessId),
        supabase.from('sales').select('*, product:products(*), branch:branches(*), customer:customers(*)')
          .eq('business_id', businessId)
          .gte('date', getDateRange.start.toISOString())
          .lte('date', getDateRange.end.toISOString())
          .order('date', { ascending: false })
          .limit(10),
        supabase.from('products').select('*, available_quantity', { count: 'exact' })
          .eq('business_id', businessId)
          .lt('quantity', 2),
        supabase.from('branches').select('*').eq('business_id', businessId),
        supabase.from('sales').select('*').eq('business_id', businessId)
          .gte('date', getPreviousDateRange.start.toISOString())
          .lte('date', getPreviousDateRange.end.toISOString())
      ]);

      // Destructure all promises
      const [
        { data: businessData, error: businessError },
        { data: allTimeSales, error: allTimeSalesError },
        { data: salesData, error: salesError },
        { data: productData, error: productError },
        { data: recentSalesData, error: recentError },
        { data: branchProductsData, count: lowStockCount, error: lowStockError },
        { data: branchesData, error: branchesError },
        { data: prevSalesData, error: prevSalesError }
      ] = await Promise.all([
        businessDataPromise,
        allTimeSalesPromise,
        salesDataPromise,
        productDataPromise,
        recentSalesDataPromise,
        lowStockDataPromise,
        branchesDataPromise,
        prevSalesDataPromise
      ]);

      // Error handling
      if (businessError) throw new Error(`Error fetching business data: ${businessError.message}`);
      if (allTimeSalesError) throw new Error(`Error fetching all-time sales: ${allTimeSalesError.message}`);
      if (salesError) throw new Error(`Error fetching sales: ${salesError.message}`);
      if (productError) throw new Error(`Error fetching products: ${productError.message}`);
      if (recentError) throw new Error(`Error fetching recent sales: ${recentError.message}`);
      if (lowStockError) throw new Error(`Error fetching low stock items: ${lowStockError.message}`);
      if (branchesError) throw new Error(`Error fetching branches: ${branchesError.message}`);
      if (prevSalesError) throw new Error(`Error fetching previous period sales: ${prevSalesError.message}`);
      if (!salesData || !productData || !recentSalesData || !branchesData) {
        throw new Error('Incomplete data received from server');
      }

      // Check for first sale
      if (allTimeSales?.length === 1 && salesData.length > 0 && !businessData?.has_first_sale) {
        setShowFirstSaleDialog(true);
        const { error: updateError } = await supabase
          .from('businesses')
          .update({ has_first_sale: true })
          .eq('id', businessId);

        if (updateError) {
          toast({
            variant: 'destructive',
            title: 'Error updating business',
            description: updateError.message,
          });
        }
      }

      // Process sales data
      const salesCount = salesData.length;
      const revenue = salesData.reduce((sum, sale) => sum + sale.total, 0);
      
      // Calculate profit
      let periodProfitTotal = 0;
      const missingProducts: string[] = [];
      const productMap = new Map(productData.map(p => [p.id, p]));
      
      for (const sale of salesData) {
        const product = productMap.get(sale.product_id);
        if (product) {
          periodProfitTotal += sale.total - (sale.quantity * product.cost_price);
        } else {
          missingProducts.push(sale.product_id);
        }
      }

      if (missingProducts.length > 0) {
        toast({
          variant: 'destructive',
          title: 'Data Issue',
          description: `Missing product data for ${missingProducts.length} sale(s). Profit calculations may be incomplete.`,
        });
      }

      // Calculate previous period profit
      let prevPeriodProfit = 0;
      for (const sale of prevSalesData || []) {
        const product = productMap.get(sale.product_id);
        if (product) {
          prevPeriodProfit += sale.total - (sale.quantity * product.cost_price);
        }
      }

      // Calculate profit growth
      let profitGrowthValue = 0;
      if (prevPeriodProfit === 0) {
        profitGrowthValue = periodProfitTotal > 0 ? 100 : (periodProfitTotal < 0 ? -100 : 0);
      } else {
        profitGrowthValue = ((periodProfitTotal - prevPeriodProfit) / Math.abs(prevPeriodProfit)) * 100;
      }

      // Calculate all-time profit for milestone check
      let totalProfit = 0;
      for (const sale of allTimeSales || []) {
        const product = productMap.get(sale.product_id);
        if (product) {
          totalProfit += sale.total - (sale.quantity * product.cost_price);
        }
      }

      // Check for profit milestone
      if (totalProfit >= 500000) {
        const milestoneInterval = 500000;
        const currentMilestone = Math.floor(totalProfit / milestoneInterval) * milestoneInterval;
        const previousMilestone = businessData?.highest_profit_milestone || 0;

        if (currentMilestone > previousMilestone) {
          toast({
            title: '🎉 Profit Milestone Achieved!',
            description: `Your business has reached a total profit of UGX ${currentMilestone.toLocaleString('en-UG', { style: 'currency', currency: 'UGX' })}! Amazing work!`,
            className: 'bg-green-50 dark:bg-green-900/50 border-green-400 dark:border-green-600',
          });

          // Update highest profit milestone in Supabase
          const { error: updateError } = await supabase
            .from('businesses')
            .update({ highest_profit_milestone: currentMilestone })
            .eq('id', businessId);

          if (updateError) {
            toast({
              variant: 'destructive',
              title: 'Error updating milestone',
              description: updateError.message,
            });
          }
        }
      }

      // Process top products
      const productSalesMap = new Map<string, { totalSold: number; totalRevenue: number }>();
      for (const sale of salesData) {
        if (!productSalesMap.has(sale.product_id)) {
          productSalesMap.set(sale.product_id, { totalSold: 0, totalRevenue: 0 });
        }
        const productSales = productSalesMap.get(sale.product_id)!;
        productSales.totalSold += sale.quantity;
        productSales.totalRevenue += sale.total;
      }

      const topProductsList = Array.from(productSalesMap.entries())
        .map(([id, sales]) => {
          const product = productMap.get(id);
          return product ? {
            id,
            name: product.name,
            brand: product.brand,
            totalSold: sales.totalSold,
            totalRevenue: sales.totalRevenue
          } : null;
        })
        .filter((p): p is TopProduct => p !== null && p.totalSold > 0)
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 5);

      // Process branch sales
      const branchSales = branchesData.map(branch => ({
        branch: branch.name,
        sales: salesData.filter(sale => sale.branch_id === branch.id).length,
        revenue: salesData.filter(sale => sale.branch_id === branch.id).reduce((sum, s) => sum + s.total, 0),
      }));

      // Update state in one batch
      setRecentSales(recentSalesData || []);
      setTodaySales(salesCount);
      setRevenueToday(revenue);
      setMonthlyRevenue(revenue);
      setMonthlyProfit(periodProfitTotal);
      setProfitGrowth(Number(profitGrowthValue.toFixed(1)));
      setTopProducts(topProductsList);
      setLowStockItems(lowStockCount || 0);
      setLowStockDetails(branchProductsData || []);
      setSalesByBranch(branchSales);

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading dashboard',
        description: error.message || 'An unknown error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentBusiness, timeRange, customDateRange, getDateRange, getPreviousDateRange, toast]);

  // Debounce and memoize the fetch function
  const debouncedFetchDashboardData = useMemo(
    () => debounce(fetchDashboardData, 300),
    [fetchDashboardData]
  );

  useEffect(() => {
    if (!currentBusiness) return;
    if (timeRange === 'custom' && (!customDateRange || !customDateRange.start || !customDateRange.end)) {
      return;
    }
    debouncedFetchDashboardData();
    return () => debouncedFetchDashboardData.cancel();
  }, [currentBusiness, timeRange, customDateRange, debouncedFetchDashboardData]);

  // Memoize derived values
  const isProfitPositive = useMemo(() => monthlyProfit >= 0, [monthlyProfit]);
  const hasData = useMemo(() => 
    recentSales.length > 0 || 
    (topProducts.length > 0 && topProducts.some(p => p.totalSold > 0)) || 
    salesByBranch.length > 0,
    [recentSales, topProducts, salesByBranch]
  );

  if (!currentBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 dark:bg-gray-800 p-4">
        <BusinessSetup onBusinessCreated={(id, name) => setCurrentBusiness({ id, name })} />
      </div>
    );
  }

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
          <AnimatePresence>
            {showFirstSaleDialog && (
              <Dialog open={showFirstSaleDialog} onOpenChange={setShowFirstSaleDialog}>
                <DialogContent className="sm:max-w-[425px] bg-gradient-to-br from-blue-500 to-purple-500 dark:from-blue-700 dark:to-purple-700 text-white rounded-lg overflow-hidden">
                  <Confetti
                    width={typeof window !== 'undefined' ? window.innerWidth : 0}
                    height={typeof window !== 'undefined' ? window.innerHeight : 0}
                    recycle={false}
                    numberOfPieces={200}
                    gravity={0.2}
                    className="absolute inset-0"
                  />
                  <DialogHeader className="relative z-10">
                    <DialogTitle className="text-2xl font-bold text-center">
                      🎉 Congratulations on Your First Sale! 🎉
                    </DialogTitle>
                    <DialogDescription className="text-center text-white/90">
                      You've just made your first sale with {currentBusiness.name}! This is the start of something amazing. Keep it up, and watch your business soar!
                    </DialogDescription>
                  </DialogHeader>
                  <motion.div
                    className="flex justify-center mt-4"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  >
                    <Button
                      onClick={() => setShowFirstSaleDialog(false)}
                      className="bg-white text-blue-600 hover:bg-blue-100 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-gray-700"
                    >
                      Let's Keep Going!
                    </Button>
                  </motion.div>
                </DialogContent>
              </Dialog>
            )}
          </AnimatePresence>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4 relative">
            <div className="flex items-center gap-2">
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  aria-label="Toggle sidebar"
                  className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              )}
              <h1 className={cn("font-bold", isMobile ? "text-2xl" : "text-3xl", "dark:text-white")}>
                Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-2 justify-end">
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
                <div className="flex flex-col gap-1">
                  <label htmlFor="date-range-picker" className="text-sm font-medium dark:text-white">
                    Select Date Range
                  </label>
                  <DatePicker
                    id="date-range-picker"
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
                    minDate={new Date(2000, 0, 1)}
                    maxDate={new Date()}
                    aria-describedby="date-range-help"
                  />
                  <span id="date-range-help" className="text-sm text-muted-foreground dark:text-gray-300">
                    Choose a start and end date to filter dashboard data.
                  </span>
                </div>
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
            <motion.div
              className="mb-4 w-full bg-blue-50 dark:bg-blue-900/50 border border-blue-400 dark:border-blue-600 p-4 rounded-lg shadow"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-blue-800 dark:text-blue-200 font-semibold">
                Select Start and End Dates
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Please choose both dates to view your dashboard data.
              </p>
            </motion.div>
          )}

          {isLoading ? (
            <Skeleton className="h-16 w-full rounded-xl mb-4" />
          ) : (
            showLowStockBadge && lowStockItems > 0 && (
              <div className="mb-4 w-full relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowLowStockBadge(false)}
                  aria-label="Hide low stock badge"
                  className="absolute top-2 right-2 h-6 w-6 text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
                >
                  <X className="h-4 w-4" />
                </Button>
                <Link
                  to="/lowstock"
                  className="flex items-start gap-3 bg-yellow-50 dark:bg-yellow-900/50 border border-yellow-400 dark:border-yellow-600 p-4 rounded-lg shadow hover:bg-yellow-100 dark:hover:bg-yellow-900 transition"
                >
                  <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 animate-bounce" />
                  <div className="flex-1">
                    <p className="text-yellow-800 dark:text-yellow-200 font-semibold">
                      {lowStockItems} item{lowStockItems > 1 ? "s are" : " is"} low in stock
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Click to review inventory
                    </p>
                    {lowStockDetails.slice(0, 3).map(item => (
                      <div key={item.id} className="mt-2">
                        <p className="text-sm dark:text-white">{item.name}</p>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                          <div
                            className="bg-yellow-600 dark:bg-yellow-400 h-2.5 rounded-full"
                            role="progressbar"
                            aria-valuenow={item.available_quantity > 0 ? (item.quantity / item.available_quantity) * 100 : 0}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            style={{
                              width: item.available_quantity > 0
                                ? `${Math.min((item.quantity / item.available_quantity) * 100, 100)}%`
                                : '0%',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    {lowStockDetails.length > 3 && (
                      <Link to="/lowstock" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                        View all {lowStockDetails.length} low stock items
                      </Link>
                    )}
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

          {isLoading ? (
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
                    <MemoizedStatCard
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
                    <MemoizedStatCard
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
                    <MemoizedStatCard
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
                    <MemoizedStatCard
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

          {isLoading ? (
            <Skeleton className="h-96 w-full rounded-xl" />
          ) : (
            salesByBranch.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-4 dark:text-white">
                  Sales by Branch ({timeRange === 'day' ? 'Today' : timeRange === 'week' ? 'This Week' : timeRange === 'month' ? 'This Month' : timeRange === 'year' ? 'This Year' : 'Custom Period'})
                </h2>
                <MemoizedSalesByBranchChart data={salesByBranch} />
              </div>
            )
          )}

          {isLoading ? (
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
                      <MemoizedRecentSalesTable sales={recentSales} title="" />
                    </AccordionContent>
                  </AccordionItem>
                )}
                {topProducts.length > 0 && topProducts.some((p) => p.totalSold > 0) && (
                  <AccordionItem value="top-products">
                    <AccordionTrigger className="dark:text-white">
                      Top Products ({timeRange === 'day' ? 'Today' : timeRange === 'week' ? 'This Week' : timeRange === 'month' ? 'This Month' : timeRange === 'year' ? 'This Year' : 'Custom Period'})
                    </AccordionTrigger>
                    <AccordionContent>
                      <MemoizedTopProductsTable products={topProducts} title="" />
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