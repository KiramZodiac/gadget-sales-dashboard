
import React, { useState, useEffect } from 'react';
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
  TableRow
} from '@/components/ui/table';
import { ChevronDown, Plus, Search } from 'lucide-react';
import { useBusiness } from '@/context/BusinessContext';
import { Sale } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

const Sales = () => {
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    if (currentBusiness) {
      fetchSales();
    }
  }, [currentBusiness]);
  
  const fetchSales = async () => {
    if (!currentBusiness) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          product:products(*),
          branch:branches(*),
          customer:customers(*)
        `)
        .eq('business_id', currentBusiness.id)
        .order('date', { ascending: false });
        
      if (error) throw error;
      setSales(data || []);
    } catch (error: any) {
      console.error('Error fetching sales:', error);
      toast({
        variant: "destructive",
        title: "Failed to load sales",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Calculate profit on each sale
  const calculateProfit = (sale: Sale) => {
    if (!sale.product) return 0;
    const costPrice = sale.product.cost_price * sale.quantity;
    return sale.total - costPrice;
  };
  
  // Filter sales based on search term
  const filteredSales = sales.filter(sale => 
    sale.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.branch?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <DashboardHeader 
          businessName={currentBusiness?.name || ""}
        />
        
        <main className="flex-1 p-6 bg-muted/20">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Sales</h1>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add New Sale
            </Button>
          </div>
          
          <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search sales..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full md:w-[400px]"
            />
          </div>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>All Sales</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  Loading sales data...
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="text-right">Profit/Loss</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10">
                          No sales found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSales.map((sale) => {
                        const profit = calculateProfit(sale);
                        const isProfitable = profit >= 0;
                        
                        return (
                          <TableRow key={sale.id}>
                            <TableCell>
                              {new Date(sale.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-medium">{sale.product?.name || 'Unknown'}</TableCell>
                            <TableCell>{sale.branch?.name || 'Unknown'}</TableCell>
                            <TableCell>{sale.customer?.name || 'Walk-in'}</TableCell>
                            <TableCell>{sale.quantity}</TableCell>
                            <TableCell>${sale.total.toFixed(2)}</TableCell>
                            <TableCell className={`text-right font-medium ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                              {isProfitable ? '+' : ''}{profit.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Sales;
