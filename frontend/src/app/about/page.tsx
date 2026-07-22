import { NazranaLogo } from '@/components/NazranaLogo';
import Link from 'next/link';
import { GlobalFooter } from '@/components/Footer';
import { Gift, Building2, TrendingUp, Shield } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      {/* Nav */}
      <nav className="bg-white/90 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <NazranaLogo size={32} className="text-stone-900" />
            <span className="font-serif font-bold text-xl text-stone-900">Nazrana</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-stone-600 hover:text-stone-900">Sign In</Link>
            <Link href="/register" className="text-sm font-medium bg-vermillion-600 hover:bg-vermillion-700 text-white px-5 py-2 rounded-lg">Get Started</Link>
          </div>
        </div>
      </nav>

      <section className="pt-20 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-stone-900 mb-6 text-center">About Nazrana</h1>
          <p className="text-lg text-stone-500 max-w-2xl mx-auto text-center mb-16">
            Making corporate gifting effortless, trackable, and delightful for businesses across India.
          </p>

          {/* Mission */}
          <div className="bg-white border border-stone-200 rounded-2xl p-8 md:p-12 shadow-sm mb-8">
            <h2 className="text-2xl font-serif font-bold text-stone-900 mb-4">Our mission</h2>
            <p className="text-stone-600 leading-relaxed">
              Corporate gifting in India is broken. HR teams spend hours coordinating spreadsheets, 
              chasing vendors, and manually tracking deliveries. Recipients receive impersonal gifts 
              with no proper claim experience. And finance teams struggle with GST compliance.
            </p>
            <p className="text-stone-600 leading-relaxed mt-4">
              Nazrana fixes this. We provide a single platform where companies can launch gifting 
              campaigns, set budgets, pick products, and send personalized magic links — all in minutes. 
              Every gift is tracked, every rupee is accounted for, and every recipient gets a 
              delightful experience.
            </p>
          </div>

          {/* What sets us apart */}
          <h2 className="text-2xl font-serif font-bold text-stone-900 mb-6 text-center">What sets us apart</h2>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {[
              { icon: <Gift className="w-6 h-6" />, title: 'Campaign-first approach', desc: 'Not a store. A campaign manager. Set budgets, pick products, upload recipients, launch.' },
              { icon: <Shield className="w-6 h-6" />, title: 'GST compliance built-in', desc: 'Auto-generated invoices with HSN codes, GST breakdown, and proforma invoices.' },
              { icon: <TrendingUp className="w-6 h-6" />, title: 'Real-time analytics', desc: 'Track who opened, viewed, redeemed, or opted out. Every campaign is measurable.' },
              { icon: <Building2 className="w-6 h-6" />, title: 'Built for India', desc: 'Razorpay payments, Indian state GST codes, Indian festivals and gifting seasons.' },
            ].map((item) => (
              <div key={item.title} className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-vermillion-50 text-vermillion-600 flex items-center justify-center mb-3">{item.icon}</div>
                <h3 className="font-semibold text-stone-900 mb-1">{item.title}</h3>
                <p className="text-sm text-stone-500">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Contact */}
          <div className="bg-stone-900 text-white rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-2xl font-serif font-bold mb-4">Get in touch</h2>
            <p className="text-stone-400 mb-6 max-w-lg mx-auto">
              Have questions about Nazrana? Want a custom demo for your organization?
            </p>
            <a href="mailto:hello@nazrana.in" className="inline-block bg-vermillion-600 hover:bg-vermillion-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors">
              hello@nazrana.in
            </a>
          </div>
        </div>
      </section>

      <GlobalFooter />
    </div>
  );
}