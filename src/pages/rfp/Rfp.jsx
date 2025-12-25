
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

    // Form state
    const [title, setTitle] = useState('');
    const [file, setFile] = useState(null);

    useEffect(() => {
        fetchRfps();
    }, []);

    const fetchRfps = async () => {
        try {
            const { data, error } = await supabase
                .from('rfps')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) console.error(error);
            else setRfps(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        setUploading(true);

        // Simulation of file upload (since we might not have storage setup/buckets)
        // In a real app: const { data } = await supabase.storage.from('rfps').upload(...)

        try {
            const mockUrl = `https://storage.googleapis.com/mmt-nexus-mocks/${Math.random().toString(36).substring(7)}.pdf`;

            const { error } = await supabase.from('rfps').insert({
                title: title,
                user_id: user?.id,
                status: 'draft',
                document_url: mockUrl
            });

            if (error) throw error;

            // Reset and refresh
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

    const generateInvoice = (rfp) => {
        // Mock Invoice Generation
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

    if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-mmt-blue" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-primary">RFPs & Invoices</h1>
            </div>

            {/* Upload Section */}
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
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-mmt-blue focus:outline-none"
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
                        className="inline-flex items-center justify-center rounded-md bg-mmt-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50 h-10 w-full sm:w-auto"
                    >
                        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        Upload
                    </button>
                </form>
            </div>

            {/* List Section */}
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
                            {rfps.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-muted-foreground">No RFPs found. Upload one to get started.</td>
                                </tr>
                            ) : (
                                rfps.map((rfp) => (
                                    <tr key={rfp.id} className="border-b transition-colors hover:bg-muted/50">
                                        <td className="p-4 align-middle font-medium flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-mmt-blue" />
                                            {rfp.title}
                                        </td>
                                        <td className="p-4 align-middle">
                                            <StatusBadge status={rfp.status} />
                                        </td>
                                        <td className="p-4 align-middle text-muted-foreground">
                                            {new Date(rfp.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 align-middle text-right gap-2 flex justify-end">
                                            <button
                                                onClick={() => generateInvoice(rfp)}
                                                className="inline-flex items-center justify-center rounded-md border border-input bg-background h-8 px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                                            >
                                                <Download className="mr-2 h-3 w-3" />
                                                Invoice
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
