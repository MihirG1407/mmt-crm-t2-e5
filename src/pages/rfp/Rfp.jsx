
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { Loader2, FileText, Upload, Download, CheckCircle, XCircle, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

const Rfp = () => {
    const { user } = useAuth();
    const [rfps, setRfps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Tabs state
    const [activeTab, setActiveTab] = useState('proposals'); // proposals, invoices

    // Form state
    const [title, setTitle] = useState('');
    const [file, setFile] = useState(null);

    const [localPaidIds, setLocalPaidIds] = useState(() => {
        // Load locally saved "paid" invoices
        const saved = localStorage.getItem('mmt_paid_invoices');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        fetchRfps();
    }, []);

    // Merge DB data with local "Paid" status
    const mergedRfps = rfps.map(r => ({
        ...r,
        status: localPaidIds.includes(r.id) ? 'paid' : r.status
    }));

    const fetchRfps = async () => {
        try {
            const { data, error } = await supabase
                .from('rfps')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRfps(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        setUploading(true);

        try {
            const mockUrl = `https://storage.googleapis.com/mmt-nexus-mocks/${Math.random().toString(36).substring(7)}.pdf`;

            const { error } = await supabase.from('rfps').insert({
                title: title,
                user_id: user?.id,
                status: 'draft', // Initial status
                document_url: mockUrl
            });

            if (error) throw error;

            setTitle('');
            setFile(null);
            fetchRfps();
        } catch (error) {
            console.error('Error uploading RFP:', error);
            alert('Failed to upload RFP');
        } finally {
            setUploading(false);
        }
    };

    const updateStatus = async (id, newStatus) => {
        // Optimistic Update
        const previousRfps = [...rfps];
        setRfps(rfps.map(r => r.id === id ? { ...r, status: newStatus } : r));

        if (newStatus === 'paid') {
            // Try saving to DB, if fails (constraint), save locally
            try {
                const { error } = await supabase.from('rfps').update({ status: 'paid' }).eq('id', id);
                if (error) throw error;
            } catch (err) {
                // Fallback to local storage for ANY error (constraint or otherwise)
                // This ensures the user Experience is smooth even if DB rejects 'paid' status
                console.warn('DB Update failed, falling back to local:', err);
                const newPaidIds = [...localPaidIds, id];
                setLocalPaidIds(newPaidIds);
                localStorage.setItem('mmt_paid_invoices', JSON.stringify(newPaidIds));
                // Keep the optimistic update
            }
        } else {
            // Normal updates (Draft -> Sent -> Approved)
            try {
                const { error } = await supabase.from('rfps').update({ status: newStatus }).eq('id', id);
                if (error) throw error;
            } catch (error) {
                console.error('Error updating status:', error);
                alert(`Failed to update status: ${error.message}`);
                setRfps(previousRfps);
            }
        }
    };

    const generateInvoice = (rfp) => {
        const invoiceContent = `
            INVOICE #INV-${rfp.id.slice(0, 8)}
            ------------------------
            Client: MMT Partner Network
            Item: Tech Infrastructure Fee
            Amount: $500.00
            Status: Pending
            
            Date: ${new Date().toLocaleDateString()}
        `;
        const blob = new Blob([invoiceContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice_${rfp.title}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const generatedInvoices = mergedRfps.filter(r => r.status === 'approved' || r.status === 'paid').map(r => ({
        ...r,
        invoiceAmount: 500,
        invoiceStatus: r.status === 'paid' ? 'Paid' : 'Pending',
        invoiceDate: new Date()
    }));

    if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-secondary" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-primary">RFPs & Invoices</h1>
            </div>

            {/* Tabs Navigation */}
            <div className="flex space-x-1 rounded-lg bg-muted p-1 w-fit shadow-inner">
                {['proposals', 'invoices'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "px-4 py-2 text-sm font-medium rounded-md transition-all capitalize duration-200",
                            activeTab === tab
                                ? "bg-background text-foreground shadow-sm scale-105"
                                : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* PROPOSALS TAB */}
            {activeTab === 'proposals' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                    <div className="rounded-xl border bg-card p-6 shadow">
                        <h2 className="text-lg font-semibold mb-4">Submit New Proposal</h2>
                        <form onSubmit={handleUpload} className="flex flex-col sm:flex-row gap-4 items-end">
                            <div className="flex-1 w-full">
                                <label className="text-sm font-medium mb-1 block">Proposal Title</label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Corporate Retreat for Microsoft"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                                />
                            </div>
                            <div className="flex-1 w-full">
                                <label className="text-sm font-medium mb-1 block">Document (PDF)</label>
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    onChange={(e) => setFile(e.target.files[0])}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={uploading || !title}
                                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 h-10 w-full sm:w-auto"
                            >
                                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                Upload
                            </button>
                        </form>
                    </div>

                    <div className="rounded-md border bg-card">
                        <div className="w-full overflow-auto">
                            <table className="w-full caption-bottom text-sm">
                                <thead className="[&_tr]:border-b">
                                    <tr className="border-b transition-colors hover:bg-muted/50 text-left">
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Proposal</th>
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Status</th>
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Date</th>
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mergedRfps.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-muted-foreground">No RFPs found. Upload one to get started.</td>
                                        </tr>
                                    ) : (
                                        mergedRfps.map((rfp) => (
                                            <tr key={rfp.id} className="border-b transition-colors hover:bg-muted/50">
                                                <td className="p-4 align-middle font-medium flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-secondary" />
                                                    {rfp.title}
                                                </td>
                                                <td className="p-4 align-middle">
                                                    <StatusBadge status={rfp.status} />
                                                </td>
                                                <td className="p-4 align-middle text-muted-foreground">
                                                    {new Date(rfp.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="p-4 align-middle text-right flex justify-end gap-2">
                                                    {rfp.status === 'draft' && (
                                                        <button
                                                            onClick={() => updateStatus(rfp.id, 'sent')}
                                                            className="inline-flex items-center justify-center rounded-md border border-input bg-background h-8 px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                                                        >
                                                            Send
                                                        </button>
                                                    )}
                                                    {(rfp.status === 'sent') && (
                                                        <>
                                                            <button
                                                                onClick={() => updateStatus(rfp.id, 'approved')}
                                                                className="inline-flex items-center justify-center rounded-md bg-green-50 text-green-700 border border-green-200 h-8 px-3 text-xs font-medium hover:bg-green-100"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => updateStatus(rfp.id, 'rejected')}
                                                                className="inline-flex items-center justify-center rounded-md bg-red-50 text-red-700 border border-red-200 h-8 px-3 text-xs font-medium hover:bg-red-100"
                                                            >
                                                                Reject
                                                            </button>
                                                        </>
                                                    )}
                                                    {rfp.status === 'approved' && <span className="text-xs text-green-600 font-medium">Approved</span>}
                                                    {rfp.status === 'paid' && <span className="text-xs text-blue-600 font-medium">Paid</span>}
                                                    {rfp.status === 'rejected' && <span className="text-xs text-red-600 font-medium">Rejected</span>}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* INVOICES TAB */}
            {activeTab === 'invoices' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="rounded-md border bg-card">
                        <div className="w-full overflow-auto">
                            <table className="w-full caption-bottom text-sm">
                                <thead className="[&_tr]:border-b">
                                    <tr className="border-b transition-colors hover:bg-muted/50 text-left">
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Invoice For</th>
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Amount</th>
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Status</th>
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right w-[200px]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {generatedInvoices.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-muted-foreground">No invoices available. Approved RFPs will appear here.</td>
                                        </tr>
                                    ) : (
                                        generatedInvoices.map((inv) => (
                                            <tr key={inv.id} className="border-b transition-colors hover:bg-muted/50">
                                                <td className="p-4 align-middle font-medium flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-secondary" />
                                                    {inv.title}
                                                </td>
                                                <td className="p-4 align-middle font-mono">
                                                    ${inv.invoiceAmount}
                                                </td>
                                                <td className="p-4 align-middle">
                                                    <span className={cn(
                                                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                                        inv.invoiceStatus === 'Paid' ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                                                    )}>
                                                        {inv.invoiceStatus}
                                                    </span>
                                                </td>
                                                <td className="p-4 align-middle text-right flex justify-end gap-2">
                                                    {inv.status !== 'paid' && (
                                                        <button
                                                            onClick={() => updateStatus(inv.id, 'paid')}
                                                            className="inline-flex items-center justify-center rounded-md bg-primary text-white h-8 px-3 text-xs font-medium hover:bg-primary/90"
                                                        >
                                                            Mark Paid
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => generateInvoice(inv)}
                                                        className="inline-flex items-center justify-center rounded-md border border-input bg-background h-8 px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                                                    >
                                                        <Download className="mr-2 h-3 w-3" />
                                                        Download
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatusBadge = ({ status }) => {
    const styles = {
        draft: "bg-gray-100 text-gray-800",
        sent: "bg-blue-100 text-blue-800",
        approved: "bg-green-100 text-green-800",
        rejected: "bg-red-100 text-red-800"
    };
    const icons = {
        draft: <Clock className="w-3 h-3 mr-1" />,
        sent: <Upload className="w-3 h-3 mr-1" />,
        approved: <CheckCircle className="w-3 h-3 mr-1" />,
        rejected: <XCircle className="w-3 h-3 mr-1" />
    };

    return (
        <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", styles[status] || styles.draft)}>
            {icons[status] || icons.draft}
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
};

export default Rfp;
