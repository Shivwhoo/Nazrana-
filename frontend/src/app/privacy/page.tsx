import { NazranaLogo } from '@/components/NazranaLogo';
import Link from 'next/link';
import { GlobalFooter } from '@/components/Footer';

export default function PrivacyPage() {
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
        <div className="max-w-3xl mx-auto prose prose-stone">
          <h1 className="text-3xl font-serif font-bold text-stone-900 mb-8">Privacy Policy</h1>
          <p className="text-sm text-stone-500 mb-8">Last updated: July 2026</p>

          <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">1. Information We Collect</h2>
          <p className="text-stone-600 leading-relaxed mb-4">
            When you use Nazrana, we collect information you provide directly: your name, email address, 
            company name, GSTIN, and billing details. When you upload recipient lists via CSV, we store 
            the names, email addresses, and phone numbers you provide.
          </p>

          <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">2. How We Use Your Information</h2>
          <p className="text-stone-600 leading-relaxed mb-4">
            We use your information to operate the Nazrana platform: creating campaigns, sending gift 
            invitations via email, processing payments, generating invoices, and providing analytics. 
            We do not sell your data to third parties.
          </p>

          <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">3. Data Security</h2>
          <p className="text-stone-600 leading-relaxed mb-4">
            We implement industry-standard security measures including encryption at rest and in transit, 
            secure token-based authentication, and regular security audits. Recipient data is stored 
            with encrypted fields for sensitive information.
          </p>

          <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">4. Data Retention</h2>
          <p className="text-stone-600 leading-relaxed mb-4">
            We retain your data for as long as your account is active. When you delete your account, 
            we delete your organization data within 30 days. Recipient data is retained for campaign 
            reporting purposes and deleted upon account closure.
          </p>

          <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">5. Contact</h2>
          <p className="text-stone-600 leading-relaxed mb-4">
            For privacy-related inquiries, contact us at <a href="mailto:privacy@nazrana.in" className="text-vermillion-600 hover:underline">privacy@nazrana.in</a>.
          </p>
        </div>
      </section>
      <GlobalFooter />
    </div>
  );
}