'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INDIAN_STATES } from '@gifting/shared';
import { Loader2, Save, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SettingsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const token = (session as any)?.backendToken;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [gstin, setGstin] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [accentColor, setAccentColor] = useState('#e34120');

  // Load org data
  useEffect(() => {
    if (!token || !orgId) return;
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orgs/${orgId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.org) {
          setName(data.org.name || '');
          setGstin(data.org.gstin || '');
          setStateCode(data.org.stateCode || '');
          const branding = data.org.brandingDefaults || {};
          setLogoUrl(branding.logoUrl || '');
          setAccentColor(branding.accentColor || '#e34120');
        }
      })
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false));
  }, [orgId, token]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const body: any = {};
      if (name.trim()) body.name = name.trim();
      if (gstin.trim()) body.gstin = gstin.trim().toUpperCase();
      if (stateCode) body.stateCode = stateCode;
      body.brandingDefaults = {
        logoUrl: logoUrl.trim() || null,
        accentColor,
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orgs/${orgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 font-serif">Settings</h1>
        <p className="mt-2 text-sm text-stone-500">
          Manage your organization profile and branding.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md text-sm flex items-start gap-3 border border-red-200">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {saved && (
        <div className="p-4 bg-green-50 text-green-700 rounded-md text-sm flex items-start gap-3 border border-green-200">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p>Settings saved successfully!</p>
        </div>
      )}

      {/* Company Info */}
      <Card className="border-stone-200 shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-xl font-serif text-stone-900">Company Information</CardTitle>
          <CardDescription>Your organization details used for invoicing and compliance.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Company Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} className="max-w-md" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gstin">GSTIN</Label>
            <Input id="gstin" value={gstin} onChange={e => setGstin(e.target.value.toUpperCase())} className="max-w-md uppercase" maxLength={15} />
            <p className="text-xs text-stone-500">15-character GST Identification Number</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
          <Select value={stateCode} onValueChange={(val) => setStateCode(val || '')}>
              <SelectTrigger className="max-w-md border-stone-300">
                <SelectValue placeholder="Select a state" />
              </SelectTrigger>
              <SelectContent>
                {INDIAN_STATES.map((state) => (
                  <SelectItem key={state.code} value={state.code}>
                    {state.name} ({state.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card className="border-stone-200 shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-xl font-serif text-stone-900">Branding</CardTitle>
          <CardDescription>Customize how your gift pages look to recipients.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input id="logoUrl" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" className="max-w-md" />
            <p className="text-xs text-stone-500">URL to your company logo (will appear on recipient gift pages)</p>
            {logoUrl && (
              <div className="mt-2 p-3 bg-stone-50 rounded border border-stone-200 inline-block">
                <img src={logoUrl} alt="Preview" className="h-10 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="accentColor">Accent Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                id="accentColor"
                value={accentColor}
                onChange={e => setAccentColor(e.target.value)}
                className="h-10 w-16 rounded border border-stone-300 cursor-pointer"
              />
              <span className="text-sm text-stone-500 font-mono">{accentColor}</span>
            </div>
            <p className="text-xs text-stone-500">Used for buttons and highlights on recipient gift pages</p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-stone-900 text-white hover:bg-stone-800 px-8"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}