'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Vendor = {
  id: string;
  name: string;
  contact: string;
  fulfillmentType: 'EMAIL' | 'API' | 'DIGITAL';
  status: 'ACTIVE' | 'INACTIVE';
};

export default function AdminVendorsPage() {
  const { data: session } = useSession();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  // Vendor form state
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [vendorForm, setVendorForm] = useState({ name: '', contact: '', fulfillmentType: 'EMAIL' });
  const [vendorSaving, setVendorSaving] = useState(false);
  const [vendorError, setVendorError] = useState('');

  const token = (session as any)?.backendToken;

  const fetchData = async () => {
    setLoading(true);
    const vRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/catalog/vendors`, { headers: { Authorization: `Bearer ${token}` } });
    const vData = await vRes.json();
    setVendors(vData.vendors || []);
    setLoading(false);
  };

  useEffect(() => {
    if (session) fetchData();
  }, [session]);

  const saveVendor = async () => {
    setVendorError('');
    setVendorSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/catalog/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(vendorForm),
      });
      if (!res.ok) {
        const d = await res.json();
        setVendorError(d.message || 'Failed to create vendor');
        return;
      }
      setShowVendorForm(false);
      setVendorForm({ name: '', contact: '', fulfillmentType: 'EMAIL' });
      fetchData();
    } catch {
      setVendorError('Unexpected error');
    } finally {
      setVendorSaving(false);
    }
  };

  const deactivateVendor = async (id: string) => {
    if (!confirm('Deactivate this vendor?')) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/catalog/vendors/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-stone-500 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading vendors...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl relative">
      <div>
        <h1 className="text-xl font-bold text-stone-800 uppercase tracking-widest">Vendors</h1>
        <p className="text-sm text-stone-500 mt-1">Manage platform vendors and fulfillment integrations.</p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-stone-500">{vendors.length} vendors</p>
          <Button size="sm" onClick={() => setShowVendorForm(v => !v)} className="bg-stone-800 hover:bg-stone-700 text-white">
            <Plus className="h-4 w-4 mr-1" /> Add Vendor
          </Button>
        </div>

        {showVendorForm && (
          <Card className="border-stone-200">
            <CardHeader><CardTitle className="text-sm uppercase tracking-widest">New Vendor</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs uppercase tracking-wide">Name</Label>
                  <Input value={vendorForm.name} onChange={e => setVendorForm(f => ({ ...f, name: e.target.value }))} placeholder="Vendor name" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wide">Contact Email</Label>
                  <Input value={vendorForm.contact} onChange={e => setVendorForm(f => ({ ...f, contact: e.target.value }))} placeholder="orders@vendor.in" className="mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide">Fulfillment Type</Label>
                <select
                  value={vendorForm.fulfillmentType}
                  onChange={e => setVendorForm(f => ({ ...f, fulfillmentType: e.target.value }))}
                  className="mt-1 w-full border border-stone-200 rounded px-3 py-2 text-sm bg-white"
                >
                  <option value="EMAIL">EMAIL — Purchase order email</option>
                  <option value="DIGITAL">DIGITAL — Instant voucher</option>
                  <option value="API">API — Direct integration</option>
                </select>
              </div>
              {vendorError && <p className="text-sm text-red-600">{vendorError}</p>}
              <div className="flex gap-2">
                <Button size="sm" onClick={saveVendor} disabled={vendorSaving} className="bg-stone-800 text-white hover:bg-stone-700">
                  {vendorSaving ? 'Saving...' : 'Save Vendor'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowVendorForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-400">
              <th className="py-2 pr-4">Vendor</th>
              <th className="py-2 pr-4">Contact</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {vendors.map(v => (
              <tr key={v.id} className="border-b border-stone-100 hover:bg-stone-50">
                <td className="py-3 pr-4 font-medium text-stone-800">{v.name}</td>
                <td className="py-3 pr-4 text-stone-500">{v.contact}</td>
                <td className="py-3 pr-4">
                  <span className="font-mono text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded">
                    {v.fulfillmentType}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <span className={`text-xs font-medium ${v.status === 'ACTIVE' ? 'text-green-700' : 'text-stone-400'}`}>
                    {v.status}
                  </span>
                </td>
                <td className="py-3">
                  <button
                    onClick={() => deactivateVendor(v.id)}
                    className="text-stone-400 hover:text-red-600 transition-colors"
                    title="Deactivate"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
