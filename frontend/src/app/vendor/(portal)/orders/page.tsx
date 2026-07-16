'use client';

import { useEffect, useState } from 'react';
import { useVendorAuth } from '../../../../lib/vendor-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Recipient {
  id: string;
  name: string;
  email: string;
  shippingAddress: any;
}

interface Order {
  id: string;
  status: string; // SENT_TO_VENDOR, SHIPPED, EXCEPTION, DELIVERED, CANCELLED
  recipient: Recipient;
  variant: {
    product: {
      name: string;
    }
  };
  createdAt: string;
}

export default function VendorOrdersPage() {
  const { token, isLoading } = useVendorAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for shipping modal/inline form
  const [shippingOrderId, setShippingOrderId] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courierName, setCourierName] = useState('');

  const fetchOrders = () => {
    if (!token) return;
    setLoading(true);
    fetch('http://localhost:4000/api/vendor/orders', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setOrders(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!isLoading && token) {
      fetchOrders();
    }
  }, [token, isLoading]);

  const handleShipOrder = async (orderId: string) => {
    if (!trackingNumber || !courierName) return alert('Please provide tracking number and courier name');
    
    try {
      const res = await fetch(`http://localhost:4000/api/vendor/orders/${orderId}/ship`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ trackingNumber, courierName })
      });
      
      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Failed to ship order');
        return;
      }
      
      setShippingOrderId(null);
      setTrackingNumber('');
      setCourierName('');
      fetchOrders(); // Refresh orders
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    }
  };

  const getStatusStamp = (status: string) => {
    let colorClass = 'border-[#221C14] text-[#221C14]';
    let angle = 'rotate-[-2deg]';
    
    if (status === 'SENT_TO_VENDOR') {
      colorClass = 'border-amber-600 text-amber-600';
      angle = 'rotate-[-1deg]';
    } else if (status === 'SHIPPED' || status === 'DELIVERED') {
      colorClass = 'border-green-700 text-green-700';
      angle = 'rotate-[-2deg]';
    } else if (status === 'EXCEPTION' || status === 'CANCELLED') {
      colorClass = 'border-[#B23A1E] text-[#B23A1E]'; // Vermillion
      angle = 'rotate-[-3deg]';
    }

    return (
      <span className={`inline-block border-[1.5px] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] ${colorClass} ${angle} rounded-sm bg-transparent mix-blend-multiply`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  if (loading || isLoading) {
    return <div className="animate-pulse text-[#221C14]">Loading orders...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[#221C14]/10 pb-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-[#221C14]">Fulfillment Queue</h1>
          <p className="text-sm text-[#221C14]/60">Manage your pending orders and update shipments</p>
        </div>
      </div>

      <div className="bg-white border border-[#221C14]/10 rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#221C14]/10 bg-[#FAF6EE]">
              <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[#221C14]/60">Order ID & Date</th>
              <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[#221C14]/60">Product</th>
              <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[#221C14]/60">Recipient & Address</th>
              <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[#221C14]/60">Status</th>
              <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[#221C14]/60">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#221C14]/10">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-[#221C14]/50">
                  No orders found.
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const addr = order.recipient.shippingAddress as any || {};
                const isShipping = shippingOrderId === order.id;

                return (
                  <tr key={order.id} className="hover:bg-[#FAF6EE]/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-mono text-xs text-[#221C14] tabular-nums">{order.id.slice(0, 8)}</p>
                      <p className="text-xs text-[#221C14]/60">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-[#221C14]">{order.variant.product.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-sm text-[#221C14]">{order.recipient.name || order.recipient.email}</p>
                      <p className="text-xs text-[#221C14]/70 max-w-[200px] truncate">
                        {addr.street1} {addr.city} {addr.state} {addr.zipCode}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusStamp(order.status)}
                    </td>
                    <td className="px-6 py-4">
                      {order.status === 'SENT_TO_VENDOR' && !isShipping && (
                        <Button 
                          size="sm" 
                          className="bg-[#221C14] hover:bg-[#B23A1E] text-[#FAF6EE] text-xs h-8 px-3 transition-colors"
                          onClick={() => setShippingOrderId(order.id)}
                        >
                          Mark Shipped
                        </Button>
                      )}
                      {isShipping && (
                        <div className="flex flex-col gap-2 p-3 border border-[#221C14]/20 rounded-md bg-[#FAF6EE] min-w-[250px]">
                          <Input 
                            placeholder="Courier Name (e.g. FedEx)" 
                            value={courierName} 
                            onChange={e => setCourierName(e.target.value)}
                            className="h-8 text-xs border-[#221C14]/20 focus-visible:ring-[#B23A1E]"
                          />
                          <Input 
                            placeholder="Tracking Number" 
                            value={trackingNumber} 
                            onChange={e => setTrackingNumber(e.target.value)}
                            className="h-8 text-xs border-[#221C14]/20 font-mono focus-visible:ring-[#B23A1E]"
                          />
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              className="bg-[#B23A1E] hover:bg-[#822917] text-white text-xs h-7 flex-1"
                              onClick={() => handleShipOrder(order.id)}
                            >
                              Confirm
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="border-[#221C14]/20 text-[#221C14] text-xs h-7 flex-1 hover:bg-[#221C14]/5"
                              onClick={() => setShippingOrderId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
