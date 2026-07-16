'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Loader2, Users, Gift, Package, ShoppingCart, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    const token = (session as any)?.backendToken;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/metrics`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-stone-500">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading platform metrics...
      </div>
    );
  }

  if (!data || !data.metrics) {
    return (
      <div className="text-red-500 p-6">
        Failed to load metrics. Ensure backend server is running.
      </div>
    );
  }

  const { metrics, recentOrders } = data;

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 font-serif">Platform Overview</h1>
        <p className="mt-1 text-sm text-stone-500">
          High-level metrics and recent activity across all organizations.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-stone-200 shadow-sm bg-white">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <Users className="h-8 w-8 text-blue-600 mb-3" />
            <div className="text-3xl font-bold font-mono text-stone-900">{metrics.totalOrgs}</div>
            <div className="text-xs font-medium uppercase tracking-wider text-stone-500 mt-1">Organizations</div>
          </CardContent>
        </Card>
        
        <Card className="border-stone-200 shadow-sm bg-white">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <Activity className="h-8 w-8 text-green-600 mb-3" />
            <div className="text-3xl font-bold font-mono text-stone-900">{metrics.activeCampaigns}</div>
            <div className="text-xs font-medium uppercase tracking-wider text-stone-500 mt-1">Active Campaigns</div>
          </CardContent>
        </Card>

        <Card className="border-stone-200 shadow-sm bg-white">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <ShoppingCart className="h-8 w-8 text-amber-600 mb-3" />
            <div className="text-3xl font-bold font-mono text-stone-900">{metrics.totalOrders}</div>
            <div className="text-xs font-medium uppercase tracking-wider text-stone-500 mt-1">Total Orders</div>
          </CardContent>
        </Card>

        <Card className="border-stone-200 shadow-sm bg-white">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <Users className="h-8 w-8 text-purple-600 mb-3" />
            <div className="text-3xl font-bold font-mono text-stone-900">{metrics.totalVendors}</div>
            <div className="text-xs font-medium uppercase tracking-wider text-stone-500 mt-1">Active Vendors</div>
          </CardContent>
        </Card>

        <Card className="border-stone-200 shadow-sm bg-white">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <Package className="h-8 w-8 text-vermillion-600 mb-3" />
            <div className="text-3xl font-bold font-mono text-stone-900">{metrics.totalProducts}</div>
            <div className="text-xs font-medium uppercase tracking-wider text-stone-500 mt-1">Active Products</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card className="border-stone-200 shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-serif">Recent Orders</CardTitle>
          <CardDescription>The latest fulfillment requests across the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-stone-50 text-stone-600 border-y border-stone-200 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Order ID</th>
                <th className="px-4 py-3 font-medium">Organization</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-500">
                    No orders found.
                  </td>
                </tr>
              ) : (
                recentOrders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-stone-600">
                      {order.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-stone-800 font-medium">
                      {order.campaign?.organization?.name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {order.variant?.product?.title || 'Unknown Product'}
                    </td>
                    <td className="px-4 py-3 tabular-nums font-medium text-stone-900">
                      ₹{(order.priceCents / 100).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-stone-500 tabular-nums">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="mt-4 flex justify-end">
            <Link href="/admin/orders" className="text-sm text-vermillion-600 hover:text-vermillion-700 font-medium">
              View all orders &rarr;
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
