'use client';
import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';

export function SignOutButton() {
  return (
    <button 
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="w-full flex items-center px-3 py-2 mt-2 text-sm font-medium rounded-md text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
    >
      <LogOut className="mr-3 h-5 w-5 text-stone-400" />
      Sign out
    </button>
  );
}
