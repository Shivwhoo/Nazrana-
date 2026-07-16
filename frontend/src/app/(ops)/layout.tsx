import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { SignOutButton } from '../(dashboard)/[orgId]/sign-out-button';
import { LayoutGrid, Package, Users, ShieldAlert, ShoppingCart } from 'lucide-react';

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');
  if (!(session.user as any).isPlatformAdmin) redirect('/');

  return (
    <div className="flex h-screen bg-stone-100 text-stone-900 font-mono">
      {/* Sidebar — pure monochrome, no decoration */}
      <aside className="w-56 border-r border-stone-300 bg-stone-50 flex flex-col">
        <div className="h-14 flex items-center px-5 border-b border-stone-200">
          <ShieldAlert className="h-5 w-5 mr-2 text-stone-700" />
          <span className="text-sm font-bold uppercase tracking-widest text-stone-700">Ops Console</span>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-0.5 text-sm">
          <Link href="/admin/orders" className="flex items-center px-3 py-2 rounded hover:bg-stone-200 text-stone-700 transition-colors">
            <ShoppingCart className="mr-2 h-4 w-4" /> Orders
          </Link>
          <div className="my-2 border-b border-stone-200"></div>
          <Link href="/admin/catalog/vendors" className="flex items-center px-3 py-2 rounded hover:bg-stone-200 text-stone-700 transition-colors">
            <Users className="mr-2 h-4 w-4" /> Vendors
          </Link>
          <Link href="/admin/catalog/products" className="flex items-center px-3 py-2 rounded hover:bg-stone-200 text-stone-700 transition-colors">
            <Package className="mr-2 h-4 w-4" /> Products
          </Link>
          <Link href="/admin/catalog/collections" className="flex items-center px-3 py-2 rounded hover:bg-stone-200 text-stone-700 transition-colors">
            <LayoutGrid className="mr-2 h-4 w-4" /> Collections
          </Link>
        </nav>

        <div className="p-4 border-t border-stone-200 text-xs text-stone-400">
          <p className="truncate">{session.user?.email}</p>
          <p className="font-medium text-stone-600 mt-0.5">Platform Admin</p>
          <SignOutButton />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}
