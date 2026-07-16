'use client';

import { Router } from 'express';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, RegisterInput } from '@gifting/shared';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import Link from 'next/link';
import { NazranaLogo } from '@/components/NazranaLogo';
import { GlobalFooter } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema)
  });

  const onSubmit = async (data: RegisterInput) => {
    setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const resData = await res.json();
      
      if (!res.ok) {
        setError(resData.error || 'Failed to register');
        return;
      }

      // Success, now sign in
      const result = await signIn('credentials', {
        redirect: false,
        email: data.email,
        password: data.password
      });

      if (result?.error) {
        setError('Registered, but failed to log in');
      } else {
        router.push('/');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex flex-grow items-center justify-center bg-stone-50 py-12">
        <div className="flex flex-col items-center justify-center space-y-6 w-full">
          <div className="flex flex-col items-center gap-2">
            <NazranaLogo size={48} className="text-stone-900" />
            <h1 className="text-3xl font-bold font-serif text-stone-900 tracking-tight">Nazrana</h1>
          </div>
          <Card className="w-full max-w-md shadow-lg border-stone-200 bg-white">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight text-stone-900 font-serif">Create an account</CardTitle>
              <CardDescription className="text-stone-500">
                Enter your information to get started with Nazrana
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-stone-700">Full Name</Label>
                  <Input 
                    id="name" 
                    placeholder="John Doe" 
                    {...register('name')}
                    className="border-stone-300 focus-visible:ring-vermillion-500"
                  />
                  {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-stone-700">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@example.com" 
                    {...register('email')}
                    className="border-stone-300 focus-visible:ring-vermillion-500"
                  />
                  {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-stone-700">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    {...register('password')}
                    className="border-stone-300 focus-visible:ring-vermillion-500"
                  />
                  {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
                </div>
                
                {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>}
                
                <Button 
                  type="submit" 
                  className="w-full bg-vermillion-600 hover:bg-vermillion-700 text-white transition-colors"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating account...' : 'Create account'}
                </Button>
              </form>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-center w-full text-stone-500">
                Already have an account?{' '}
                <Link href="/login" className="text-vermillion-600 hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
      <GlobalFooter />
    </div>
  );
}
