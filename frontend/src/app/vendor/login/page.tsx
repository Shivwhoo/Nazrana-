'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginInput } from '@gifting/shared';
import { useVendorAuth } from '../../../lib/vendor-auth';
import { useRouter } from 'next/navigation';
import { NazranaLogo } from '@/components/NazranaLogo';
import { GlobalFooter } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function VendorLoginPage() {
  const router = useRouter();
  const { login } = useVendorAuth();
  const [error, setError] = useState<string | null>(null);
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginInput) => {
    setError(null);
    try {
      const res = await fetch('http://localhost:4000/api/vendor/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const responseData = await res.json();
      
      if (!res.ok) {
        setError(responseData.error || 'Invalid email or password');
        return;
      }

      login(responseData.token, responseData.user);
    } catch (err) {
      console.error('Vendor login failed', err);
      setError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF6EE] text-[#221C14]">
      <div className="flex flex-grow items-center justify-center py-12">
        <div className="flex flex-col items-center justify-center space-y-6 w-full">
          <div className="flex flex-col items-center gap-2">
            <NazranaLogo size={48} className="text-[#221C14]" />
            <h1 className="text-3xl font-bold font-serif tracking-tight">Nazrana Vendor Portal</h1>
          </div>
          <Card className="w-full max-w-md border-[#221C14]/10 bg-white">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold tracking-tight font-serif">Vendor Login</CardTitle>
              <CardDescription className="text-[#221C14]/60">
                Access your catalog and fulfill orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#221C14]">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@vendor.com" 
                    {...register('email')}
                    className="border-[#221C14]/20 focus-visible:ring-[#B23A1E]"
                  />
                  {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-[#221C14]">Password</Label>
                  </div>
                  <Input 
                    id="password" 
                    type="password" 
                    {...register('password')}
                    className="border-[#221C14]/20 focus-visible:ring-[#B23A1E]"
                  />
                  {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
                </div>
                
                {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">{error}</div>}
                
                <Button 
                  type="submit" 
                  className="w-full bg-[#B23A1E] hover:bg-[#822917] text-white transition-colors"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      <GlobalFooter />
    </div>
  );
}
