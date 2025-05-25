import { useEffect, useState, useMemo } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { supabase } from '@/integrations/supabase/client';
import Sidebar from '@/components/Sidebar';
import { AlertCircle, Package } from 'lucide-react';

const LowStockComponent = () => {
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { currentBusiness } = useBusiness();
  const businessId = useMemo(() => currentBusiness?.id, [currentBusiness]);

  useEffect(() => {
    if (!businessId) return;

    const fetchLowStockProducts = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('products')
        .select('id, name, quantity')
        .lt('quantity', 2)
        .eq('business_id', businessId);

      if (error) {
        setError(error.message);
      } else {
        setLowStockProducts(data || []);
      }

      setLoading(false);
    };

    fetchLowStockProducts();
  }, [businessId]);

  if (!businessId) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <main className="flex-1 p-6">
        <section className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm p-8 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-semibold text-gray-800">Low Stock Products</h1>
            <p className="text-sm text-gray-500">Less than 2 items in stock</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg mb-4">
              <AlertCircle className="w-5 h-5" />
              <span>Error: {error}</span>
            </div>
          )}

          {loading ? (
            <p className="text-gray-500">Loading low stock products...</p>
          ) : lowStockProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Package className="mx-auto h-12 w-12 mb-3" />
              <p className="text-lg font-medium">All products are sufficiently stocked</p>
              <p className="text-sm text-gray-500">No low stock products found.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {lowStockProducts.map(({ id, name, quantity }) => (
                <li
                  key={id}
                  className="flex items-center justify-between bg-gray-100 rounded-lg px-4 py-3 shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <span className="text-gray-800 font-medium">{name}</span>
                  <span className="text-red-600 font-semibold">Qty: {quantity}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
};

export default LowStockComponent;
