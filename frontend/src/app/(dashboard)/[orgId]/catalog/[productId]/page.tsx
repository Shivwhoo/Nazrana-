'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Zap, Package,Loader2,CalendarClock, MapPin, ChevronLeft, ChevronRight, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Variant = {
  id: string;
  sku: string;
  title: string;
  priceCents: number;
  isDigital: boolean;
  stockQty: number;
  hsnCode: string;
  gstRateBps: number;
};

type Product = {
  id: string;
  title: string;
  description: string;
  whatsInside: string | null;
  category: string;
  images: string[];
  variants: Variant[];
  vendor: {
    name: string;
    fulfillmentType: string;
    cutoffDates: Record<string, string> | null;
    serviceablePincodes: string[] | null;
  };
  collections: Array<{ collection: { id: string; name: string } }>;
};

type Campaign = {
  id: string;
  name: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED';
};

function formatPrice(cents: number) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`;
}

function formatGst(bps: number) {
  return `${bps / 100}%`;
}

export default function ProductDetailPage({ params }: { params: Promise<{ orgId: string; productId: string }> }) {
  const { orgId, productId } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const token = (session as any)?.backendToken;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [imageIndex, setImageIndex] = useState(0);

  // Campaign Modal State
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [addingToCampaign, setAddingToCampaign] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/catalog/products/${productId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.product) {
          setProduct(d.product);
          const firstInStock = d.product.variants.find((v: Variant) => v.stockQty > 0 || v.isDigital);
          setSelectedVariant(firstInStock || d.product.variants[0] || null);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token, productId]);

  const openCampaignModal = async () => {
    setShowCampaignModal(true);
    setLoadingCampaigns(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orgs/${orgId}/campaigns`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Filter out completed campaigns
        setCampaigns(data.campaigns.filter((c: Campaign) => c.status !== 'COMPLETED'));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const handleAddToExistingCampaign = async () => {
    if (!selectedCampaignId) return;
    setAddingToCampaign(true);
    setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orgs/${orgId}/campaigns/${selectedCampaignId}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ productId: product?.id })
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Failed to add product to campaign.');
        setAddingToCampaign(false);
        return;
      }
      
      router.push(`/${orgId}/campaigns/${selectedCampaignId}`);
    } catch (e) {
      setError('An unexpected error occurred.');
      setAddingToCampaign(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-stone-100 rounded w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="aspect-[4/3] bg-stone-100 rounded-md" />
          <div className="space-y-4">
            <div className="h-8 bg-stone-200 rounded w-3/4" />
            <div className="h-4 bg-stone-100 rounded w-full" />
            <div className="h-4 bg-stone-100 rounded w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-stone-400">
        <p className="text-base font-medium text-stone-600 mb-4">Product not found</p>
        <Button variant="outline" asChild>
          <Link href={`/${orgId}/catalog`}>Back to Catalog</Link>
        </Button>
      </div>
    );
  }

  const cutoffEntries = Object.entries(product.vendor.cutoffDates || {});
  const isPanIndia = !product.vendor.serviceablePincodes;
  const isDigitalProduct = product.variants.every(v => v.isDigital);

  return (
    <div className="space-y-6 max-w-6xl relative">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-stone-500">
        <Link href={`/${orgId}/catalog`} className="flex items-center gap-1 hover:text-vermillion-600 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Catalog
        </Link>
        <span>/</span>
        <span className="text-stone-400">{product.category}</span>
        <span>/</span>
        <span className="text-stone-700">{product.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Left: Image gallery */}
        <div className="space-y-3">
          <div className="relative aspect-[4/3] bg-stone-100 rounded-md overflow-hidden">
            {product.images[imageIndex] ? (
              <img
                src={product.images[imageIndex]}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl">🎁</div>
            )}
            {product.images.length > 1 && (
              <>
                <button
                  onClick={() => setImageIndex(i => Math.max(0, i - 1))}
                  disabled={imageIndex === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1 shadow disabled:opacity-30"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setImageIndex(i => Math.min(product.images.length - 1, i + 1))}
                  disabled={imageIndex === product.images.length - 1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1 shadow disabled:opacity-30"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
            {/* Badges */}
            <div className="absolute top-3 left-3 flex gap-1.5">
              {isDigitalProduct && (
                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-1 rounded border border-amber-200">
                  <Zap className="h-3 w-3" /> Digital — Instant Delivery
                </span>
              )}
            </div>
          </div>
          {/* Thumbnail row */}
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setImageIndex(i)}
                  className={`shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-colors ${
                    imageIndex === i ? 'border-vermillion-600' : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product info */}
        <div className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">{product.category}</p>
            <h1 className="text-2xl font-bold font-serif text-stone-900 leading-snug">{product.title}</h1>
            {product.collections.length > 0 && (
              <div className="flex gap-2 mt-2">
                {product.collections.map(({ collection }) => (
                  <span key={collection.id} className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded border border-stone-200">
                    {collection.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <p className="text-stone-600 leading-relaxed text-sm">{product.description}</p>

          {/* What's Inside */}
          {product.whatsInside && (
            <div className="bg-stone-50 border border-stone-100 rounded-md p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-stone-500" />
                <span className="text-sm font-medium text-stone-700">What's Inside</span>
              </div>
              <ul className="space-y-1">
                {product.whatsInside.split('·').map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-stone-600">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-vermillion-400 shrink-0" />
                    {item.trim()}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Variant selector */}
          <div>
            <p className="text-sm font-medium text-stone-700 mb-2">Select Option</p>
            <div className="flex flex-wrap gap-2">
              {product.variants.map(v => {
                const outOfStock = !v.isDigital && v.stockQty === 0;
                const isSelected = selectedVariant?.id === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => !outOfStock && setSelectedVariant(v)}
                    disabled={outOfStock}
                    className={`px-4 py-2 text-sm rounded border transition-colors tabular-nums ${
                      isSelected
                        ? 'bg-stone-900 text-white border-stone-900'
                        : outOfStock
                        ? 'border-stone-100 text-stone-300 cursor-not-allowed line-through'
                        : 'border-stone-200 text-stone-700 hover:border-stone-400 bg-white'
                    }`}
                  >
                    {v.title}
                    {outOfStock && ' (Out of stock)'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price */}
          {selectedVariant && (
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-stone-900 tabular-nums">
                {formatPrice(selectedVariant.priceCents)}
              </span>
              {selectedVariant.hsnCode && (
                <span className="text-xs text-stone-400">
                  HSN {selectedVariant.hsnCode} · GST {formatGst(selectedVariant.gstRateBps)}
                </span>
              )}
            </div>
          )}

          {/* Delivery info */}
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2 text-stone-600">
              <MapPin className="h-4 w-4 text-stone-400 mt-0.5 shrink-0" />
              <span>
                {isDigitalProduct
                  ? 'Delivered instantly to recipient\'s email — no address needed.'
                  : isPanIndia
                  ? 'Pan-India delivery via ' + product.vendor.name
                  : `Serviceable in ${product.vendor.serviceablePincodes?.length} pincodes`}
              </span>
            </div>
            {cutoffEntries.length > 0 && (
              <div className="flex items-start gap-2 text-stone-600">
                <CalendarClock className="h-4 w-4 text-stone-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium">Order by dates:</span>
                  <ul className="mt-1 space-y-0.5">
                    {cutoffEntries.map(([event, date]) => (
                      <li key={event}>{event}: <strong>{new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="pt-2 flex gap-3">
            <Button
              className="flex-1 bg-vermillion-600 hover:bg-vermillion-700 text-white"
              disabled={!selectedVariant || (!selectedVariant.isDigital && selectedVariant.stockQty === 0)}
              onClick={openCampaignModal}
            >
              Add to Campaign
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/${orgId}/catalog`}>Back</Link>
            </Button>
          </div>

          <p className="text-xs text-stone-400">
            Supplied by <strong className="text-stone-500">{product.vendor.name}</strong>
          </p>
        </div>
      </div>

      {/* Add to Campaign Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-stone-100 pb-4">
              <CardTitle className="text-lg font-serif">Add to Campaign</CardTitle>
              <button onClick={() => setShowCampaignModal(false)} className="text-stone-400 hover:text-stone-700">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Option 1: Existing Campaigns */}
              <div>
                <p className="text-sm font-medium text-stone-900 mb-3">Add to an existing campaign</p>
                {loadingCampaigns ? (
                  <div className="flex items-center text-stone-500 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading campaigns...
                  </div>
                ) : campaigns.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-hide">
                    {campaigns.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCampaignId(c.id)}
                        className={`w-full text-left px-4 py-3 rounded-md border flex items-center justify-between transition-colors ${
                          selectedCampaignId === c.id
                            ? 'border-vermillion-500 bg-vermillion-50'
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <span className="font-medium text-sm text-stone-900">{c.name}</span>
                        <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                          c.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-600'
                        }`}>
                          {c.status}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-stone-500">No active or draft campaigns found.</p>
                )}
                
                {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
                
                <Button 
                  className="w-full mt-3 bg-stone-900 text-white hover:bg-stone-800" 
                  disabled={!selectedCampaignId || addingToCampaign}
                  onClick={handleAddToExistingCampaign}
                >
                  {addingToCampaign ? 'Adding...' : 'Add to Selected Campaign'}
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-stone-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-stone-400 tracking-wider">Or</span>
                </div>
              </div>

              {/* Option 2: New Campaign */}
              <div>
                <Button 
                  variant="outline" 
                  className="w-full border-dashed border-2 hover:bg-stone-50"
                  onClick={() => router.push(`/${orgId}/campaigns/new?productId=${product.id}&variantId=${selectedVariant?.id}`)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Campaign
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
