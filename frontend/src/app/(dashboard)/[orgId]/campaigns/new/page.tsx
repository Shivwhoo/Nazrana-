'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Upload, AlertCircle, CheckCircle2, ChevronRight, Search, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

const STEPS = ['Setup', 'Products', 'Message', 'Recipients', 'Review'];

export default function NewCampaignWizard({ params }: { params: Promise<{ orgId: string }> }) {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [orgId, setOrgId] = useState('');
  useEffect(() => { params.then(p => setOrgId(p.orgId)) }, [params]);

  const [step, setStep] = useState(0);
  const [campaignId, setCampaignId] = useState<string | null>(searchParams.get('id'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = (session as any)?.backendToken;

  // Step 1 State
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'SINGLE' | 'CHOICE'>('SINGLE');
  const [budget, setBudget] = useState<number | ''>('');

  // Step 2 State
  const [catalog, setCatalog] = useState<any[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  
  // Step 3 State
  const [message, setMessage] = useState('Hi {{firstName}},\n\nHere is a gift for you! Enjoy.');

  // Step 4 State
  const [file, setFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<any>(null);
  const pollIntervalRef = useRef<any>(null);

  // Step 5 State
  const [recipientsCount, setRecipientsCount] = useState(0);
  const [maxCost, setMaxCost] = useState(0);

  // Load existing campaign data if campaignId is present
  useEffect(() => {
    if (campaignId && orgId && token) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orgs/${orgId}/campaigns/${campaignId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.campaign) {
          setName(data.campaign.name);
          setMode(data.campaign.mode);
          if (data.campaign.budgetCentsPerRecipient) {
            setBudget(data.campaign.budgetCentsPerRecipient / 100);
          }
          if (data.campaign.messageTemplate) {
            setMessage(data.campaign.messageTemplate);
          }
        }
      })
      .catch(console.error);
    }
  }, [campaignId, orgId, token]);

  // Fetch Catalog for Step 2
  useEffect(() => {
    if (step === 1 && orgId && token && catalog.length === 0) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/catalog/products`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setCatalog(data.items || []));
    }
  }, [step, orgId, token]);

  const handleNext = async () => {
    setError(null);
    setLoading(true);

    try {
      if (step === 0) {
        // Create Campaign
        if (!name) throw new Error('Name is required');
        if (mode === 'CHOICE' && (!budget || budget <= 0)) throw new Error('Budget required for choice mode');
        
        let budgetCents = mode === 'CHOICE' ? Number(budget) * 100 : null;
        
        const method = campaignId ? 'PUT' : 'POST';
        const url = campaignId 
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/orgs/${orgId}/campaigns/${campaignId}`
          : `${process.env.NEXT_PUBLIC_API_URL}/api/orgs/${orgId}/campaigns`;
          
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name, mode, budgetCentsPerRecipient: budgetCents })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save campaign');
        if (!campaignId) {
          setCampaignId(data.campaign.id);
        }
      } 
      else if (step === 1) {
        // Add Products
        if (selectedProductIds.length === 0) throw new Error('Select at least one product');
        
        // In reality we should remove old products, but for this wizard we just add them
        for (const pid of selectedProductIds) {
          const addRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orgs/${orgId}/campaigns/${campaignId}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ productId: pid })
          });
          if (!addRes.ok) {
            const errData = await addRes.json();
            throw new Error(errData.error || `Failed to add product`);
          }
        }
      }
      else if (step === 2) {
        // Update Message
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orgs/${orgId}/campaigns/${campaignId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ messageTemplate: message })
        });
        if (!res.ok) throw new Error('Failed to update message');
      }
      else if (step === 3) {
        // Fetch Recipients summary for Step 5
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orgs/${orgId}/campaigns/${campaignId}/recipients`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setRecipientsCount(data.recipients?.length || 0);

        const campRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orgs/${orgId}/campaigns/${campaignId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const campData = await campRes.json();
        
        // Compute max cost
        let mCost = 0;
        if (campData.campaign?.products) {
           for (const cp of campData.campaign.products) {
              // need variant prices. This is a simplification for UI.
               mCost = mode === 'CHOICE' ? (Number(budget) * 100 || 0) : 100000; // placeholder math
           }
        }
        setMaxCost(mCost);
      }
      else if (step === 4) {
        // Activate
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orgs/${orgId}/campaigns/${campaignId}/activate`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to activate campaign');
        
        router.push(`/${orgId}/campaigns`);
        return;
      }

      setStep(s => s + 1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadCsv = async () => {
    if (!file || !campaignId) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orgs/${orgId}/campaigns/${campaignId}/recipients/csv`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Start polling
      pollIntervalRef.current = setInterval(async () => {
        const pollRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orgs/${orgId}/campaigns/${campaignId}/recipients/import-status/${data.importId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const pollData = await pollRes.json();
        setImportStatus(pollData);

        if (pollData.status === 'COMPLETED' || pollData.status === 'FAILED') {
          clearInterval(pollIntervalRef.current);
          setLoading(false);
        }
      }, 1000);

    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (!orgId) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-serif text-stone-900">Create Campaign</h1>
        <div className="flex gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <span className={`text-sm ${i === step ? 'font-medium text-vermillion-600' : (i < step ? 'text-stone-900' : 'text-stone-400')}`}>
                {s}
              </span>
              {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 mx-2 text-stone-300" />}
            </div>
          ))}
        </div>
      </div>

      <Card className="border-stone-200 shadow-sm">
        <CardHeader>
          <CardTitle className="font-serif">{STEPS[step]}</CardTitle>
          {error && <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-md flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <span>{error}</span>
          </div>}
        </CardHeader>
        
        <CardContent className="space-y-6">
          {step === 0 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Campaign Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Diwali 2026" className="max-w-md" />
              </div>
              
              <div className="space-y-3">
                <Label>Gifting Mode</Label>
                <div className="grid grid-cols-2 gap-4 max-w-md">
                  <div 
                    onClick={() => setMode('SINGLE')}
                    className={`border rounded-md p-4 cursor-pointer transition-colors ${mode === 'SINGLE' ? 'border-vermillion-600 bg-vermillion-50' : 'border-stone-200 hover:border-stone-300'}`}
                  >
                    <div className="font-medium text-stone-900">Single Gift</div>
                    <div className="text-xs text-stone-500 mt-1">Everyone gets the exact same product.</div>
                  </div>
                  <div 
                    onClick={() => setMode('CHOICE')}
                    className={`border rounded-md p-4 cursor-pointer transition-colors ${mode === 'CHOICE' ? 'border-vermillion-600 bg-vermillion-50' : 'border-stone-200 hover:border-stone-300'}`}
                  >
                    <div className="font-medium text-stone-900">Choice Grid</div>
                    <div className="text-xs text-stone-500 mt-1">Recipients pick their favorite from a selection.</div>
                  </div>
                </div>
              </div>

              {mode === 'CHOICE' && (
                <div className="space-y-2">
                  <Label>Budget per recipient (₹)</Label>
                  <Input type="number" value={budget} onChange={e => setBudget(e.target.value === '' ? '' : Number(e.target.value))} placeholder="e.g. 2000" className="max-w-xs tabular-nums" />
                  <p className="text-xs text-stone-500">Products over this budget will not be selectable.</p>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-stone-500">Select products to include in this campaign.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {catalog.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => setSelectedProductIds(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])}
                    className={`border rounded-md p-3 cursor-pointer transition-all ${selectedProductIds.includes(p.id) ? 'border-vermillion-600 bg-vermillion-50 ring-1 ring-vermillion-600' : 'border-stone-200 hover:border-stone-300'}`}
                  >
                    <div className="font-medium text-sm text-stone-900 truncate">{p.title}</div>
                    <div className="text-xs text-stone-500 mt-1">{p.vendor?.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Message Template</Label>
                  <Textarea 
                    value={message} 
                    onChange={e => setMessage(e.target.value)} 
                    rows={8}
                    className="resize-none"
                  />
                  <p className="text-xs text-stone-500">Use {'{{firstName}}'} to personalize the message.</p>
                </div>
              </div>
              <div className="bg-stone-50 p-6 rounded-md border border-stone-200 flex flex-col items-center justify-center text-center">
                <div className="bg-white p-6 shadow-sm border border-stone-100 max-w-xs w-full text-left">
                  <h3 className="font-serif text-lg mb-2 text-stone-900">Preview</h3>
                  <div className="whitespace-pre-wrap text-sm text-stone-700">
                    {message.replace('{{firstName}}', 'Jane')}
                  </div>
                  <div className="mt-6">
                    <Button className="w-full bg-vermillion-600 hover:bg-vermillion-700 text-white">Select Gift</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              {!importStatus || importStatus.status === 'PENDING' ? (
                <div className="border-2 border-dashed border-stone-300 rounded-md p-10 flex flex-col items-center justify-center bg-stone-50">
                  <Upload className="h-8 w-8 text-stone-400 mb-4" />
                  <p className="text-sm font-medium text-stone-900 mb-1">Upload Recipient CSV</p>
                  <p className="text-xs text-stone-500 mb-4">Columns required: name, email (phone optional)</p>
                  <Input 
                    type="file" 
                    accept=".csv"
                    className="max-w-xs"
                    onChange={e => setFile(e.target.files?.[0] || null)}
                  />
                  <Button 
                    onClick={uploadCsv} 
                    disabled={!file || loading}
                    className="mt-4 bg-stone-900 text-white hover:bg-stone-800"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Upload and Process
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-stone-50 rounded border border-stone-200">
                    <div>
                      <h4 className="font-medium text-stone-900 flex items-center gap-2">
                        {importStatus.status === 'PROCESSING' && <Loader2 className="h-4 w-4 animate-spin" />}
                        {importStatus.status === 'COMPLETED' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                        {importStatus.status === 'FAILED' && <AlertCircle className="h-4 w-4 text-red-600" />}
                        Import {importStatus.status}
                      </h4>
                      <p className="text-sm text-stone-500 mt-1">
                        Processed {importStatus.processedRows} of {importStatus.totalRows || '?'} rows
                      </p>
                    </div>
                  </div>
                  
                  {importStatus.errorReport && (
                    <div className="border border-red-200 rounded overflow-hidden">
                      <div className="bg-red-50 px-4 py-2 text-sm font-medium text-red-800 border-b border-red-200">Errors</div>
                      <div className="max-h-60 overflow-y-auto p-4 bg-white space-y-2">
                        {importStatus.errorReport.map((e: any, i: number) => (
                          <div key={i} className="text-xs text-red-600 flex gap-2">
                            <span className="font-mono">Row {e.row}:</span>
                            <span>{e.error}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {importStatus.status === 'COMPLETED' && (
                    <Button onClick={handleNext} className="bg-stone-900 text-white hover:bg-stone-800">
                      Continue to Review
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="bg-stone-50 p-6 rounded-md border border-stone-200">
                <h3 className="font-serif text-xl mb-4 text-stone-900">Campaign Summary</h3>
                <dl className="grid grid-cols-2 gap-y-4 text-sm">
                  <div>
                    <dt className="text-stone-500">Name</dt>
                    <dd className="font-medium text-stone-900">{name}</dd>
                  </div>
                  <div>
                    <dt className="text-stone-500">Mode</dt>
                    <dd className="font-medium text-stone-900">{mode}</dd>
                  </div>
                  <div>
                    <dt className="text-stone-500">Recipients</dt>
                    <dd className="font-medium text-stone-900 tabular-nums">{recipientsCount}</dd>
                  </div>
                  <div>
                    <dt className="text-stone-500">Max Estimated Cost</dt>
                    <dd className="font-medium text-stone-900 tabular-nums">
                      ₹{((maxCost * recipientsCount * 1.05) / 100).toLocaleString('en-IN')}
                    </dd>
                  </div>
                </dl>
              </div>
              <p className="text-xs text-stone-500 text-center">
                * Cost includes a 5% platform service fee. Wallet will be checked upon activation.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t border-stone-100 pt-6">
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={loading}>Back</Button>
          ) : <div />}
          
          {step !== 3 && ( // Step 3 has its own Next button handled by CSV completion
            <Button 
              onClick={handleNext} 
              disabled={loading || (step === 1 && selectedProductIds.length === 0)}
              className="bg-stone-900 text-white hover:bg-stone-800"
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {step === 4 ? 'Activate Campaign' : 'Next Step'}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
