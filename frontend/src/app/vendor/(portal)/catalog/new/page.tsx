'use client';

import { useState } from 'react';
import { useVendorAuth } from '../../../../../lib/vendor-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function NewProductPage() {
  const { token } = useVendorAuth();
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [costCents, setCostCents] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [gstRate, setGstRate] = useState('');
  
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !costCents || !file) {
      setError('Name, Cost, and Image are required.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Proxy the upload through our backend to bypass Azure CORS restrictions
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadRes = await fetch('http://localhost:4000/api/vendor/uploads/direct', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!uploadRes.ok) {
        throw new Error('Failed to upload image to storage');
      }
      
      const { publicUrl } = await uploadRes.json();
      
      // 3. Create Product in DB
      const productRes = await fetch('http://localhost:4000/api/vendor/catalog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: name,
          description,
          category: 'General',
          images: [{ url: publicUrl, width: 800, height: 800 }],
          variants: [{
            sku: `SKU-${Date.now()}`,
            title: 'Default',
            costCents: Math.round(parseFloat(costCents) * 100),
            hsnCode: hsnCode || '0000', // Default HSN if not provided to pass validation
            stockQty: 999
          }]
        })
      });
      
      if (!productRes.ok) throw new Error('Failed to create product');
      
      router.push('/vendor/catalog');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif text-[#221C14]">Add New Product</h1>
        <p className="text-sm text-[#221C14]/60">Create a new product listing in your catalog</p>
      </div>
      
      <form onSubmit={handleSubmit} className="bg-white border border-[#221C14]/10 rounded-lg p-6 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[#221C14]">Product Name *</Label>
            <Input 
              id="name" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="border-[#221C14]/20 focus-visible:ring-[#B23A1E]"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description" className="text-[#221C14]">Description</Label>
            <Textarea 
              id="description" 
              value={description} 
              onChange={e => setDescription(e.target.value)}
              className="border-[#221C14]/20 focus-visible:ring-[#B23A1E] resize-none"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost" className="text-[#221C14]">Cost (INR) *</Label>
              <Input 
                id="cost" 
                type="number" 
                step="0.01"
                value={costCents} 
                onChange={e => setCostCents(e.target.value)}
                className="border-[#221C14]/20 focus-visible:ring-[#B23A1E] tabular-nums"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="hsnCode" className="text-[#221C14]">HSN Code</Label>
              <Input 
                id="hsnCode" 
                value={hsnCode} 
                onChange={e => setHsnCode(e.target.value)}
                className="border-[#221C14]/20 focus-visible:ring-[#B23A1E] font-mono"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gstRate" className="text-[#221C14]">GST Rate (%)</Label>
              <Input 
                id="gstRate" 
                type="number" 
                step="0.1"
                value={gstRate} 
                onChange={e => setGstRate(e.target.value)}
                className="border-[#221C14]/20 focus-visible:ring-[#B23A1E] tabular-nums"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="image" className="text-[#221C14]">Product Image *</Label>
              <Input 
                id="image" 
                type="file" 
                accept="image/jpeg, image/png, image/webp"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="border-[#221C14]/20 file:text-[#B23A1E] file:bg-transparent file:border-0 file:font-semibold"
              />
            </div>
          </div>
        </div>
        
        {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">{error}</div>}
        
        <div className="flex justify-end gap-3 pt-4 border-t border-[#221C14]/10">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.back()}
            className="border-[#221C14]/20 text-[#221C14] hover:bg-[#221C14]/5"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-[#B23A1E] hover:bg-[#822917] text-white"
          >
            {isSubmitting ? 'Saving...' : 'Save Product'}
          </Button>
        </div>
      </form>
    </div>
  );
}
