'use client';

import { useEffect, useState } from 'react';
import { useVendorAuth } from '../../../../lib/vendor-auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  costCents: number;
  hsnCode: string | null;
  gstRateBps: number | null;
  moderationStatus: 'DRAFT' | 'PUBLISHED' | 'SUSPENDED';
  rejectionReason: string | null;
  createdAt: string;
}

export default function VendorCatalogPage() {
  const { token, isLoading } = useVendorAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoading || !token) return;

    fetch('http://localhost:4000/api/vendor/catalog', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [token, isLoading]);

  const getStatusStamp = (status: string, reason?: string | null) => {
    let text = status;
    let colorClass = 'border-[#221C14] text-[#221C14]';
    
    if (status === 'DRAFT') {
      text = 'NEEDS ATTENTION';
      colorClass = 'border-[#B23A1E] text-[#B23A1E]'; // Vermillion
    } else if (status === 'PUBLISHED') {
      colorClass = 'border-green-700 text-green-700';
    }

    return (
      <div className="flex flex-col items-start gap-1">
        <span className={`inline-block border-[1.5px] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] ${colorClass} rotate-[-1deg] rounded-sm bg-transparent mix-blend-multiply`}>
          {text}
        </span>
        {status === 'DRAFT' && reason && (
          <span className="text-xs text-[#B23A1E] max-w-[200px] truncate" title={reason}>
            {reason}
          </span>
        )}
      </div>
    );
  };

  if (loading || isLoading) {
    return <div className="animate-pulse">Loading catalog...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[#221C14]/10 pb-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-[#221C14]">Gift Catalog</h1>
          <p className="text-sm text-[#221C14]/60">Manage your product offerings and inventory</p>
        </div>
        <Link href="/vendor/catalog/new">
          <Button className="bg-[#B23A1E] hover:bg-[#822917] text-white">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </Link>
      </div>

      <div className="bg-white border border-[#221C14]/10 rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#221C14]/10 bg-[#FAF6EE]">
              <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[#221C14]/60">Product</th>
              <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[#221C14]/60">Cost (INR)</th>
              <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[#221C14]/60">Taxes</th>
              <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[#221C14]/60">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#221C14]/10">
            {products.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-[#221C14]/50">
                  No products found. Click &apos;Add Product&apos; to create one.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-[#FAF6EE]/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-[#221C14]">{product.name}</p>
                    <p className="text-xs text-[#221C14]/60 truncate max-w-[250px]">{product.description}</p>
                  </td>
                  <td className="px-6 py-4 font-sans tabular-nums font-medium text-[#221C14]">
                    ₹{(product.costCents / 100).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-[#221C14]">HSN: {product.hsnCode || '—'}</div>
                    <div className="text-xs text-[#221C14]/60">GST: {product.gstRateBps ? (product.gstRateBps / 100).toFixed(1) + '%' : '—'}</div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusStamp(product.moderationStatus, product.rejectionReason)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
