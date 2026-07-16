'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginInput } from '@gifting/shared';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { NazranaLogo } from '@/components/NazranaLogo';
import { GlobalFooter } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginInput) => {
    setError(null);
    const result = await signIn('credentials', {
      redirect: false,
      email: data.email,
      password: data.password
    });

    if (result?.error) {
      setError('Invalid email or password');
    } else {
      router.push('/');
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
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold tracking-tight text-stone-900 font-serif">Welcome back</CardTitle>
              <CardDescription className="text-stone-500">
                Enter your email and password to sign in to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-stone-700">Password</Label>
                  </div>
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
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 text-center text-sm text-stone-500">
              <div className="flex flex-col space-y-2">
                <Link href="/register" className="text-vermillion-600 hover:underline">
                  Don&apos;t have an account? Sign up
                </Link>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
      <GlobalFooter />
    </div>
  );
}
