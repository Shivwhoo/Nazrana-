'use client';

import { useState, useEffect, use } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { inviteTeamMemberSchema, InviteTeamMemberInput } from '@gifting/shared';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function TeamPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { data: session } = useSession();
  const { orgId } = use(params);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<InviteTeamMemberInput>({
    resolver: zodResolver(inviteTeamMemberSchema),
    defaultValues: { role: 'MEMBER' }
  });

  const fetchMembers = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orgs/${orgId}/team`, {
        headers: { 'Authorization': `Bearer ${(session as any)?.backendToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchMembers();
  }, [session, orgId]);

  const onInvite = async (data: InviteTeamMemberInput) => {
    setInviteError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orgs/${orgId}/team/invites`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session as any)?.backendToken}`
        },
        body: JSON.stringify(data)
      });
      
      const resData = await res.json();
      
      if (!res.ok) {
        setInviteError(resData.error || 'Failed to invite member');
        return;
      }

      reset();
      fetchMembers(); // refresh list
    } catch (err) {
      setInviteError('An unexpected error occurred');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 font-serif">Team & Access</h1>
        <p className="mt-2 text-sm text-stone-500">
          Manage your organization members and their roles.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card className="border-stone-200 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-xl font-serif text-stone-900">Members</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-stone-500">Loading members...</div>
              ) : (
                <div className="space-y-4">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-3 border border-stone-100 rounded-md bg-stone-50">
                      <div>
                        <p className="font-medium text-stone-900">{m.user?.name || 'Pending Invite'}</p>
                        <p className="text-xs text-stone-500">{m.user?.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center rounded-md bg-vermillion-50 px-2 py-1 text-xs font-medium text-vermillion-700 ring-1 ring-inset ring-vermillion-600/10">
                          {m.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="border-stone-200 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-xl font-serif text-stone-900">Invite Member</CardTitle>
              <CardDescription>
                Send an invitation to join your organization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onInvite)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-stone-700">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="colleague@example.com" 
                    {...register('email')}
                    className="border-stone-300 focus-visible:ring-vermillion-500"
                  />
                  {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-stone-700">Role</Label>
                  <Select onValueChange={(val) => setValue('role', val as any)} defaultValue="MEMBER">
                    <SelectTrigger className="border-stone-300 focus:ring-vermillion-500">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEMBER">Member (Can build campaigns)</SelectItem>
                      <SelectItem value="FINANCE">Finance (View spend & billing)</SelectItem>
                      <SelectItem value="ADMIN">Admin (Manage team & settings)</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.role && <p className="text-sm text-red-500">{errors.role.message}</p>}
                </div>

                {inviteError && <div className="p-2 text-sm text-red-600 bg-red-50 rounded-md">{inviteError}</div>}
                
                <Button 
                  type="submit" 
                  className="w-full bg-vermillion-600 hover:bg-vermillion-700 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Inviting...' : 'Send Invite'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
