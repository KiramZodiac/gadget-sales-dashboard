
export interface User {
  id: string;
  email: string;
}

export interface Business {
  id: string;
  name: string;
  owner_id: string;
}

export interface Branch {
  id: string;
  name: string;
  business_id: string;
  location?: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  cost_price: number;
  business_id: string;
  image_url?: string;
  quantity: number;
  sold?: boolean;
  sale_date?: string;
  available_quantity?: number; 
}

export interface BranchProduct {
  id: string;
  branch_id: string;
  product_id: string;
  quantity: number;
  business_id: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  business_id: string;
  email?: string;
}

export interface Sale {
  id: string;
  product_id: string;
  branch_id: string;
  customer_id?: string;
  quantity: number;
  total: number;
  date: string;
  business_id: string;
  product?: Product;
  branch?: Branch;
  customer?: Customer;
}

export interface SalesSummary {
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
}

export interface DashboardStats {
  todayRevenue: number;
  monthlyRevenue: number;
  todaySales: number;
  monthlySales: number;
  lowStockProducts: number;
}

export interface TopProduct {
  id: string;
  name: string;
  brand: string;
  totalSold: number;
  totalRevenue: number;
}

export interface SalesByBranch {
  branch: string;
  sales: number;
  revenue: number;
}
