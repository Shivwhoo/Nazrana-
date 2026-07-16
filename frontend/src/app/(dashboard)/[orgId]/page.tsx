import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, ChevronRight, BarChart2 } from 'lucide-react';
import { auth } from '@/auth';

export default async function DashboardPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const session = await auth();
  const token = (session as any)?.backendToken;

  let campaigns: any[] = [];
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orgs/${orgId}/campaigns`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      campaigns = data.campaigns || [];
    }
  } catch (error) {
    console.error('Failed to fetch campaigns', error);
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 font-serif">Dashboard</h1>
          <p className="mt-2 text-sm text-stone-500">
            Manage your campaigns and wallet balance here.
          </p>
        </div>
        {campaigns.length > 0 && (
          <Button asChild className="bg-vermillion-600 hover:bg-vermillion-700 text-white shadow-sm">
            <Link href={`/${orgId}/campaigns/new`}>
              New Campaign
            </Link>
          </Button>
        )}
      </div>

      {campaigns.length === 0 ? (
        <Card className="border-stone-200 shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-xl font-serif text-stone-900">Get Started</CardTitle>
            <CardDescription>
              You haven't sent any gifts yet. Let's create your first campaign.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-20 w-20 bg-vermillion-50 rounded-full flex items-center justify-center mb-6">
              <Gift className="h-10 w-10 text-vermillion-600" />
            </div>
            <h3 className="text-lg font-medium text-stone-900 font-serif mb-2">No campaigns found</h3>
            <p className="text-stone-500 max-w-sm mb-6">
              Create a campaign to send Diwali hampers, onboarding kits, or anniversaries to your team.
            </p>
            <Button asChild className="bg-vermillion-600 hover:bg-vermillion-700 text-white shadow-sm">
              <Link href={`/${orgId}/campaigns/new`}>
                Send your first gift
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white border border-stone-200 rounded overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-stone-50 text-stone-600 border-b border-stone-200 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Campaign Name</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date Created</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {campaigns.map(c => (
                <tr key={c.id} className="hover:bg-stone-50 transition-colors group cursor-pointer">
                  <td className="px-4 py-3 font-medium text-stone-900">
                    <Link href={`/${orgId}/campaigns/${c.id}`} className="block">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border tabular-nums ${
                      c.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' :
                      c.status === 'COMPLETED' ? 'bg-stone-100 text-stone-700 border-stone-200' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-500 tabular-nums">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link 
                      href={`/${orgId}/campaigns/${c.id}`} 
                      className="inline-flex items-center text-vermillion-600 hover:text-vermillion-700 font-medium text-xs"
                    >
                      <BarChart2 className="w-3.5 h-3.5 mr-1" /> View Report
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
