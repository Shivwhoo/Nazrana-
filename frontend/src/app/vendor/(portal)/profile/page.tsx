'use client';

import { useEffect, useState } from 'react';
import { useVendorAuth } from '../../../../lib/vendor-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function VendorProfilePage() {
  const { token, isLoading, user } = useVendorAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [contact, setContact] = useState('');
  const [pincodes, setPincodes] = useState('');
  const [payoutDetails, setPayoutDetails] = useState('');

  useEffect(() => {
    if (isLoading || !token) return;

    fetch('http://localhost:4000/api/vendor/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setContact(data.contact || '');
        setPincodes(Array.isArray(data.serviceablePincodes) ? data.serviceablePincodes.join(', ') : '');
        setPayoutDetails(data.payoutDetails ? JSON.stringify(data.payoutDetails, null, 2) : '');
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [token, isLoading]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    
    let parsedPayout = {};
    try {
      if (payoutDetails) parsedPayout = JSON.parse(payoutDetails);
    } catch (e) {
      alert('Payout Details must be valid JSON');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('http://localhost:4000/api/vendor/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contact,
          serviceablePincodes: pincodes.split(',').map(p => p.trim()).filter(Boolean),
          payoutDetails: parsedPayout
        })
      });

      if (!res.ok) throw new Error('Failed to update profile');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('An error occurred while saving profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading || isLoading) {
    return <div className="animate-pulse text-[#221C14]">Loading profile...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif text-[#221C14]">Vendor Profile</h1>
        <p className="text-sm text-[#221C14]/60">Manage your contact, serviceability, and payout information.</p>
      </div>

      <div className="bg-white border border-[#221C14]/10 rounded-lg p-6 space-y-6">
        <div className="pb-4 border-b border-[#221C14]/10">
          <h2 className="text-sm font-semibold text-[#221C14] uppercase tracking-wider mb-2">Account Info</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[#221C14]/60">Business Name</p>
              <p className="font-medium text-[#221C14]">{user?.name}</p>
            </div>
            <div>
              <p className="text-[#221C14]/60">Login Email</p>
              <p className="font-medium text-[#221C14]">{user?.email}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="contact" className="text-[#221C14]">Contact Info (Email/Phone)</Label>
            <Input 
              id="contact" 
              value={contact} 
              onChange={e => setContact(e.target.value)}
              className="border-[#221C14]/20 focus-visible:ring-[#B23A1E]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pincodes" className="text-[#221C14]">Serviceable Pincodes (Comma separated)</Label>
            <Input 
              id="pincodes" 
              value={pincodes} 
              onChange={e => setPincodes(e.target.value)}
              placeholder="e.g. 110001, 110002"
              className="border-[#221C14]/20 focus-visible:ring-[#B23A1E] font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payout" className="text-[#221C14]">Payout Details (JSON Format)</Label>
            <textarea 
              id="payout" 
              value={payoutDetails} 
              onChange={e => setPayoutDetails(e.target.value)}
              className="w-full flex min-h-[120px] rounded-md border border-[#221C14]/20 bg-transparent px-3 py-2 text-sm shadow-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B23A1E]"
              placeholder={'{\n  "bank": "HDFC",\n  "accountNo": "123456789"\n}'}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#221C14]/10">
            {success && <span className="text-green-700 text-sm">Saved successfully!</span>}
            <Button 
              type="submit" 
              disabled={saving}
              className="bg-[#B23A1E] hover:bg-[#822917] text-white"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
