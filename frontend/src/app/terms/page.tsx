import { NazranaLogo } from '@/components/NazranaLogo';
import Link from 'next/link';
import { GlobalFooter } from '@/components/Footer';

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <nav className="bg-white/90 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <NazranaLogo size={32} className="text-stone-900" />
            <span className="font-serif font-bold text-xl text-stone-900">Nazrana</span>
          </Link>
        </div>
      </nav>
      <section className="flex-1 py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-serif font-bold text-stone-900 mb-8">Terms of Service</h1>
          <p className="text-sm text-stone-500 mb-8">Last updated: July 2026</p>

          <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">1. Agreement</h2>
          <p className="text-stone-600 leading-relaxed mb-4">
            These Terms govern your use of the Nazrana platform. By accessing or using the Service, you agree to be bound by these Terms.
          </p>

          <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">2. Account</h2>
          <p className="text-stone-600 leading-relaxed mb-4">
            You must be at least 18 years old. You are responsible for maintaining the confidentiality of your account credentials.
          </p>

          <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">3. Payment Terms</h2>
          <p className="text-stone-600 leading-relaxed mb-4">
            You must pre-load your wallet before activating campaigns. A 5% platform service fee applies. GST is applicable on all transactions.
          </p>

          <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">4. Recipient Data</h2>
          <p className="text-stone-600 leading-relaxed mb-4">
            You are responsible for ensuring consent to contact all recipients. Nazrana is not liable for misuse of recipient data by customers.
          </p>

          <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">5. Limitation of Liability</h2>
          <p className="text-stone-600 leading-relaxed mb-4">
            To the fullest extent permitted by law, Nazrana shall not be liable for any indirect, incidental, or consequential damages.
          </p>

          <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">6. Contact</h2>
          <p className="text-stone-600 leading-relaxed mb-4">
            For questions, contact <a href="mailto:legal@nazrana.in" className="text-vermillion-600 hover:underline">legal@nazrana.in</a>.
          </p>
        </div>
      </section>
      <GlobalFooter />
    </div>
  );
}
