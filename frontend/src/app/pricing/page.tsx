import { NazranaLogo } from '@/components/NazranaLogo';
import Link from 'next/link';
import { GlobalFooter } from '@/components/Footer';
import { CheckCircle2, HelpCircle } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: '₹9,999',
    period: '/month',
    description: 'For small teams getting started with corporate gifting.',
    features: [
      'Up to 100 recipients per campaign',
      '5 active campaigns',
      'Curated product catalog access',
      'CSV recipient import',
      'Email support',
      'Basic analytics',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
  },
  {
    name: 'Growth',
    price: '₹24,999',
    period: '/month',
    description: 'For growing organizations with regular gifting needs.',
    features: [
      'Up to 500 recipients per campaign',
      'Unlimited active campaigns',
      'Full product catalog access',
      'CSV recipient import',
      'Priority email & chat support',
      'Advanced analytics & export',
      'Custom branding on gift pages',
      'Team member invites (up to 5)',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations with custom requirements.',
    features: [
      'Unlimited recipients',
      'Unlimited campaigns',
      'Custom product catalog',
      'Dedicated account manager',
      'API access & integrations',
      'Custom reporting',
      'White-label gift pages',
      'SLA guarantee',
      'Custom invoice & GST setup',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      {/* Simple Nav */}
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

      {/* Pricing Header */}
      <section className="pt-20 pb-12 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-stone-900 mb-4">Simple, transparent pricing</h1>
        <p className="text-lg text-stone-500 max-w-xl mx-auto">
          No hidden fees. No long-term contracts. Start with a free campaign and upgrade as you grow.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 items-start">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-8 ${
                plan.highlighted
                  ? 'bg-white border-vermillion-200 shadow-xl shadow-vermillion-100 scale-105'
                  : 'bg-white border-stone-200 shadow-sm'
              }`}
            >
              {plan.highlighted && (
                <div className="inline-block bg-vermillion-600 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">
                  Most Popular
                </div>
              )}
              <h3 className="text-xl font-serif font-bold text-stone-900 mb-1">{plan.name}</h3>
              <p className="text-sm text-stone-500 mb-6">{plan.description}</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-stone-900">{plan.price}</span>
                <span className="text-stone-400">{plan.period}</span>
              </div>
              <Link
                href={plan.name === 'Enterprise' ? 'mailto:sales@nazrana.in' : '/register'}
                className={`block w-full text-center py-3 rounded-xl text-sm font-semibold transition-all ${
                  plan.highlighted
                    ? 'bg-vermillion-600 text-white hover:bg-vermillion-700 shadow-md'
                    : 'bg-stone-900 text-white hover:bg-stone-800'
                }`}
              >
                {plan.cta}
              </Link>
              <ul className="mt-8 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-stone-600">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 bg-white border-t border-stone-200">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-serif font-bold text-stone-900 text-center mb-10">Frequently asked questions</h2>
          <div className="space-y-6">
            {[
              { q: 'Can I try before I buy?', a: 'Yes! Your first campaign is completely free. No credit card required.' },
              { q: 'What payment methods do you accept?', a: 'We accept Razorpay (cards, UPI, net banking) and bank transfers for enterprise plans.' },
              { q: 'Do you charge GST?', a: 'Yes, GST is applicable as per Indian tax laws and will be reflected on your invoice.' },
              { q: 'Can I cancel anytime?', a: 'Yes. No long-term contracts. You can cancel your subscription at any time.' },
              { q: 'What if I need more recipients?', a: 'Contact us for custom enterprise pricing. We accommodate organizations of all sizes.' },
            ].map((faq) => (
              <div key={faq.q} className="border-b border-stone-100 pb-4">
                <h3 className="font-medium text-stone-900 mb-1">{faq.q}</h3>
                <p className="text-sm text-stone-500">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <GlobalFooter />
    </div>
  );
}