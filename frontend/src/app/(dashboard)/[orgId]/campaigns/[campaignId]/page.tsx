'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2, Download, PackageOpen, Eye, Gift, Truck, CheckCircle2, AlertCircle, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function CampaignReportPage() {
  const { orgId, campaignId } = useParams();
  const { data: session } = useSession();
  const token = (session as any)?.backendToken;

  const [campaign, setCampaign] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [importStatus, setImportStatus] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    
    const fetchReport = async () => {
      try {
        const [cRes, aRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orgs/${orgId}/campaigns/${campaignId}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orgs/${orgId}/campaigns/${campaignId}/analytics`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        if (cRes.ok && aRes.ok) {
          const cData = await cRes.json();
          const aData = await aRes.json();
          setCampaign(cData.campaign);
          setAnalytics(aData);
        }
      } catch (err) {
        console.error('Failed to fetch campaign report', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [orgId, campaignId, token]);

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-stone-400" /></div>;
  }

  if (!campaign) {
    return <div className="p-12 text-center text-stone-500">Campaign not found.</div>;
  }

  const { funnel, financials, productPicks } = analytics;
  const formatMoney = (cents: number) => `₹${(cents / 100).toLocaleString()}`;

  const handleExport = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orgs/${orgId}/campaigns/${campaignId}/export`,
        {
          method: 'GET',
          headers: { 
            Authorization: `Bearer ${token}` 
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to export recipients');
      }

      // Convert the response to a Blob (binary data)
      const blob = await response.blob();
      
      // Create a temporary URL for the Blob
      const url = window.URL.createObjectURL(blob);
      
      // Create an invisible anchor tag to trigger the download
      const a = document.createElement('a');
      a.href = url;
      // You can adjust the extension to .csv, .xlsx, etc., based on what your API returns
      a.download = `${campaign.name.replace(/\s+/g, '-').toLowerCase()}-export.csv`; 
      
      document.body.appendChild(a);
      a.click(); // Trigger the download
      
      // Clean up the DOM and release the object URL
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to download the export. Please try again.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orgs/${orgId}/campaigns/${campaignId}/recipients/csv`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        const d = await res.json();
        pollImportStatus(d.importId);
      } else {
        alert('Failed to upload recipients');
        setUploading(false);
      }
    } catch {
      alert('Error uploading recipients');
      setUploading(false);
    }
    
    // reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const pollImportStatus = async (id: string) => {
    const int = setInterval(async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orgs/${orgId}/campaigns/${campaignId}/recipients/import-status/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setImportStatus(data);
      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        clearInterval(int);
        setUploading(false);
        // Refresh analytics on completion
        window.location.reload();
      }
    }, 2000);
  };

  const handleActivate = async () => {
    try {
      setUploading(true); // Reusing uploading state for a generic loading spinner
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orgs/${orgId}/campaigns/${campaignId}/activate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to activate campaign');
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight text-stone-900 font-serif">{campaign.name}</h1>
            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
              campaign.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' :
              campaign.status === 'COMPLETED' ? 'bg-stone-100 text-stone-700 border-stone-200' :
              'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {campaign.status}
            </span>
          </div>
          <p className="text-sm text-stone-500">
            Created on {new Date(campaign.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center bg-white text-stone-900 border border-stone-200 px-4 py-2 rounded text-sm hover:bg-stone-50 transition-colors shadow-sm disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            {uploading ? 'Uploading...' : 'Upload CSV'}
          </button>
          
          {campaign.status === 'DRAFT' && (
            <>
              <button 
                onClick={handleActivate}
                disabled={uploading}
                className="inline-flex items-center bg-vermillion-600 text-white px-4 py-2 rounded text-sm hover:bg-vermillion-700 transition-colors shadow-sm disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Activate Campaign
              </button>
              <button 
                onClick={() => router.push(`/${orgId}/campaigns/new?id=${campaignId}`)}
                className="inline-flex items-center bg-white text-stone-700 border border-stone-300 px-4 py-2 rounded text-sm hover:bg-stone-50 transition-colors shadow-sm"
              >
                Edit Campaign
              </button>
            </>
          )}

          <button 
            onClick={handleExport}
            className="inline-flex items-center bg-stone-900 text-white px-4 py-2 rounded text-sm hover:bg-stone-800 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {importStatus && importStatus.status !== 'COMPLETED' && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded flex items-center justify-between text-sm">
          <div className="flex items-center">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing CSV: {importStatus.processedRows} / {importStatus.totalRows || '?'} rows
          </div>
          <span className="font-medium">{importStatus.status}</span>
        </div>
      )}

      {importStatus?.status === 'COMPLETED' && importStatus?.errorReport && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded text-sm">
          <div className="font-medium mb-1">Upload Completed with Errors</div>
          <pre className="text-xs overflow-auto max-h-32">
            {JSON.stringify(importStatus.errorReport, null, 2)}
          </pre>
        </div>
      )}

      {/* Visual Funnel */}
      <h2 className="text-xl font-serif text-stone-900 mt-8 mb-4">Recipient Journey</h2>
      <div className="grid grid-cols-5 gap-4">
        <FunnelStep 
          icon={<PackageOpen className="w-6 h-6 text-blue-600" />} 
          label="Invited" 
          count={funnel.invited} 
          color="bg-blue-50 border-blue-200"
        />
        <FunnelStep 
          icon={<Eye className="w-6 h-6 text-purple-600" />} 
          label="Viewed" 
          count={funnel.viewed} 
          color="bg-purple-50 border-purple-200"
        />
        <FunnelStep 
          icon={<Gift className="w-6 h-6 text-amber-600" />} 
          label="Redeemed" 
          count={funnel.redeemed} 
          color="bg-amber-50 border-amber-200"
        />
        <FunnelStep 
          icon={<Truck className="w-6 h-6 text-indigo-600" />} 
          label="Shipped" 
          count={funnel.shipped} 
          color="bg-indigo-50 border-indigo-200"
        />
        <FunnelStep 
          icon={<CheckCircle2 className="w-6 h-6 text-green-600" />} 
          label="Delivered" 
          count={funnel.delivered} 
          color="bg-green-50 border-green-200"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {/* Financial Analytics */}
        <Card className="border-stone-200 shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-serif">Financial Overview</CardTitle>
            <CardDescription>Real-time spend and budget tracking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-stone-100">
              <span className="text-stone-600">Total Spent</span>
              <span className="font-mono text-lg font-medium text-stone-900">{formatMoney(financials.totalSpent)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-stone-100">
              <span className="text-stone-600">Active Holds (Estimated)</span>
              <span className="font-mono text-stone-500 text-sm">See Wallet Dashboard for exact limits</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-stone-100">
              <span className="text-stone-600">Total Orders Processed</span>
              <span className="font-mono text-lg text-stone-900">{financials.totalOrders}</span>
            </div>
          </CardContent>
        </Card>

        {/* Exceptions & Drop-offs */}
        <Card className="border-stone-200 shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-serif">Exceptions & Bounces</CardTitle>
            <CardDescription>Recipients requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-stone-100">
              <span className="text-stone-600">Fulfillment Exceptions</span>
              <span className="font-mono text-red-600 font-medium">{funnel.exception}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-stone-100">
              <span className="text-stone-600">Email Bounces</span>
              <span className="font-mono text-amber-600">{funnel.bounced}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-stone-100">
              <span className="text-stone-600">Opted Out (Budget Saved)</span>
              <span className="font-mono text-green-600">{funnel.optedOut}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-stone-100">
              <span className="text-stone-600">Manually Removed</span>
              <span className="font-mono text-stone-500">{funnel.removed}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Choice Breakdown */}
      {campaign.mode === 'CHOICE' && Object.keys(productPicks).length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-serif text-stone-900 mb-4">Product Picks</h2>
          <div className="bg-white border border-stone-200 rounded overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-stone-50 text-stone-600 border-b border-stone-200 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Product Title</th>
                  <th className="px-4 py-3 font-medium text-right">Times Picked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {Object.entries(productPicks).map(([title, count]: [string, any]) => (
                  <tr key={title} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-medium text-stone-900">{title}</td>
                    <td className="px-4 py-3 text-right font-mono text-stone-600">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function FunnelStep({ icon, label, count, color }: { icon: React.ReactNode, label: string, count: number, color: string }) {
  return (
    <div className={`p-4 rounded border ${color} flex flex-col items-center justify-center text-center shadow-sm`}>
      <div className="mb-2">{icon}</div>
      <div className="text-2xl font-bold font-mono text-stone-900 mb-1">{count}</div>
      <div className="text-xs font-medium uppercase tracking-wider text-stone-600">{label}</div>
    </div>
  );
}
