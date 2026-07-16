'use client';

import Link from 'next/link';
import { useVendorAuth } from '../../../lib/vendor-auth';
import { useRouter } from 'next/navigation';
import { LayoutGrid, PackageSearch, Settings, LogOut } from 'lucide-react';
import { NazranaLogo } from '@/components/NazranaLogo';
import { useEffect } from 'react';

export default function VendorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, isLoading } = useVendorAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/vendor/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return <div className="min-h-screen bg-[#FAF6EE] flex items-center justify-center text-[#221C14]">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-[#FAF6EE] text-[#221C14] font-sans">
      {/* Left Rail Navigation */}
      <aside className="w-64 border-r border-[#221C14]/10 bg-[#FAF6EE] flex flex-col z-10">
        <div className="h-16 flex items-center px-6 border-b border-[#221C14]/10">
          <NazranaLogo size={24} className="text-[#221C14] mr-2" />
          <span className="font-serif font-bold text-xl tracking-tight text-[#221C14]">Vendor Portal</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          <Link href="/vendor/catalog" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-[#221C14]/5 hover:text-[#B23A1E] group transition-colors">
            <LayoutGrid className="mr-3 h-5 w-5 text-[#221C14]/50 group-hover:text-[#B23A1E]" />
            Catalog
          </Link>
          <Link href="/vendor/orders" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-[#221C14]/5 hover:text-[#B23A1E] group transition-colors">
            <PackageSearch className="mr-3 h-5 w-5 text-[#221C14]/50 group-hover:text-[#B23A1E]" />
            Orders
          </Link>
          <Link href="/vendor/profile" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-[#221C14]/5 hover:text-[#B23A1E] group transition-colors">
            <Settings className="mr-3 h-5 w-5 text-[#221C14]/50 group-hover:text-[#B23A1E]" />
            Profile
          </Link>
        </nav>
        
        <div className="p-4 border-t border-[#221C14]/10">
          <div className="flex items-center px-3 py-2">
            <div className="flex-1 truncate">
              <p className="text-sm font-medium text-[#221C14] truncate">{user.name}</p>
              <p className="text-xs text-[#221C14]/60 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="mt-2 flex w-full items-center px-3 py-2 text-sm font-medium rounded-md text-[#221C14]/70 hover:bg-[#221C14]/5 hover:text-[#221C14] transition-colors"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto focus:outline-none">
        <div className="py-6 px-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
