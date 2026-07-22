import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { NazranaLogo } from '@/components/NazranaLogo';
import { GlobalFooter } from '@/components/Footer';
import { Gift, BarChart3, Users, Wallet, Shield, Zap } from 'lucide-react';

export default async function RootPage() {
  const session = await auth();
  
  // If logged in, redirect to dashboard
  if (session) {
    if ((session.user as any).isPlatformAdmin) {
      redirect('/admin');
    }

    let orgIdToRedirect = null;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orgs`, {
        headers: {
          'Authorization': `Bearer ${(session as any).backendToken}`
        },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.orgs && data.orgs.length > 0) {
          orgIdToRedirect = data.orgs[0].id;
        }
      }
    } catch (error) {
      console.error("Failed to fetch orgs:", error);
    }

    if (orgIdToRedirect) {
      redirect(`/${orgIdToRedirect}`);
    } else {
      redirect('/onboarding');
    }
  }

  // Public landing page for unauthenticated visitors
  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <NazranaLogo size={32} className="text-stone-900" />
            <span className="font-serif font-bold text-xl text-stone-900">Nazrana</span>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/about" 
              className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
            >
              About
            </Link>
            <Link 
              href="/pricing" 
              className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
            >
              Pricing
            </Link>
            <Link 
              href="/login" 
              className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/register" 
              className="text-sm font-medium bg-vermillion-600 hover:bg-vermillion-700 text-white px-5 py-2 rounded-lg transition-colors shadow-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-vermillion-50 border border-vermillion-200 rounded-full px-4 py-1.5 text-sm text-vermillion-700 font-medium mb-8">
            <span className="w-2 h-2 bg-vermillion-500 rounded-full animate-pulse" />
            Corporate Gifting Platform for India
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-stone-900 tracking-tight leading-[1.1] mb-6">
            Send gifts that<br />
            <span className="text-vermillion-600">matter.</span>
          </h1>
          <p className="text-lg md:text-xl text-stone-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Launch corporate gifting campaigns in minutes. Set budgets, pick products, 
            upload recipients, and let Nazrana handle the rest — from magic links to 
            doorstep delivery.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link 
              href="/register" 
              className="bg-vermillion-600 hover:bg-vermillion-700 text-white px-8 py-3.5 rounded-xl text-base font-semibold transition-all shadow-lg shadow-vermillion-200 hover:shadow-xl hover:shadow-vermillion-300"
            >
              Start Free Trial
            </Link>
            <Link 
              href="/login" 
              className="bg-white border border-stone-300 hover:border-stone-400 text-stone-700 px-8 py-3.5 rounded-xl text-base font-semibold transition-all"
            >
              Sign In
            </Link>
          </div>
          <p className="mt-4 text-sm text-stone-400">No credit card required. Free for your first campaign.</p>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="py-12 bg-white border-y border-stone-200">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-xs uppercase tracking-[2px] text-stone-400 font-medium mb-6">Trusted by growing companies across India</p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 text-stone-300">
            <span className="text-lg font-semibold text-stone-400">TechCorp</span>
            <span className="text-lg font-semibold text-stone-400">FinServe</span>
            <span className="text-lg font-semibold text-stone-400">HealthPlus</span>
            <span className="text-lg font-semibold text-stone-400">EduWorld</span>
            <span className="text-lg font-semibold text-stone-400">RetailMax</span>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 mb-4">
              Everything you need for corporate gifting
            </h2>
            <p className="text-stone-500 max-w-xl mx-auto">
              From Diwali hampers to onboarding kits — manage every gift campaign from a single dashboard.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Gift className="w-6 h-6" />,
                title: 'Campaign Management',
                description: 'Create campaigns, set budgets per recipient, pick products from our curated catalog, and launch in minutes.'
              },
              {
                icon: <Zap className="w-6 h-6" />,
                title: 'Magic Link Delivery',
                description: 'Recipients get a personalized link via email. No login required — just click, fill address, and claim their gift.'
              },
              {
                icon: <Users className="w-6 h-6" />,
                title: 'Bulk CSV Import',
                description: 'Upload hundreds of recipients via CSV. We handle deduplication, validation, and bulk email dispatch.'
              },
              {
                icon: <Wallet className="w-6 h-6" />,
                title: 'Wallet & Budgeting',
                description: 'Pre-load your wallet, set campaign budgets, and track spending in real-time with full ledger history.'
              },
              {
                icon: <BarChart3 className="w-6 h-6" />,
                title: 'Real-time Analytics',
                description: 'Track who opened, viewed, redeemed, or opted out. Get campaign reports with a single click.'
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: 'GST Compliance',
                description: 'Auto-generated invoices with HSN codes, GST breakdown, and proforma invoices for every order.'
              }
            ].map((feature, i) => (
              <div key={i} className="group p-6 rounded-2xl border border-stone-200 bg-white hover:border-vermillion-200 hover:shadow-lg hover:shadow-vermillion-50 transition-all duration-300">
                <div className="w-11 h-11 rounded-xl bg-vermillion-50 text-vermillion-600 flex items-center justify-center mb-4 group-hover:bg-vermillion-100 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-stone-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-stone-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 mb-4">
              How it works
            </h2>
            <p className="text-stone-500 max-w-xl mx-auto">
              Three simple steps to send gifts to your team, clients, or partners.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create Campaign', desc: 'Set a budget, pick products from our catalog, and upload recipient details via CSV.' },
              { step: '02', title: 'Send Magic Links', desc: 'We email unique magic links to each recipient. They click and claim in seconds.' },
              { step: '03', title: 'Track & Analyze', desc: 'Monitor redemptions in real-time. Export reports, manage budget, and reorder.' }
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-vermillion-100 text-vermillion-700 flex items-center justify-center text-xl font-bold mx-auto mb-5">
                  {item.step}
                </div>
                <h3 className="font-semibold text-stone-900 text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Catalog Preview */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 mb-4">
            Curated catalog of 20+ products
          </h2>
          <p className="text-stone-500 max-w-xl mx-auto mb-12">
            From Diwali hampers to digital vouchers — choose from our handpicked selection or add your own products.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Diwali Hampers', emoji: '🎁', count: '4 products' },
              { name: 'Snack Boxes', emoji: '🍪', count: '2 products' },
              { name: 'Digital Vouchers', emoji: '💳', count: '5 products' },
              { name: 'Wellness Kits', emoji: '🧘', count: '2 products' },
              { name: 'Stationery', emoji: '✏️', count: '2 products' },
              { name: 'Onboarding Kits', emoji: '👋', count: '2 products' },
              { name: 'Accessories', emoji: '👜', count: '3 products' },
              { name: 'Tea Sets', emoji: '🫖', count: '1 product' }
            ].map((cat, i) => (
              <div key={i} className="p-5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-vermillion-50 hover:border-vermillion-200 transition-all duration-300 cursor-default">
                <div className="text-3xl mb-2">{cat.emoji}</div>
                <div className="font-medium text-sm text-stone-900">{cat.name}</div>
                <div className="text-xs text-stone-400 mt-0.5">{cat.count}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-stone-900 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
            Ready to simplify corporate gifting?
          </h2>
          <p className="text-stone-400 max-w-lg mx-auto mb-10 text-lg">
            Join companies across India using Nazrana to send thoughtful gifts at scale.
          </p>
          <Link 
            href="/register" 
            className="inline-block bg-vermillion-600 hover:bg-vermillion-700 text-white px-10 py-4 rounded-xl text-lg font-semibold transition-all shadow-lg shadow-vermillion-900/30"
          >
            Start Free Trial
          </Link>
          <p className="mt-4 text-sm text-stone-500">No credit card. Free for your first campaign.</p>
        </div>
      </section>

      <GlobalFooter />
    </div>
  );
}