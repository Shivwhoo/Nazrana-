'use client';

import { useState } from 'react';
import { Loader2, PackageCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RecipientExperience({ token, initialData }: { token: string, initialData: any }) {
  const { recipient, campaign } = initialData;
  const [step, setStep] = useState(recipient.status === 'REDEEMED' ? 'TRACKING' : 'GREETING');
  
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [pincode, setPincode] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Custom Branding
  const accentColor = campaign.branding?.accentColor || '#e63946';
  const logoUrl = campaign.branding?.logoUrl || null;
  const orgName = campaign.organization?.name || 'Nazrana';

  const handleStart = () => {
    if (campaign.mode === 'SINGLE') {
      const v = campaign.products[0]?.variants[0];
      if (v) setSelectedVariant(v);
      setStep('ADDRESS');
    } else {
      setStep('SELECTION');
    }
  };

  const checkPincodeAndProceed = async () => {
    if (!pincode || pincode.length !== 6 || !address || phone.length < 10) {
      setError('Please fill all fields correctly');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/recipient/${token}/check-pincode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId: selectedVariant.id, pincode })
      });
      const data = await res.json();
      
      if (!data.serviceable) {
        setError('Your pincode is not serviceable for this item. We can offer you a digital voucher instead.');
        if (data.fallbackVariantId) {
          // find fallback
          let fb: any = null;
          for (const p of campaign.products) {
            for (const v of p.variants) {
              if (v.id === data.fallbackVariantId) fb = v;
            }
          }
          if (fb) setSelectedVariant(fb);
        }
        setLoading(false);
        return;
      }
      
      await redeemGift(selectedVariant.id);
    } catch (err: any) {
      setError(err.message || 'Error checking pincode');
      setLoading(false);
    }
  };

  const redeemGift = async (variantId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/recipient/${token}/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId, address, phone, pincode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to redeem gift');
      
      setStep('SUCCESS');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const optOut = async () => {
    if (!confirm('Are you sure you want to decline this gift?')) return;
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/recipient/${token}/opt-out`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to opt out');
      setStep('OPTOUT_SUCCESS');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (recipient.status === 'OPTED_OUT' || step === 'OPTOUT_SUCCESS') {
    return (
      <div className="max-w-md mx-auto pt-20 px-4 text-center">
        <h1 className="text-2xl font-serif text-stone-900 mb-4">You have politely declined.</h1>
        <p className="text-stone-500">Thank you for letting us know. The funds will be returned to the organization.</p>
      </div>
    );
  }

  if (step === 'SUCCESS') {
    return (
      <div className="max-w-md mx-auto pt-20 px-4 text-center">
        <PackageCheck className="h-16 w-16 mx-auto mb-6" style={{ color: accentColor }} />
        <h1 className="text-3xl font-serif text-stone-900 mb-4">Gift Claimed!</h1>
        <p className="text-stone-600 mb-8">We have received your details. Your gift will be on its way soon.</p>
        <p className="text-sm text-stone-400">You can return to this link anytime to track your delivery.</p>
      </div>
    );
  }

  if (step === 'TRACKING') {
    return (
      <div className="max-w-lg mx-auto pt-16 px-4">
        <h1 className="text-2xl font-serif text-stone-900 mb-8 text-center">Your Gift Status</h1>
        
        <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6 border-b border-stone-100 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">Order Status</p>
              <p className="text-lg font-medium text-stone-900 mt-1">{recipient.order?.status || 'PENDING'}</p>
            </div>
            <div>
              <PackageCheck className="h-8 w-8 text-stone-300" />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-4 flex flex-col items-center">
                <div className="h-4 w-4 rounded-full bg-green-500 ring-4 ring-green-50"></div>
                <div className="w-px h-full bg-stone-200 my-1"></div>
              </div>
              <div className="pb-6">
                <p className="font-medium text-stone-900">Order Placed</p>
                <p className="text-sm text-stone-500">{new Date(recipient.order?.createdAt || Date.now()).toLocaleDateString()}</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-4 flex flex-col items-center">
                <div className={`h-4 w-4 rounded-full ${recipient.order?.status === 'SHIPPED' || recipient.order?.status === 'DELIVERED' ? 'bg-green-500 ring-4 ring-green-50' : 'bg-stone-200'}`}></div>
                <div className="w-px h-full bg-stone-200 my-1"></div>
              </div>
              <div className="pb-6">
                <p className={`font-medium ${recipient.order?.status === 'SHIPPED' || recipient.order?.status === 'DELIVERED' ? 'text-stone-900' : 'text-stone-400'}`}>Shipped</p>
                {recipient.order?.shipment?.trackingNumber && (
                  <p className="text-sm mt-1 text-stone-600">Tracking: {recipient.order.shipment.trackingNumber}</p>
                )}
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-4 flex flex-col items-center">
                <div className={`h-4 w-4 rounded-full ${recipient.order?.status === 'DELIVERED' ? 'bg-green-500 ring-4 ring-green-50' : 'bg-stone-200'}`}></div>
              </div>
              <div>
                <p className={`font-medium ${recipient.order?.status === 'DELIVERED' ? 'text-stone-900' : 'text-stone-400'}`}>Delivered</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const interpolatedMessage = campaign.messageTemplate.replace('{{firstName}}', recipient.name.split(' ')[0]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="py-6 px-4 flex justify-center bg-white border-b border-stone-100 shadow-sm">
        {logoUrl ? <img src={logoUrl} alt={orgName} className="h-8" /> : <h2 className="text-xl font-serif text-stone-900 tracking-wide">{orgName}</h2>}
      </header>
      
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-12">
        {step === 'GREETING' && (
          <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-4xl font-serif text-stone-900 mb-6 tracking-tight">A gift for you.</h1>
            <div className="bg-white p-8 rounded-xl shadow-sm border border-stone-100 mb-8 max-w-lg mx-auto">
              <p className="whitespace-pre-wrap text-stone-700 leading-relaxed text-lg text-left">{interpolatedMessage}</p>
            </div>
            <Button 
              onClick={handleStart}
              size="lg"
              style={{ backgroundColor: accentColor }}
              className="text-white hover:opacity-90 px-12 h-14 text-lg rounded-full shadow-md transition-transform hover:scale-105"
            >
              Unwrap Gift
            </Button>
            <div className="mt-8">
              <button onClick={optOut} className="text-sm text-stone-400 hover:text-stone-600 underline underline-offset-4 transition-colors">
                I do not wish to receive a gift
              </button>
            </div>
          </div>
        )}

        {step === 'SELECTION' && (
          <div className="animate-in fade-in duration-500">
            <h2 className="text-2xl font-serif text-stone-900 mb-2 text-center">Choose your gift</h2>
            <p className="text-stone-500 text-center mb-8">Select one of the following options curated for you.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {campaign.products.map((p: any) => (
                <div 
                  key={p.id} 
                  onClick={() => { setSelectedVariant(p.variants[0]); setStep('ADDRESS'); }}
                  className="bg-white border border-stone-200 rounded-xl overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
                >
                  <div className="aspect-square bg-stone-100 relative overflow-hidden">
                    {p.images?.[0] ? (
                      <img src={p.images[0]} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" alt={p.title} />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-stone-300">No Image</div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-medium text-stone-900 text-lg mb-1">{p.title}</h3>
                    <p className="text-sm text-stone-500 line-clamp-2">{p.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Button variant="ghost" onClick={() => setStep('GREETING')}>Back to message</Button>
            </div>
          </div>
        )}

        {step === 'ADDRESS' && (
          <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-sm border border-stone-200 animate-in fade-in duration-500">
            <h2 className="text-2xl font-serif text-stone-900 mb-6">Where should we send it?</h2>
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md text-sm flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}
            
            <div className="space-y-5">
              {!selectedVariant.isDigital && (
                <>
                  <div className="space-y-2">
                    <Label>Full Address</Label>
                    <Input 
                      placeholder="Street address, apartment, etc." 
                      value={address} 
                      onChange={e => setAddress(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pincode</Label>
                    <Input 
                      placeholder="6-digit pincode" 
                      value={pincode} 
                      onChange={e => setPincode(e.target.value)}
                      maxLength={6}
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input 
                  placeholder="For delivery updates" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                />
              </div>
            </div>
            
            <div className="mt-8 flex gap-4">
              {campaign.mode === 'CHOICE' && (
                <Button variant="outline" className="flex-1" onClick={() => setStep('SELECTION')} disabled={loading}>
                  Change Gift
                </Button>
              )}
              <Button 
                className="flex-1 text-white shadow-md transition-transform hover:scale-[1.02]" 
                style={{ backgroundColor: accentColor }}
                onClick={checkPincodeAndProceed}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm Details
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
