import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { WalletDashboard } from './wallet-dashboard';

export default async function WalletPage({ params }: { params: Promise<{ orgId: string }> }) {
  const session = await auth();
  if (!session) redirect('/login');
  const token = (session as any).backendToken;

  const { orgId } = await params;
  
  // We fetch the wallet via server side to pass initial data
  const walletRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orgs/${orgId}/wallet`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!walletRes.ok) {
    if (walletRes.status === 401 || walletRes.status === 403) {
      redirect('/api/auth/signin');
    }
    // handle error
    return <div>Failed to load wallet</div>;
  }
  
  const wallet = await walletRes.json();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-serif text-stone-900">Wallet & Billing</h1>
      </div>
      <WalletDashboard initialWallet={wallet.wallet} orgId={orgId} token={token} />
    </div>
  );
}
