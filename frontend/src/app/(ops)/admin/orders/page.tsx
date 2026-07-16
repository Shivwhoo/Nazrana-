'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, RefreshCw, AlertCircle, CheckCircle2, Search, Filter } from 'lucide-react';

export default function AdminOrdersPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exceptionCount, setExceptionCount] = useState(0);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL;
      let url = `${base}/api/admin/orders?page=${page}&limit=50`;
      if (statusFilter) url += `&status=${statusFilter}`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${(session as any)?.backendToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      setOrders(data.data);
      setTotal(data.total);

      // Fetch exception count separately
      const excRes = await fetch(`${base}/api/admin/orders/exception-count`, {
        headers: { Authorization: `Bearer ${(session as any)?.backendToken}` }
      });
      if (excRes.ok) {
        const excData = await excRes.json();
        setExceptionCount(excData.count);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchOrders();
    }
  }, [session, page, statusFilter]);

  const handleAction = async (orderId: string, action: string, payload?: any) => {
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + `/api/admin/orders/${orderId}/${action}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(session as any)?.backendToken}` 
        },
        body: payload ? JSON.stringify(payload) : undefined
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Action failed');
      }
      alert(`Order ${action} successful`);
      fetchOrders(); // refresh
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-stone-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Order Board</h1>
          <p className="text-stone-500 text-sm mt-1">Cross-org view of all fulfillments</p>
        </div>
        {exceptionCount > 0 && (
          <div className="bg-red-50 text-red-700 px-4 py-2 rounded border border-red-200 flex items-center shadow-sm">
            <AlertCircle className="w-4 h-4 mr-2" />
            <span className="font-semibold">{exceptionCount} orders in EXCEPTION</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 bg-white p-3 border border-stone-200 rounded">
        <Filter className="w-4 h-4 text-stone-400" />
        <select 
          className="bg-transparent border-none text-sm outline-none cursor-pointer text-stone-700"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="CONFIRMED">CONFIRMED</option>
          <option value="SENT_TO_VENDOR">SENT TO VENDOR</option>
          <option value="SHIPPED">SHIPPED</option>
          <option value="DELIVERED">DELIVERED</option>
          <option value="EXCEPTION">EXCEPTION</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
        <button onClick={() => fetchOrders()} className="ml-auto text-stone-500 hover:text-stone-900">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-stone-50 text-stone-600 border-b border-stone-200 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Order ID / Date</th>
                <th className="px-4 py-3 font-medium">Organization</th>
                <th className="px-4 py-3 font-medium">Variant / Vendor</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs">{order.id.split('-')[0]}</div>
                    <div className="text-stone-500 text-xs mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-stone-800">{order.organization.name}</div>
                    <div className="text-stone-500 text-xs truncate max-w-[150px]">{order.campaign.name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-stone-800 truncate max-w-[200px]">{order.variant.product.title}</div>
                    <div className="text-stone-500 text-xs">{order.variant.product.vendor.name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                      order.status === 'EXCEPTION' ? 'bg-red-50 text-red-700 border-red-200' :
                      order.status === 'DELIVERED' ? 'bg-stone-100 text-stone-700 border-stone-200' :
                      'bg-stone-100 text-stone-600 border-stone-200'
                    }`}>
                      {order.status}
                    </span>
                    {order.exceptionNote && (
                      <div className="text-red-600 text-xs mt-1 truncate max-w-[200px]" title={order.exceptionNote}>
                        {order.exceptionNote}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {order.status === 'EXCEPTION' && (
                      <>
                        <button 
                          onClick={() => handleAction(order.id, 'retry')}
                          className="text-xs bg-stone-900 text-white px-2 py-1 rounded hover:bg-stone-800"
                        >
                          Retry
                        </button>
                        <button 
                          onClick={() => {
                            if(confirm('Cancel order and refund wallet?')) handleAction(order.id, 'cancel');
                          }}
                          className="text-xs bg-white border border-stone-300 text-stone-700 px-2 py-1 rounded hover:bg-stone-50"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {order.status === 'SENT_TO_VENDOR' && (
                      <button 
                        onClick={() => {
                          const carrier = prompt('Enter Carrier Name:');
                          const tracking = prompt('Enter Tracking Number:');
                          if(carrier && tracking) {
                            handleAction(order.id, 'advance', { status: 'SHIPPED', carrier, trackingNumber: tracking });
                          }
                        }}
                        className="text-xs bg-stone-100 border border-stone-300 text-stone-700 px-2 py-1 rounded hover:bg-stone-200"
                      >
                        Mark Shipped
                      </button>
                    )}
                    {order.status === 'SHIPPED' && (
                      <button 
                        onClick={() => handleAction(order.id, 'advance', { status: 'DELIVERED' })}
                        className="text-xs bg-stone-100 border border-stone-300 text-stone-700 px-2 py-1 rounded hover:bg-stone-200"
                      >
                        Mark Delivered
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-stone-500">
                    No orders found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-stone-200 flex justify-between items-center text-sm text-stone-500">
            <div>Showing {orders.length} of {total} orders</div>
            <div className="space-x-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="hover:text-stone-900 disabled:opacity-50"
              >
                Previous
              </button>
              <button 
                disabled={orders.length < 50}
                onClick={() => setPage(p => p + 1)}
                className="hover:text-stone-900 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
