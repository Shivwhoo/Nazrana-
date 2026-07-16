'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Search, SlidersHorizontal, Tag, Zap, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Variant = {
  id: string;
  sku: string;
  title: string;
  priceCents: number;
  stockQty: number;
  isDigital: boolean;
};

type Collection = {
  id: string;
  name: string;
  _count: { items: number };
};

type Product = {
  id: string;
  title: string;
  description: string;
  category: string;
  images: string[];
  variants: Variant[];
  vendor: { name: string; fulfillmentType: string };
};

const CATEGORIES = ['All', 'Diwali Hampers', 'Snack Boxes', 'Wellness', 'Stationery & Desk', 'Accessories', 'Onboarding Kits', 'Digital Vouchers'];
const PRICE_BANDS = [
  { label: 'All prices', max: undefined },
  { label: 'Under ₹500', max: 50000 },
  { label: 'Under ₹1,000', max: 100000 },
  { label: 'Under ₹1,500', max: 150000 },
  { label: 'Under ₹2,000', max: 200000 },
];

function formatPrice(cents: number) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`;
}

function ProductCard({ product, orgId }: { product: Product; orgId: string }) {
  const lowestVariant = product.variants.reduce(
    (min, v) => (v.priceCents < min.priceCents ? v : min),
    product.variants[0]
  );
  const isDigital = product.variants.every(v => v.isDigital);
  const hasMultipleVariants = product.variants.length > 1;
  const inStock = product.variants.some(v => v.stockQty > 0 || v.isDigital);

  return (
    <Link href={`/${orgId}/catalog/${product.id}`} className="group block">
      <div className="bg-white border border-stone-200 rounded-md overflow-hidden transition-shadow hover:shadow-md">
        {/* Image */}
        <div className="aspect-[4/3] overflow-hidden bg-stone-100 relative">
          {product.images[0] ? (
            <img
              src={product.images[0]}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-300 text-4xl">🎁</div>
          )}
          {/* Badges */}
          <div className="absolute top-2 left-2 flex gap-1">
            {isDigital && (
              <span className="inline-flex items-center gap-1 bg-marigold-100 text-marigold-800 text-xs font-medium px-2 py-0.5 rounded border border-marigold-200">
                <Zap className="h-3 w-3" /> Digital
              </span>
            )}
            {!inStock && (
              <span className="inline-flex items-center bg-stone-700 text-white text-xs font-medium px-2 py-0.5 rounded">
                Out of stock
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">{product.category}</p>
          <h3 className="font-serif font-semibold text-stone-900 leading-tight mb-1 group-hover:text-vermillion-700 transition-colors">
            {product.title}
          </h3>
          <p className="text-xs text-stone-500 line-clamp-2 mb-3">{product.description}</p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-stone-400">
                {hasMultipleVariants ? 'From' : ''}
              </p>
              <p className="font-medium text-stone-900 tabular-nums">
                {formatPrice(lowestVariant.priceCents)}
              </p>
            </div>
            <span className="text-xs text-stone-400">{product.vendor.name}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function CatalogPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);
  const { data: session } = useSession();

  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPriceBand, setSelectedPriceBand] = useState(0);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | undefined>();

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch collections once
  useEffect(() => {
    if (!session) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/catalog/collections`, {
      headers: { Authorization: `Bearer ${(session as any)?.backendToken}` },
    })
      .then(r => r.json())
      .then(d => setCollections(d.collections || []));
  }, [session]);

  // Fetch products when filters change
  useEffect(() => {
    if (!session) return;
    setLoading(true);

    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (selectedCategory !== 'All') params.set('category', selectedCategory);
    const maxPrice = PRICE_BANDS[selectedPriceBand].max;
    if (maxPrice) params.set('maxPriceCents', String(maxPrice));
    if (selectedCollectionId) params.set('collectionId', selectedCollectionId);
    params.set('limit', '24');

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/catalog/products?${params.toString()}`, {
      headers: { Authorization: `Bearer ${(session as any)?.backendToken}` },
    })
      .then(r => r.json())
      .then(d => {
        setProducts(d.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session, debouncedSearch, selectedCategory, selectedPriceBand, selectedCollectionId]);

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('All');
    setSelectedPriceBand(0);
    setSelectedCollectionId(undefined);
  };
  const hasActiveFilters = selectedCategory !== 'All' || selectedPriceBand !== 0 || !!selectedCollectionId || !!search;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 font-serif">Gift Catalog</h1>
        <p className="mt-1 text-sm text-stone-500">
          Browse curated gifts — hampers, snack boxes, wellness kits, and digital vouchers.
        </p>
      </div>

      {/* Collection tabs */}
      {collections.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setSelectedCollectionId(undefined)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              !selectedCollectionId
                ? 'bg-vermillion-600 text-white border-vermillion-600'
                : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
            }`}
          >
            All Products
          </button>
          {collections.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCollectionId(c.id)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                selectedCollectionId === c.id
                  ? 'bg-vermillion-600 text-white border-vermillion-600'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Filters bar */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 border-stone-200"
          />
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 px-3 py-1 text-sm rounded border transition-colors ${
                selectedCategory === cat
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Price band */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-stone-400" />
          <select
            value={selectedPriceBand}
            onChange={e => setSelectedPriceBand(Number(e.target.value))}
            className="text-sm border border-stone-200 rounded-md px-2 py-1 bg-white text-stone-700 focus:outline-none focus:ring-1 focus:ring-vermillion-500"
          >
            {PRICE_BANDS.map((b, i) => (
              <option key={i} value={i}>{b.label}</option>
            ))}
          </select>
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-stone-500 h-8">
            <X className="h-4 w-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white border border-stone-100 rounded-md overflow-hidden animate-pulse">
              <div className="aspect-[4/3] bg-stone-100" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-stone-100 rounded w-1/3" />
                <div className="h-4 bg-stone-200 rounded w-3/4" />
                <div className="h-3 bg-stone-100 rounded w-full" />
                <div className="h-3 bg-stone-100 rounded w-2/3" />
                <div className="h-5 bg-stone-200 rounded w-1/4 mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-stone-400">
          <Tag className="h-10 w-10 mb-3" />
          <p className="text-base font-medium text-stone-600">No products found</p>
          <p className="text-sm mt-1">Try adjusting your filters or search term.</p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map(product => (
            <ProductCard key={product.id} product={product} orgId={orgId} />
          ))}
        </div>
      )}
    </div>
  );
}
