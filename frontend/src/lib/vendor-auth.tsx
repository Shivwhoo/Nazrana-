'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface VendorUser {
  id: string;
  email: string;
  name: string;
  vendorId: string;
}

interface VendorAuthContextType {
  user: VendorUser | null;
  token: string | null;
  login: (token: string, user: VendorUser) => void;
  logout: () => void;
  isLoading: boolean;
}

const VendorAuthContext = createContext<VendorAuthContextType | undefined>(undefined);

export function VendorAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<VendorUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem('vendor_token');
    const storedUser = localStorage.getItem('vendor_user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newUser: VendorUser) => {
    localStorage.setItem('vendor_token', newToken);
    localStorage.setItem('vendor_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    router.push('/vendor/catalog');
  };

  const logout = () => {
    localStorage.removeItem('vendor_token');
    localStorage.removeItem('vendor_user');
    setToken(null);
    setUser(null);
    router.push('/vendor/login');
  };

  return (
    <VendorAuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </VendorAuthContext.Provider>
  );
}

export function useVendorAuth() {
  const context = useContext(VendorAuthContext);
  if (context === undefined) {
    throw new Error('useVendorAuth must be used within a VendorAuthProvider');
  }
  return context;
}
