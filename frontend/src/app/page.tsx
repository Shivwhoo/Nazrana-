import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function RootPage() {
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  if ((session.user as any).isPlatformAdmin) {
    redirect('/admin');
  }


  let orgIdToRedirect = null;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orgs`, {
      headers: {
        'Authorization': `Bearer ${(session as any).backendToken}`
      },
      cache: 'no-store'
    });

    if (res.ok) {
      const data = await res.json();
      if (data.orgs && data.orgs.length > 0) {
        orgIdToRedirect = data.orgs[0].id;
      }
    }
  } catch (error) {
    console.error("Failed to fetch orgs:", error);
  }

  if (orgIdToRedirect) {
    redirect(`/${orgIdToRedirect}`);
  } else {
    // If no orgs, send to onboarding
    redirect('/onboarding');
  }
}
