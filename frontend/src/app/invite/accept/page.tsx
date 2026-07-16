'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, RegisterInput } from '@gifting/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

type InviteInfo = { orgName: string; role: string } | null;

type PageState = 'loading' | 'invalid' | 'register' | 'login_needed' | 'accepting' | 'done' | 'error';

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-stone-50">
        <div className="flex flex-col items-center gap-4 text-stone-500">
          <Loader2 className="h-8 w-8 animate-spin text-vermillion-600" />
          <p className="text-sm">Loading...</p>
        </div>
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = searchParams.get('token');

  const [pageState, setPageState] = useState<PageState>('loading');
  const [inviteInfo, setInviteInfo] = useState<InviteInfo>(null);
  const [message, setMessage] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema)
  });

  // Step 1: Fetch invite info
  useEffect(() => {
    if (!token) {
      setPageState('invalid');
      setMessage('No invite token found in this link.');
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/invite-info?token=${token}`)
      .then(res => {
        if (!res.ok) return null;
        return res.json();
      })
      .then(data => {
        if (!data) {
          setPageState('invalid');
          setMessage('This invite link is invalid or has expired.');
          return;
        }
        setInviteInfo(data);

        // If already logged in, auto-accept
        if (status === 'authenticated') {
          acceptInvite(token);
        } else if (status === 'unauthenticated') {
          setPageState('register');
        }
      });
  }, [token, status]);

  const acceptInvite = async (inviteToken: string) => {
    setPageState('accepting');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/accept-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session as any)?.backendToken}`,
        },
        body: JSON.stringify({ token: inviteToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPageState('error');
        setMessage(data.message || 'Failed to accept invite');
        return;
      }
      setPageState('done');
      // Redirect to the org dashboard after a short delay
      setTimeout(() => router.push(`/${data.orgId}`), 1500);
    } catch {
      setPageState('error');
      setMessage('An unexpected error occurred.');
    }
  };

  // Register new user then auto-accept
  const onRegister = async (data: RegisterInput) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) {
        setMessage(resData.error || 'Registration failed');
        return;
      }

      // Sign in with the new credentials
      const signInResult = await signIn('credentials', {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (signInResult?.error) {
        setMessage('Registered but failed to sign in. Please log in manually.');
        setPageState('login_needed');
        return;
      }

      // Accept the invite using the backend token from the register response
      const backendToken = resData.token;
      setPageState('accepting');
      const acceptRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/accept-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${backendToken}`,
        },
        body: JSON.stringify({ token }),
      });
      const acceptData = await acceptRes.json();
      if (!acceptRes.ok) {
        setPageState('error');
        setMessage(acceptData.message || 'Failed to join organization');
        return;
      }
      setPageState('done');
      setTimeout(() => router.push(`/${acceptData.orgId}`), 1500);
    } catch {
      setMessage('An unexpected error occurred.');
    }
  };

  if (pageState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-50">
        <div className="flex flex-col items-center gap-4 text-stone-500">
          <Loader2 className="h-8 w-8 animate-spin text-vermillion-600" />
          <p className="text-sm">Validating your invite...</p>
        </div>
      </div>
    );
  }

  if (pageState === 'invalid') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-50">
        <Card className="w-full max-w-md border-stone-200 shadow-sm">
          <CardContent className="flex flex-col items-center gap-4 pt-10 pb-8 text-center">
            <AlertCircle className="h-12 w-12 text-stone-400" />
            <h2 className="text-lg font-semibold text-stone-900">Invite not available</h2>
            <p className="text-sm text-stone-500">{message}</p>
            <Button asChild variant="outline" className="mt-2">
              <Link href="/login">Go to Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pageState === 'accepting') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-50">
        <div className="flex flex-col items-center gap-4 text-stone-500">
          <Loader2 className="h-8 w-8 animate-spin text-vermillion-600" />
          <p className="text-sm">Joining organization...</p>
        </div>
      </div>
    );
  }

  if (pageState === 'done') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-50">
        <div className="flex flex-col items-center gap-4 text-stone-700">
          <CheckCircle className="h-12 w-12 text-green-600" />
          <h2 className="text-lg font-semibold">You've joined {inviteInfo?.orgName}!</h2>
          <p className="text-sm text-stone-500">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  if (pageState === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-50">
        <Card className="w-full max-w-md border-stone-200 shadow-sm">
          <CardContent className="flex flex-col items-center gap-4 pt-10 pb-8 text-center">
            <AlertCircle className="h-12 w-12 text-vermillion-600" />
            <h2 className="text-lg font-semibold text-stone-900">Something went wrong</h2>
            <p className="text-sm text-stone-500">{message}</p>
            <Button asChild variant="outline">
              <Link href="/login">Sign In Instead</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default: register form
  return (
    <div className="flex items-center justify-center min-h-screen bg-stone-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-stone-200 bg-white">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="h-5 w-5 text-vermillion-600" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-stone-900 font-serif">
            You're invited to {inviteInfo?.orgName}
          </CardTitle>
          <CardDescription className="text-stone-500">
            You've been invited as a <strong className="text-stone-700">{inviteInfo?.role}</strong>. 
            Create an account to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onRegister)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="Your name" {...register('name')} />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" {...register('email')} />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register('password')} />
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>
            {message && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{message}</div>}
            <Button
              type="submit"
              className="w-full bg-vermillion-600 hover:bg-vermillion-700 text-white mt-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating account...' : 'Accept Invitation'}
            </Button>
            <p className="text-center text-sm text-stone-500">
              Already have an account?{' '}
              <Link href={`/login?callbackUrl=/invite/accept?token=${token}`} className="text-vermillion-600 hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
