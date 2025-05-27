import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, Plus, Search, ArrowUpDown, Download } from 'lucide-react';
import { useBusiness } from '@/context/BusinessContext';
import { Sale, Product, Branch, Customer } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { debounce } from 'lodash';
import * as d3 from 'd3';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from 'react-error-boundary';

interface SaleFormData {
  product_id: string;
  branch_id: string;
  customer_id: string;
  quantity: string;
  total: string;
  date: string;
}

interface SummaryStats {
  totalSales: number;
  totalProfit: number;
  totalItems: number;
  count: number;
}

const Sales = () => {
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // State management
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportType, setExportType] = useState<'table' | 'chart'>('table');
  const [formData, setFormData] = useState<SaleFormData>({
    product_id: '',
    branch_id: '',
    customer_id: 'no-customer',
    quantity: '1',
    total: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Memoized data processing
  const debouncedSearch = useMemo(() => debounce((term: string) => setSearchTerm(term), 300), []);

  // Data fetching with error boundary
  const fetchAllData = useCallback(async () => {
    if (!currentBusiness) return;

    setIsLoading(true);
    try {
      const [
        { data: salesData, error: salesError },
        { data: productsData, error: productsError },
        { data: branchesData, error: branchesError },
        { data: customersData, error: customersError },
      ] = await Promise.all([
        supabase
          .from('sales')
          .select(`*, product:products(*), branch:branches(*), customer:customers(*)`)
          .eq('business_id', currentBusiness.id)
          .order('date', { ascending: false }),
        supabase
          .from('products')
          .select('*')
          .eq('business_id', currentBusiness.id)
          .eq('sold', false)
          .gt('quantity', 0),
        supabase
          .from('branches')
          .select('*')
          .eq('business_id', currentBusiness.id),
        supabase
          .from('customers')
          .select('*')
          .eq('business_id', currentBusiness.id),
      ]);

      if (salesError) throw new Error(`Sales: ${salesError.message}`);
      if (productsError) throw new Error(`Products: ${productsError.message}`);
      if (branchesError) throw new Error(`Branches: ${branchesError.message}`);
      if (customersError) throw new Error(`Customers: ${customersError.message}`);

      setSales(salesData || []);
      setProducts(productsData || []);
      setBranches(branchesData || []);
      setCustomers(customersData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load data',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentBusiness, toast]);

  useEffect(() => {
    if (currentBusiness) {
      fetchAllData();
    }
  }, [currentBusiness, fetchAllData]);

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.product_id) errors.product_id = 'Product is required';
    if (!formData.branch_id) errors.branch_id = 'Branch is required';
    if (!formData.quantity || Number(formData.quantity) <= 0) errors.quantity = 'Valid quantity is required';
    if (!formData.total || Number(formData.total) <= 0) errors.total = 'Valid total amount is required';
    if (!formData.date) errors.date = 'Date is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Auto-calculate total when product or quantity changes
  useEffect(() => {
    if (formData.product_id && formData.quantity) {
      const product = products.find(p => p.id === formData.product_id);
      if (product) {
        const total = product.price * Number(formData.quantity);
        setFormData(prev => ({ ...prev, total: total.toString() }));
      }
    }
  }, [formData.product_id, formData.quantity, products]);

  // Sorting functionality
  const sortedSales = useMemo(() => {
    let sortableSales = [...sales];
    if (sortConfig !== null) {
      sortableSales.sort((a, b) => {
        let aValue, bValue;

        if (sortConfig.key.includes('.')) {
          const keys = sortConfig.key.split('.');
          aValue = keys.reduce((obj, key) => obj?.[key], a);
          bValue = keys.reduce((obj, key) => obj?.[key], b);
        } else {
          aValue = a[sortConfig.key];
          bValue = b[sortConfig.key];
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableSales;
  }, [sales, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Add new sale with validation
  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentBusiness || !validateForm()) return;

    try {
      const product = products.find(p => p.id === formData.product_id);
      if (!product) throw new Error('Product not found');

      const saleQuantity = Number(formData.quantity);

      if (saleQuantity > product.quantity) {
        toast({
          variant: 'destructive',
          title: 'Insufficient quantity',
          description: `Only ${product.quantity} available in stock.`,
        });
        return;
      }

      const newSale = {
        product_id: formData.product_id,
        branch_id: formData.branch_id,
        customer_id: formData.customer_id === 'no-customer' ? null : formData.customer_id,
        quantity: saleQuantity,
        total: Number(formData.total),
        date: new Date(formData.date).toISOString(),
        business_id: currentBusiness.id,
      };

      const { error: saleError } = await supabase
        .from('sales')
        .insert([newSale]);

      if (saleError) throw saleError;

      const newQuantity = product.quantity - saleQuantity;

      if (newQuantity > 0) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ quantity: newQuantity })
          .eq('id', formData.product_id);

        if (updateError) throw updateError;
      } else {
        const { error: updateError } = await supabase
          .from('products')
          .update({
            quantity: 0,
            sold: true,
            sale_date: new Date().toISOString(),
          })
          .eq('id', formData.product_id);

        if (updateError) throw updateError;
      }

      toast({
        title: 'Sale added successfully',
        description: 'The sale has been recorded and the product inventory updated.',
      });

      setIsDialogOpen(false);
      fetchAllData();

      setFormData({
        product_id: '',
        branch_id: '',
        customer_id: 'no-customer',
        quantity: '1',
        total: '',
        date: format(new Date(), 'yyyy-MM-dd'),
      });
    } catch (error: any) {
      console.error('Error adding sale:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to add sale',
        description: error.message,
      });
    }
  };

  // Calculate profit
  const calculateProfit = (sale: Sale): number => {
    if (!sale.product) return 0;
    const costPrice = sale.product.cost_price * sale.quantity;
    return sale.total - costPrice;
  };

  // Filter sales based on search term
  const filteredSales = useMemo(() => {
    return sortedSales.filter(sale =>
      sale.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.branch?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.customer?.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.date.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sortedSales, searchTerm]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    return filteredSales.reduce(
      (acc, sale) => {
        const profit = calculateProfit(sale);
        return {
          totalSales: acc.totalSales + sale.total,
          totalProfit: acc.totalProfit + profit,
          totalItems: acc.totalItems + sale.quantity,
          count: acc.count + 1,
        };
      },
      { totalSales: 0, totalProfit: 0, totalItems: 0, count: 0 }
    );
  }, [filteredSales]);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Export functionality
  const exportSalesTableAsSVG = (): string => {
    const table = document.getElementById('sales-table');
    if (!table) return '';

    const tableClone = table.cloneNode(true) as HTMLElement;
    tableClone.style.width = '100%';
    tableClone.style.fontFamily = 'Arial, sans-serif';

    const svgWidth = Math.min(1200, tableClone.scrollWidth + 40);
    const svgHeight = Math.min(800, tableClone.scrollHeight + 40);

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" 
           width="${svgWidth}" 
           height="${svgHeight}"
           viewBox="0 0 ${svgWidth} ${svgHeight}">
        <style>
          .svg-table {
            border-collapse: collapse;
            width: 100%;
          }
          .svg-table th, .svg-table td {
            border: 1px solid #ddd;
            padding: 8px;
          }
          .svg-table tr:nth-child(even) {
            background-color: #f2f2f2;
          }
          .svg-table th {
            background-color: #4f46e5;
            color: white;
          }
        </style>
        <foreignObject width="100%" height="100%">
          ${tableClone.outerHTML}
        </foreignObject>
      </svg>
    `;

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };

  const exportSalesChartAsSVG = (): string => {
    const topSales = [...filteredSales]
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    if (topSales.length === 0) return '';

    const svgWidth = 800;
    const svgHeight = 400;
    const margin = { top: 20, right: 30, bottom: 60, left: 60 };
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    const maxTotal = Math.max(...topSales.map(s => s.total));
    const xScale = d3.scaleBand()
      .domain(topSales.map((_, i) => i.toString()))
      .range([0, width])
      .padding(0.2);

    const yScale = d3.scaleLinear()
      .domain([0, maxTotal * 1.1])
      .range([height, 0]);

    let svgString = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">`;
    svgString += `<rect width="100%" height="100%" fill="#ffffff"/>`;
    svgString += `<g transform="translate(${margin.left},${margin.top})">`;

    // Add bars
    topSales.forEach((sale, i) => {
      const barHeight = height - yScale(sale.total);
      const x = xScale(i.toString()) || 0;
      const y = yScale(sale.total);

      svgString += `<rect x="${x}" y="${y}" width="${xScale.bandwidth()}" 
                   height="${barHeight}" fill="#4f46e5" rx="2"/>`;

      // Add value labels
      svgString += `<text x="${x + xScale.bandwidth() / 2}" y="${y - 5}" 
                    font-size="12" text-anchor="middle" fill="#333">${formatCurrency(sale.total)}</text>`;
    });

    // Add x-axis
    svgString += `<g transform="translate(0,${height})">`;
    svgString += `<line x1="0" x2="${width}" stroke="#ccc" stroke-width="1"/>`;
    topSales.forEach((sale, i) => {
      const x = (xScale(i.toString()) || 0) + xScale.bandwidth() / 2;
      svgString += `<text x="${x}" y="30" font-size="10" text-anchor="middle" transform="rotate(45 ${x},30)">${sale.product?.name.substring(0, 15)}</text>`;
    });
    svgString += `</g>`;

    // Add y-axis
    svgString += `<g>`;
    svgString += `<line x1="0" x2="0" y1="0" y2="${height}" stroke="#ccc" stroke-width="1"/>`;
    const yTicks = yScale.ticks(5);
    yTicks.forEach(tick => {
      const y = yScale(tick);
      svgString += `<text x="-10" y="${y}" font-size="10" text-anchor="end" dy=".32em">${formatCurrency(tick)}</text>`;
      svgString += `<line x1="0" x2="${width}" y1="${y}" y2="${y}" stroke="#f0f0f0" stroke-width="1"/>`;
    });
    svgString += `</g>`;

    // Add chart title
    svgString += `<text x="${width / 2}" y="-10" font-size="14" text-anchor="middle">Top Sales by Revenue</text>`;

    svgString += `</g></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let dataUrl = '';

      if (exportType === 'table') {
        dataUrl = exportSalesTableAsSVG();
      } else {
        dataUrl = exportSalesChartAsSVG();
      }

      if (!dataUrl) {
        throw new Error('Failed to generate export data');
      }

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `sales-export-${format(new Date(), 'yyyy-MM-dd')}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Export successful',
        description: 'Your sales data has been exported.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: 'There was an error exporting your data.',
      });
    } finally {
      setIsExporting(false);
      setExportDialogOpen(false);
    }
  };

  // Error boundary fallback
  const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
    <div className="p-4 bg-red-100 border border-red-400 rounded-md">
      <h3 className="font-bold text-red-700">Something went wrong:</h3>
      <p className="text-red-600 mb-4">{error.message}</p>
      <Button variant="destructive" onClick={resetErrorBoundary}>Try again</Button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <DashboardHeader
          businessName={currentBusiness?.name || ''}
          userBusinesses={[]}
          onBusinessChange={() => {}}
        />

        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sticky top-0 z-10 bg-gray-50 py-2">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Sales</h1>

            <div className="flex gap-2">
              <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={filteredSales.length === 0}
                    className="border-gray-300 text-gray-700 hover:bg-gray-100 rounded-full"
                    aria-label="Export sales data"
                  >
                    <Download className="mr-2 h-5 w-5" /> Export
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] rounded-lg">
                  <DialogHeader>
                    <DialogTitle>Export Sales Data</DialogTitle>
                    <DialogDescription>Choose how you want to export your sales data</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="export-table"
                        name="exportType"
                        value="table"
                        checked={exportType === 'table'}
                        onChange={() => setExportType('table')}
                        className="h-4 w-4 text-blue-600"
                      />
                      <Label htmlFor="export-table" className="text-base">Export as Table</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="export-chart"
                        name="exportType"
                        value="chart"
                        checked={exportType === 'chart'}
                        onChange={() => setExportType('chart')}
                        className="h-4 w-4 text-blue-600"
                      />
                      <Label htmlFor="export-chart" className="text-base">Export as Chart</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setExportDialogOpen(false)}
                      className="rounded-full"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleExport}
                      disabled={isExporting}
                      className="bg-blue-600 hover:bg-blue-700 rounded-full"
                    >
                      {isExporting ? 'Exporting...' : 'Export'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-2 shadow-md"
                    aria-label="Add new sale"
                  >
                    <Plus className="mr-2 h-5 w-5" /> Add New Sale
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[475px] rounded-lg">
                  <DialogHeader>
                    <DialogTitle className="text-lg">Add New Sale</DialogTitle>
                    <DialogDescription>Record a new sale for your business</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddSale}>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="product">Product</Label>
                        <Select
                          value={formData.product_id}
                          onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                          required
                        >
                          <SelectTrigger id="product" className="text-base">
                            <SelectValue placeholder="Select a product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.length === 0 ? (
                              <SelectItem value="no-products" disabled>
                                No available products
                              </SelectItem>
                            ) : (
                              products.map(product => (
                                <SelectItem key={product.id} value={product.id} className="text-base">
                                  {product.name} - {formatCurrency(product.price)} (Qty: {product.quantity})
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        {formErrors.product_id && (
                          <p className="text-sm text-red-500">{formErrors.product_id}</p>
                        )}
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="branch">Branch</Label>
                        <Select
                          value={formData.branch_id}
                          onValueChange={(value) => setFormData({ ...formData, branch_id: value })}
                          required
                        >
                          <SelectTrigger id="branch" className="text-base">
                            <SelectValue placeholder="Select a branch" />
                          </SelectTrigger>
                          <SelectContent>
                            {branches.map(branch => (
                              <SelectItem key={branch.id} value={branch.id} className="text-base">
                                {branch.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {formErrors.branch_id && (
                          <p className="text-sm text-red-500">{formErrors.branch_id}</p>
                        )}
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="customer">Customer (Optional)</Label>
                        <Select
                          value={formData.customer_id}
                          onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                        >
                          <SelectTrigger id="customer" className="text-base">
                            <SelectValue placeholder="Select a customer" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no-customer" className="text-base">
                              Walk-in Customer
                            </SelectItem>
                            {customers.map(customer => (
                              <SelectItem key={customer.id} value={customer.id} className="text-base">
                                {customer.name} {customer.type && `(${customer.type})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="quantity">Quantity</Label>
                          <Input
                            id="quantity"
                            type="number"
                            min="1"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                            required
                            className="text-base"
                          />
                          {formErrors.quantity && (
                            <p className="text-sm text-red-500">{formErrors.quantity}</p>
                          )}
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="total">Total Price (UGX)</Label>
                          <Input
                            id="total"
                            type="number"
                            step="100"
                            value={formData.total}
                            onChange={(e) => setFormData({ ...formData, total: e.target.value })}
                            required
                            className="text-base"
                          />
                          {formErrors.total && (
                            <p className="text-sm text-red-500">{formErrors.total}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="date">Sale Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          required
                          className="text-base"
                        />
                        {formErrors.date && (
                          <p className="text-sm text-red-500">{formErrors.date}</p>
                        )}
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 rounded-full"
                      >
                        Add Sale
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
            <Input
              placeholder="Search sales..."
              defaultValue={searchTerm}
              onChange={(e) => debouncedSearch(e.target.value)}
              className="pl-10 w-full md:w-[400px] rounded-full border-gray-300 shadow-sm text-base"
            />
          </div>

          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="pb-2">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <CardTitle className="text-lg md:text-xl text-gray-900">All Sales</CardTitle>
                  {filteredSales.length > 0 && (
                    <div className="text-sm text-gray-600">
                      Showing {filteredSales.length} sales • {summaryStats.count} transactions •
                      Total: {formatCurrency(summaryStats.totalSales)} •
                      Profit: {formatCurrency(summaryStats.totalProfit)}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2" />
                    <span className="text-gray-600">Loading sales...</span>
                  </div>
                ) : (
                  isMobile ? (
                    // Mobile Card Layout
                    <div className="space-y-1.5 p-3">
                      {filteredSales.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-gray-600">
                          {searchTerm ? (
                            <>
                              <Search className="h-12 w-12 text-gray-400 mb-2" />
                              <p>No matching sales found</p>
                              <Button
                                variant="ghost"
                                onClick={() => setSearchTerm('')}
                                className="text-blue-600"
                              >
                                Clear search
                              </Button>
                            </>
                          ) : (
                            <>
                              <svg
                                className="h-12 w-12 text-gray-400 mb-2"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 3h18M3 3v18M3 3l18 18"
                                />
                              </svg>
                              <p>No sales recorded yet</p>
                              <Button
                                onClick={() => setIsDialogOpen(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full mt-2"
                              >
                                <Plus className="mr-2 h-5 w-5" /> Add your first sale
                              </Button>
                            </>
                          )}
                        </div>
                      ) : (
                        filteredSales.map((sale) => {
                          const profit = calculateProfit(sale);
                          const isProfitable = profit >= 0;

                          return (
                            <div
                              key={sale.id}
                              className="p-3 bg-white rounded-lg shadow-sm border border-gray-200 transition-all duration-200 hover:shadow-md"
                            >
                              <div className="space-y-0.5">
                                <div className="flex justify-between items-center">
                                  <h3 className="text-base font-semibold text-gray-900 truncate max-w-[60%]">
                                    {sale.product?.name || 'Unknown'}
                                  </h3>
                                  <span
                                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                                      isProfitable
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                    }`}
                                  >
                                    {isProfitable ? '+' : ''}{formatCurrency(profit)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <span>{format(new Date(sale.date), 'MMM dd, yyyy')}</span>
                                  <span>•</span>
                                  <span>{sale.branch?.name || 'Unknown'}</span>
                                  <span>•</span>
                                  <span className="truncate max-w-[30%]">
                                    {sale.customer ? `${sale.customer.name}${sale.customer.type ? ` (${sale.customer.type})` : ''}` : 'Walk-in'}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-500">Qty: {sale.quantity}</span>
                                  <span className="text-base font-medium text-gray-900">
                                    {formatCurrency(sale.total)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : (
                    // Desktop Table Layout
                    <div className="w-full overflow-x-auto">
                      <Table id="sales-table">
                        <TableHeader>
                          <TableRow>
                            <TableHead
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => requestSort('date')}
                            >
                              <div className="flex items-center">
                                Date
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                              </div>
                            </TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => requestSort('branch.name')}
                            >
                              <div className="flex items-center">
                                Branch
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                              </div>
                            </TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead className="text-center">Qty</TableHead>
                            <TableHead
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => requestSort('total')}
                            >
                              <div className="flex items-center">
                                Total
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                              </div>
                            </TableHead>
                            <TableHead className="text-right">Profit/Loss</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSales.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-10">
                                {searchTerm ? (
                                  <div className="flex flex-col items-center gap-2">
                                    <Search className="h-8 w-8 text-gray-400" />
                                    <p>No matching sales found</p>
                                    <Button
                                      variant="ghost"
                                      onClick={() => setSearchTerm('')}
                                      className="text-blue-600"
                                    >
                                      Clear search
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-2">
                                    <svg
                                      className="h-12 w-12 text-gray-400 mb-2"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      aria-hidden="true"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 3h18M3 3v18M3 3l18 18"
                                      />
                                    </svg>
                                    <p>No sales recorded yet</p>
                                    <Button
                                      onClick={() => setIsDialogOpen(true)}
                                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-full"
                                    >
                                      <Plus className="mr-2 h-5 w-5" /> Add your first sale
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredSales.map((sale) => {
                              const profit = calculateProfit(sale);
                              const isProfitable = profit >= 0;

                              return (
                                <TableRow key={sale.id} className="hover:bg-muted/50">
                                  <TableCell>{format(new Date(sale.date), 'MMM dd, yyyy')}</TableCell>
                                  <TableCell className="font-medium">
                                    {sale.product?.name || 'Unknown'}
                                  </TableCell>
                                  <TableCell>{sale.branch?.name || 'Unknown'}</TableCell>
                                  <TableCell>
                                    {sale.customer ? (
                                      <>
                                        {sale.customer.name}
                                        {sale.customer.type && (
                                          <span className="text-xs text-muted-foreground ml-2">
                                            ({sale.customer.type})
                                          </span>
                                        )}
                                      </>
                                    ) : 'Walk-in'}
                                  </TableCell>
                                  <TableCell className="text-center">{sale.quantity}</TableCell>
                                  <TableCell>{formatCurrency(sale.total)}</TableCell>
                                  <TableCell
                                    className={`text-right font-medium ${
                                      isProfitable ? 'text-green-600' : 'text-red-600'
                                    }`}
                                  >
                                    {isProfitable ? '+' : ''}{formatCurrency(profit)}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default Sales;