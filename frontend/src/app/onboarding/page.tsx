'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createOrgSchema, CreateOrgInput, INDIAN_STATES } from '@gifting/shared';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function OnboardingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<CreateOrgInput>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: { stateCode: '' }
  });

  const onSubmit = async (data: CreateOrgInput) => {
    setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orgs`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session as any)?.backendToken}`
        },
        body: JSON.stringify(data)
      });
      
      const resData = await res.json();
      
      if (!res.ok) {
        setError(resData.error || 'Failed to create organization');
        return;
      }

      router.push(`/${resData.org.id}`);
    } catch (err) {
      setError('An unexpected error occurred');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-stone-50 p-4">
      <Card className="w-full max-w-lg shadow-lg border-stone-200 bg-white">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-stone-900 font-serif">Setup your organization</CardTitle>
          <CardDescription className="text-stone-500">
            Tell us about your company to start sending gifts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-stone-700">Company Name</Label>
              <Input 
                id="name" 
                placeholder="Acme Corp" 
                {...register('name')}
                className="border-stone-300 focus-visible:ring-vermillion-500"
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="gstin" className="text-stone-700">GSTIN</Label>
              <Input 
                id="gstin" 
                placeholder="e.g. 29ABCDE1234F1Z5" 
                {...register('gstin')}
                className="border-stone-300 focus-visible:ring-vermillion-500 uppercase"
              />
              {errors.gstin && <p className="text-sm text-red-500">{errors.gstin.message}</p>}
              <p className="text-xs text-stone-500">15-character Goods and Services Tax Identification Number</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stateCode" className="text-stone-700">State</Label>
              <Select onValueChange={(val) => setValue('stateCode', val as string)}>
                <SelectTrigger className="border-stone-300 focus:ring-vermillion-500">
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
              {errors.stateCode && <p className="text-sm text-red-500">{errors.stateCode.message}</p>}
            </div>
            
            {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>}
            
            <Button 
              type="submit" 
              className="w-full bg-vermillion-600 hover:bg-vermillion-700 text-white transition-colors mt-6"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Organization'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
