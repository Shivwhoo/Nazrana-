'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Collection = {
  id: string;
  name: string;
  description: string;
  _count: { products: number };
};

export default function AdminCollectionsPage() {
  const { data: session } = useSession();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const token = (session as any)?.backendToken;

  const fetchCollections = async () => {
    setLoading(true);
    try {
      // In a real implementation we would fetch collections from the admin catalog API
      // Since it doesn't exist yet, we'll fetch from the public one for now
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/catalog/collections`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setCollections(data.collections || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchCollections();
  }, [session]);

  const saveCollection = async () => {
    setError('');
    setSaving(true);
    try {
      const url = editingId 
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/admin/catalog/collections/${editingId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/admin/catalog/collections`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.message || 'Failed to save collection');
        return;
      }
      setShowForm(false);
      fetchCollections();
    } catch {
      setError('Unexpected error');
    } finally {
      setSaving(false);
    }
  };

  const deleteCollection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this collection?')) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/catalog/collections/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCollections();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-stone-500 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading collections...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-center border-b border-stone-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-stone-800 uppercase tracking-widest">Collections</h1>
          <p className="text-sm text-stone-500 mt-1">Manage product collections and groupings.</p>
        </div>
        <Button size="sm" onClick={() => {
          setEditingId(null);
          setForm({ name: '', description: '' });
          setShowForm(true);
        }} className="bg-stone-800 hover:bg-stone-700 text-white">
          <Plus className="h-4 w-4 mr-1" /> Add Collection
        </Button>
      </div>

      {showForm && (
        <Card className="border-stone-200">
          <CardHeader><CardTitle className="text-sm uppercase tracking-widest">{editingId ? 'Edit Collection' : 'New Collection'}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs uppercase tracking-wide">Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Collection name" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide">Description</Label>
              <textarea 
                value={form.description} 
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
                className="mt-1 w-full border border-stone-200 rounded px-3 py-2 text-sm bg-white" 
                rows={3}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={saveCollection} disabled={saving} className="bg-stone-800 text-white hover:bg-stone-700">
                {saving ? 'Saving...' : 'Save Collection'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-400">
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Description</th>
            <th className="py-2 pr-4">Products</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {collections.map(c => (
            <tr key={c.id} className="border-b border-stone-100 hover:bg-stone-50">
              <td className="py-3 pr-4 font-medium text-stone-800">{c.name}</td>
              <td className="py-3 pr-4 text-stone-500">{c.description}</td>
              <td className="py-3 pr-4 tabular-nums text-stone-600">{c._count?.products || 0}</td>
              <td className="py-3 text-right">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-stone-400 hover:text-stone-700 mr-2" 
                  onClick={() => {
                    setEditingId(c.id);
                    setForm({ name: c.name, description: c.description || '' });
                    setShowForm(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-stone-400 hover:text-red-600" 
                  onClick={() => deleteCollection(c.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
          {collections.length === 0 && (
            <tr>
              <td colSpan={4} className="py-8 text-center text-stone-500">
                No collections found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
