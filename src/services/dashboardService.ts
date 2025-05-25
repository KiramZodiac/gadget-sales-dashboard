// services/dashboardService.ts

import { prisma } from "@/lib/prisma";

export const getTotalRevenue = async (): Promise<number> => {
  const paidOrders = await prisma.order.findMany({
    where: { isPaid: true },
    select: { orderItems: { select: { product: { select: { price: true } } } } },
  });

  return paidOrders.reduce((total, order) => {
    const orderTotal = order.orderItems.reduce((sum, item) => {
      return sum + item.product.price.toNumber();
    }, 0);
    return total + orderTotal;
  }, 0);
};

export const getSalesCount = async (): Promise<number> => {
  return await prisma.order.count({ where: { isPaid: true } });
};

export const getStockCount = async (): Promise<number> => {
  return await prisma.product.count({ where: { isArchived: false } });
};

export const getGraphRevenue = async (): Promise<
  { name: string; total: number }[]
> => {
  const paidOrders = await prisma.order.findMany({
    where: { isPaid: true },
    include: { orderItems: { include: { product: true } } },
  });

  const monthlyRevenue: { [key: number]: number } = {};
  for (const order of paidOrders) {
    const month = order.createdAt.getMonth();
    let revenueForOrder = 0;

    for (const item of order.orderItems) {
      revenueForOrder += item.product.price.toNumber();
    }

    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + revenueForOrder;
  }

  return Array.from({ length: 12 }, (_, i) => ({
    name: new Date(0, i).toLocaleString("default", { month: "short" }),
    total: monthlyRevenue[i] || 0,
  }));
};

export const getRecentOrders = async (): Promise<
  {
    id: string;
    phone: string;
    address: string;
    isPaid: boolean;
    totalPrice: number;
    createdAt: Date;
    products: string[];
  }[]
> => {
  const orders = await prisma.order.findMany({
    where: { isPaid: true },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      orderItems: {
        include: {
          product: true,
        },
      },
    },
  });

  return orders.map((order) => ({
    id: order.id,
    phone: order.phone,
    address: order.address,
    isPaid: order.isPaid,
    totalPrice: order.orderItems.reduce((sum, item) => sum + item.product.price.toNumber(), 0),
    createdAt: order.createdAt,
    products: order.orderItems.map((item) => item.product.name),
  }));
};
