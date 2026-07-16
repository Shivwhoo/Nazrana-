"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Loader2, Download, Plus } from "lucide-react";

export function WalletDashboard({ initialWallet, orgId, token }: { initialWallet: any; orgId: string; token: string }) {
  const [wallet, setWallet] = useState(initialWallet);
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [topupAmount, setTopupAmount] = useState<number>(5000);
  const [method, setMethod] = useState<"RAZORPAY" | "BANK">("RAZORPAY");
  const [invoices, setInvoices] = useState<any[]>([]);
  const router = useRouter();

  const balanceINR = (parseInt(wallet.balanceCents) / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  const heldINR = (parseInt(wallet.heldCents) / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

  const refreshWallet = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orgs/${orgId}/wallet`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setWallet(data.wallet);
    }
  };

  const fetchInvoices = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orgs/${orgId}/invoices`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setInvoices(data.invoices);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [orgId, token]);

  const handleRazorpayTopup = async () => {
    if (topupAmount <= 0) return;
    setIsToppingUp(true);
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orgs/${orgId}/wallet/razorpay/create-order`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amountCents: topupAmount * 100 }),
      });
      
      if (!res.ok) throw new Error('Failed to create order');
      const order = await res.json();

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_placeholder', // Should be in env
        amount: order.amount,
        currency: order.currency,
        name: "Nazrana",
        description: "Wallet Topup",
        order_id: order.orderId,
        handler: async function (response: any) {
          setIsToppingUp(true);
          try {
            const verifyRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orgs/${orgId}/wallet/razorpay/verify`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            if (verifyRes.ok) {
              await refreshWallet();
            } else {
              console.error("Verification failed");
            }
          } catch (e) {
            console.error(e);
          } finally {
            setIsToppingUp(false);
          }
        },
        prefill: {
          name: "Acme Corp", // Could populate from user context
        },
        theme: {
          color: "#B23A1E",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setIsToppingUp(false);
        console.error(response.error.description);
      });
      rzp.open();

    } catch (e) {
      console.error(e);
      setIsToppingUp(false);
    }
  };

  const handleBankTransfer = async () => {
    if (topupAmount <= 0) return;
    setIsToppingUp(true);
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orgs/${orgId}/wallet/bank-transfer/proforma`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amountCents: topupAmount * 100 }),
      });

      if (!res.ok) throw new Error('Failed to generate proforma');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Proforma_Invoice_${orgId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error(e);
    } finally {
      setIsToppingUp(false);
    }
  };

  const handleExportLedger = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/orgs/${orgId}/wallet/export?token=${token}`;
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      
      {/* Overview Cards */}
      <div className="col-span-3 grid grid-cols-2 gap-4">
        <div className="bg-white border border-stone-200 rounded-md p-6">
          <div className="text-sm text-stone-500 uppercase tracking-wider font-semibold mb-2">Available Balance</div>
          <div className="text-4xl font-serif text-stone-900 tabular-nums">{balanceINR}</div>
        </div>
        <div className="bg-stone-50 border border-stone-200 rounded-md p-6">
          <div className="text-sm text-stone-500 uppercase tracking-wider font-semibold mb-2">Held for Campaigns</div>
          <div className="text-4xl font-serif text-stone-900 tabular-nums">{heldINR}</div>
        </div>
      </div>

      {/* Topup Section */}
      <div className="col-span-1 bg-white border border-stone-200 rounded-md p-6 h-fit">
        <h3 className="font-serif text-lg mb-4">Add Funds</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Amount (₹)</label>
            <input 
              type="number" 
              className="w-full border border-stone-200 rounded-md px-3 py-2 tabular-nums"
              value={topupAmount}
              onChange={(e) => setTopupAmount(parseInt(e.target.value) || 0)}
              min="100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Method</label>
            <div className="flex gap-2">
              <button 
                onClick={() => setMethod("RAZORPAY")}
                className={`flex-1 py-2 text-sm rounded-md border ${method === 'RAZORPAY' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white border-stone-200'}`}
              >
                Razorpay
              </button>
              <button 
                onClick={() => setMethod("BANK")}
                className={`flex-1 py-2 text-sm rounded-md border ${method === 'BANK' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white border-stone-200'}`}
              >
                Bank Transfer
              </button>
            </div>
          </div>

          <Button 
            className="w-full"
            disabled={isToppingUp || topupAmount < 100}
            onClick={method === 'RAZORPAY' ? handleRazorpayTopup : handleBankTransfer}
          >
            {isToppingUp ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : (method === 'RAZORPAY' ? <Plus className="h-4 w-4 mr-2" /> : <Download className="h-4 w-4 mr-2" />)}
            {method === 'RAZORPAY' ? 'Proceed to Pay' : 'Download Proforma'}
          </Button>

          {method === 'BANK' && (
            <p className="text-xs text-stone-500 leading-tight">
              A proforma invoice with bank details will be downloaded. Your wallet will be credited manually once the transfer is received.
            </p>
          )}
        </div>
      </div>

      {/* Ledger */}
      <div className="col-span-2 bg-white border border-stone-200 rounded-md">
        <div className="p-4 border-b border-stone-200 flex justify-between items-center">
          <h3 className="font-serif text-lg">Ledger History</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportLedger}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={refreshWallet}>
              Refresh
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Ref</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium text-right">Balance After</th>
              </tr>
            </thead>
            <tbody>
              {wallet.ledger.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-stone-500">No transactions yet.</td>
                </tr>
              ) : (
                wallet.ledger.map((entry: any) => (
                  <tr key={entry.id} className="border-b border-stone-100 last:border-0">
                    <td className="px-4 py-3 text-stone-600">{new Date(entry.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-1 bg-stone-100 rounded text-xs tracking-wider">
                        {entry.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-500 font-mono text-xs">{entry.referenceId?.slice(-8) || '-'}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${
                      ['TOPUP', 'HOLD_RELEASE', 'REFUND'].includes(entry.type) ? 'text-green-600' : 
                      ['HOLD', 'CHARGE'].includes(entry.type) ? 'text-red-600' : 'text-stone-900'
                    }`}>
                      {['HOLD', 'CHARGE'].includes(entry.type) ? '-' : '+'}
                      {(parseInt(entry.amountCents) / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-stone-600">
                      {(parseInt(entry.balanceAfterCents) / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoices */}
      <div className="col-span-3 bg-white border border-stone-200 rounded-md">
        <div className="p-4 border-b border-stone-200 flex justify-between items-center">
          <h3 className="font-serif text-lg">Tax Invoices</h3>
          <Button variant="outline" size="sm" onClick={fetchInvoices}>
            Refresh
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600">
              <tr>
                <th className="px-4 py-3 font-medium">Invoice No.</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium text-right">Taxable</th>
                <th className="px-4 py-3 font-medium text-right">IGST</th>
                <th className="px-4 py-3 font-medium text-right">Total Amount</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-500">No invoices generated yet.</td>
                </tr>
              ) : (
                invoices.map((inv: any) => (
                  <tr key={inv.id} className="border-b border-stone-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-stone-900">{inv.number}</td>
                    <td className="px-4 py-3 text-stone-600">{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-stone-600">
                      {(inv.totals.taxableValueCents / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-stone-600">
                      {(inv.totals.igstCents / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-stone-900">
                      {(inv.totals.totalAmountCents / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/orgs/${orgId}/invoices/${inv.id}/pdf?token=${token}`}
                      >
                        <Download className="h-3 w-3 mr-1" /> PDF
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
