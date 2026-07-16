'use client';

import { useState, useEffect, Fragment } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Pencil, ChevronDown, ChevronRight, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Variant = {
  id?: string;
  sku: string;
  title: string;
  priceCents: number;
  costCents: number;
  gstRateBps: number;
  stockQty: number;
  isDigital: boolean;
};

type Product = {
  id: string;
  vendorId: string;
  title: string;
  description: string;
  category: string;
  status: string;
  images: string[];
  variants: Variant[];
  vendor: { name: string };
  _count: { collections: number };
};

type Vendor = {
  id: string;
  name: string;
};

function formatPrice(c: number) {
  return `₹${(c / 100).toLocaleString('en-IN')}`;
}

export default function AdminProductsPage() {
  const { data: session } = useSession();

  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  // Product form state
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<Partial<Product>>({
    title: '', description: '', category: '', vendorId: '', images: [], variants: []
  });
  const [productSaving, setProductSaving] = useState(false);
  const [productError, setProductError] = useState('');

  const token = (session as any)?.backendToken;

  const fetchData = async () => {
    setLoading(true);
    const [pRes, vRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/catalog/products`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/catalog/vendors`, { headers: { Authorization: `Bearer ${token}` } })
    ]);
    const [pData, vData] = await Promise.all([pRes.json(), vRes.json()]);
    setProducts(pData.products || []);
    setVendors(vData.vendors || []);
    setLoading(false);
  };

  useEffect(() => {
    if (session) fetchData();
  }, [session]);

  const openNewProductForm = () => {
    setEditingProductId(null);
    setProductForm({
      title: '', description: '', category: '', vendorId: vendors[0]?.id || '', images: [],
      variants: [{ sku: '', title: '', priceCents: 0, costCents: 0, gstRateBps: 0, stockQty: 0, isDigital: false }]
    });
    setShowProductForm(true);
  };

  const openEditProductForm = (p: Product) => {
    setEditingProductId(p.id);
    setProductForm({
      title: p.title, description: p.description, category: p.category, vendorId: p.vendorId, images: p.images || [],
      variants: p.variants.map(v => ({ ...v }))
    });
    setShowProductForm(true);
  };

  const saveProduct = async () => {
    setProductError('');
    setProductSaving(true);
    try {
      const url = editingProductId 
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/admin/catalog/products/${editingProductId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/admin/catalog/products`;
      const method = editingProductId ? 'PUT' : 'POST';
      
      const payload = { ...productForm };
      if (editingProductId) {
        // PUT doesn't support updating variants or vendorId in the current schema
        delete payload.variants;
        delete payload.vendorId;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        setProductError(d.message || 'Failed to save product');
        return;
      }
      setShowProductForm(false);
      fetchData();
    } catch {
      setProductError('Unexpected error');
    } finally {
      setProductSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-stone-500 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading products...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl relative">
      <div>
        <h1 className="text-xl font-bold text-stone-800 uppercase tracking-widest">Products</h1>
        <p className="text-sm text-stone-500 mt-1">Manage the global platform catalog.</p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-stone-500">{products.length} products</p>
          <Button size="sm" onClick={openNewProductForm} className="bg-stone-800 hover:bg-stone-700 text-white">
            <Plus className="h-4 w-4 mr-1" /> Add Product
          </Button>
        </div>

        {showProductForm && (
          <Card className="border-stone-200 mb-6 bg-stone-50">
            <CardHeader className="flex flex-row justify-between items-center pb-2">
              <CardTitle className="text-sm uppercase tracking-widest">{editingProductId ? 'Edit Product' : 'New Product'}</CardTitle>
              <button onClick={() => setShowProductForm(false)} className="text-stone-400 hover:text-stone-700">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs uppercase tracking-wide">Title</Label>
                  <Input value={productForm.title} onChange={e => setProductForm(f => ({ ...f, title: e.target.value }))} className="mt-1 bg-white" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wide">Category</Label>
                  <Input value={productForm.category} onChange={e => setProductForm(f => ({ ...f, category: e.target.value }))} className="mt-1 bg-white" />
                </div>
                {!editingProductId && (
                  <div>
                    <Label className="text-xs uppercase tracking-wide">Vendor</Label>
                    <select
                      value={productForm.vendorId}
                      onChange={e => setProductForm(f => ({ ...f, vendorId: e.target.value }))}
                      className="mt-1 w-full border border-stone-200 rounded px-3 py-2 text-sm bg-white"
                    >
                      <option value="" disabled>Select Vendor</option>
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                )}
                <div className={editingProductId ? "col-span-2" : ""}>
                  <Label className="text-xs uppercase tracking-wide">Image URL</Label>
                  <Input 
                    value={productForm.images?.[0] || ''} 
                    onChange={e => setProductForm(f => ({ ...f, images: e.target.value ? [e.target.value] : [] }))} 
                    placeholder="https://..." className="mt-1 bg-white" 
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs uppercase tracking-wide">Description</Label>
                  <textarea 
                    value={productForm.description} 
                    onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))} 
                    className="mt-1 w-full border border-stone-200 rounded px-3 py-2 text-sm bg-white min-h-[80px]" 
                  />
                </div>
              </div>

              {!editingProductId && (
                <div className="space-y-3 pt-2 border-t border-stone-200">
                  <Label className="text-xs uppercase tracking-wide">Variant (First Option)</Label>
                  <div className="grid grid-cols-4 gap-3 bg-white p-3 border border-stone-200 rounded-md">
                    <div>
                      <Label className="text-[10px] uppercase text-stone-500">SKU</Label>
                      <Input value={productForm.variants?.[0]?.sku || ''} onChange={e => {
                        const v = [...(productForm.variants || [])];
                        if (v[0]) v[0].sku = e.target.value;
                        setProductForm(f => ({ ...f, variants: v }));
                      }} className="h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase text-stone-500">Title</Label>
                      <Input value={productForm.variants?.[0]?.title || ''} onChange={e => {
                        const v = [...(productForm.variants || [])];
                        if (v[0]) v[0].title = e.target.value;
                        setProductForm(f => ({ ...f, variants: v }));
                      }} className="h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase text-stone-500">Price (Cents)</Label>
                      <Input type="number" value={productForm.variants?.[0]?.priceCents || 0} onChange={e => {
                        const v = [...(productForm.variants || [])];
                        if (v[0]) v[0].priceCents = parseInt(e.target.value) || 0;
                        setProductForm(f => ({ ...f, variants: v }));
                      }} className="h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase text-stone-500">Cost (Cents)</Label>
                      <Input type="number" value={productForm.variants?.[0]?.costCents || 0} onChange={e => {
                        const v = [...(productForm.variants || [])];
                        if (v[0]) v[0].costCents = parseInt(e.target.value) || 0;
                        setProductForm(f => ({ ...f, variants: v }));
                      }} className="h-8 text-xs" />
                    </div>
                  </div>
                </div>
              )}

              {productError && <p className="text-sm text-red-600">{productError}</p>}
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={saveProduct} disabled={productSaving} className="bg-stone-800 text-white hover:bg-stone-700">
                  {productSaving ? 'Saving...' : 'Save Product'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowProductForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-400">
              <th className="py-2 pr-4 w-8" />
              <th className="py-2 pr-4">Product</th>
              <th className="py-2 pr-4">Vendor</th>
              <th className="py-2 pr-4">Category</th>
              <th className="py-2 pr-4">Variants</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Price range</th>
              <th className="py-2 pr-4" />
            </tr>
          </thead>
          <tbody>
            {products.map(p => {
              const minPrice = Math.min(...p.variants.map(v => v.priceCents));
              const maxPrice = Math.max(...p.variants.map(v => v.priceCents));
              const isExpanded = expandedProduct === p.id;
              return (
                <Fragment key={p.id}>
                  <tr className="border-b border-stone-100 hover:bg-stone-50 cursor-pointer" onClick={() => setExpandedProduct(isExpanded ? null : p.id)}>
                    <td className="py-3 text-stone-400">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </td>
                    <td className="py-3 pr-4 font-medium text-stone-800">{p.title}</td>
                    <td className="py-3 pr-4 text-stone-500">{p.vendor?.name}</td>
                    <td className="py-3 pr-4 text-stone-500">{p.category}</td>
                    <td className="py-3 pr-4 tabular-nums text-stone-600">{p.variants.length}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs font-medium ${p.status === 'ACTIVE' ? 'text-green-700' : 'text-stone-400'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-stone-600">
                      {minPrice === maxPrice ? formatPrice(minPrice) : `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`}
                    </td>
                    <td className="py-3 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-stone-400 hover:text-stone-700" 
                        onClick={(e) => { e.stopPropagation(); openEditProductForm(p); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${p.id}-variants`} className="bg-stone-50 border-b border-stone-100">
                      <td />
                      <td colSpan={7} className="py-3 pl-2 pr-4">
                        <div className="space-y-1">
                          {p.variants.map(v => (
                            <div key={v.id} className="flex items-center gap-4 text-xs text-stone-500 font-mono bg-white border border-stone-100 rounded px-3 py-2">
                              <span className="font-medium text-stone-700">{v.sku}</span>
                              <span>{v.title}</span>
                              <span className="tabular-nums ml-auto">{formatPrice(v.priceCents)}</span>
                              <span className="w-16 text-right tabular-nums">
                                {v.isDigital ? '∞ stock' : `${v.stockQty} units`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
