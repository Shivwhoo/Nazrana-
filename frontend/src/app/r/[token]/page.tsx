import { notFound } from 'next/navigation';
import RecipientExperience from './recipient-experience';

export default async function RecipientPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  
  if (!token || token.length !== 32) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <h1 className="text-xl font-serif text-stone-900 mb-2">This gift link is not available</h1>
          <p className="text-stone-500 text-sm">Please check the link or contact your organization.</p>
        </div>
      </div>
    );
  }

  // Fetch campaign data from backend (SSR)
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/recipient/${token}`, {
    cache: 'no-store' // We need fresh data always to update the VIEWED status
  });

  if (!res.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <h1 className="text-xl font-serif text-stone-900 mb-2">This gift link is not available</h1>
          <p className="text-stone-500 text-sm">Please check the link or contact your organization.</p>
        </div>
      </div>
    );
  }

  const data = await res.json();

  return (
    <div className="min-h-screen bg-stone-50 selection:bg-stone-200">
      <RecipientExperience token={token} initialData={data} />
    </div>
  );
}
