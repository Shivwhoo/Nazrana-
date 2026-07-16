import Link from 'next/link';
import { auth } from '@/auth'
import { redirect } from 'next/navigation';
import { Users, Settings, Home, BookOpen, LayoutGrid, Wallet, Gift } from 'lucide-react';
import { SignOutButton } from './sign-out-button';
import { NazranaLogo } from '@/components/NazranaLogo';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  
  // Guard against Next.js dynamic route caching bugs catching /vendor
  if (orgId === 'vendor') {
    redirect('/vendor/catalog');
  }

  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div className="flex h-screen bg-stone-50 text-stone-900 font-sans">
      {/* Left Rail Navigation */}
      <aside className="w-64 border-r border-stone-200 bg-white flex flex-col shadow-sm z-10">
        <div className="h-16 flex items-center px-6 border-b border-stone-100">
          <NazranaLogo size={24} className="text-stone-900 mr-2" />
          <span className="font-serif font-bold text-xl tracking-tight text-stone-900">Nazrana</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          <Link href={`/${orgId}`} className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-stone-100 hover:text-vermillion-600 group transition-colors">
            <Home className="mr-3 h-5 w-5 text-stone-400 group-hover:text-vermillion-500" />
            Dashboard
          </Link>
          <Link href={`/${orgId}/campaigns`} className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-stone-100 hover:text-vermillion-600 group transition-colors">
            <Gift className="mr-3 h-5 w-5 text-stone-400 group-hover:text-vermillion-500" />
            Campaigns
          </Link>
          <Link href={`/${orgId}/catalog`} className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-stone-100 hover:text-vermillion-600 group transition-colors">
            <LayoutGrid className="mr-3 h-5 w-5 text-stone-400 group-hover:text-vermillion-500" />
            Gift Catalog
          </Link>
          <Link href={`/${orgId}/team`} className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-stone-100 hover:text-vermillion-600 group transition-colors">
            <Users className="mr-3 h-5 w-5 text-stone-400 group-hover:text-vermillion-500" />
            Team & Access
          </Link>
          <Link href={`/${orgId}/wallet`} className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-stone-100 hover:text-vermillion-600 group transition-colors">
            <Wallet className="mr-3 h-5 w-5 text-stone-400 group-hover:text-vermillion-500" />
            Wallet & Billing
          </Link>
          <Link href={`/${orgId}/settings`} className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-stone-100 hover:text-vermillion-600 group transition-colors">
            <Settings className="mr-3 h-5 w-5 text-stone-400 group-hover:text-vermillion-500" />
            Settings
          </Link>
        </nav>
        
        <div className="p-4 border-t border-stone-100">
          <div className="flex items-center px-3 py-2">
            <div className="flex-1 truncate">
              <p className="text-sm font-medium text-stone-900 truncate">{session.user?.name || session.user?.email}</p>
              <p className="text-xs text-stone-500 truncate">{session.user?.email}</p>
            </div>
          </div>
          <SignOutButton />
          <div className="mt-6 text-center text-[10px] tracking-[1.5px] uppercase text-stone-400 font-sans">
            powered by edmentor
          </div>
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
