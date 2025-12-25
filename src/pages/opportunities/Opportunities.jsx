
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { Loader2, Sparkles, X, Plus, Trash2, Edit, CheckSquare, Save } from 'lucide-react';
import { cn } from '../../lib/utils';

const Opportunities = () => {
    const [opportunities, setOpportunities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOpp, setSelectedOpp] = useState(null); // For AI Modal

    // Filter & Sort State
    const [filterStatus, setFilterStatus] = useState('all');
    const [sortOption, setSortOption] = useState('date-desc');

    // Add/Edit Modal State
    const [showModal, setShowModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentId, setCurrentId] = useState(null);

    // ... (rest of state)

    useEffect(() => {
        fetchOpportunities();
    }, []);

    const fetchOpportunities = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('opportunities')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOpportunities(data || []);
        } catch (error) {
            console.error('Error fetching opportunities:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAdd = () => {
        setIsEditMode(false);
        // Reset form
        setFormData({
            hotel_name: '', location: '', status: 'new', conversion_lift: '', tags: '',
            myra_score: '', description: '', amenities: { wifi: true, pool: false, spa: false, gym: false }
        });
        setCurrentId(null);
        setShowModal(true);
    };

    const handleOpenEdit = (opp) => {
        setIsEditMode(true);
        setFormData({
            hotel_name: opp.hotel_name,
            location: opp.location,
            status: opp.status,
            conversion_lift: opp.conversion_lift,
            tags: opp.tags || '',
            myra_score: opp.myra_score || '',
            description: opp.description || '',
            amenities: opp.amenities || { wifi: false, pool: false, spa: false, gym: false }
        });
        setCurrentId(opp.id);
        setShowModal(true);
    };

    const handleDeleteOpp = async (id) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this opportunity?");
        if (!confirmDelete) return;

        try {
            const { error } = await supabase.from('opportunities').delete().eq('id', id);
            if (error) throw error;
            setOpportunities(prev => prev.filter(o => o.id !== id));
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Failed to delete opportunity');
        }
    };

    const handleStatusChange = async (id, newStatus, currentOpp) => {
        // Optimistic update
        const originalOpps = [...opportunities];
        setOpportunities(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));

        try {
            const { error } = await supabase.from('opportunities').update({ status: newStatus }).eq('id', id);
            if (error) throw error;
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
            setOpportunities(originalOpps); // Revert
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                user_id: (await supabase.auth.getUser()).data.user?.id
            };

            if (isEditMode && currentId) {
                const { error } = await supabase.from('opportunities').update(payload).eq('id', currentId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('opportunities').insert(payload);
                if (error) throw error;
            }

            setShowModal(false);
            fetchOpportunities();
        } catch (error) {
            console.error('Error saving opportunity:', error);
            alert('Failed to save opportunity');
        }
    };

    // Form State
    const [formData, setFormData] = useState({
        hotel_name: '', location: '', status: 'new', conversion_lift: '', tags: '',
        myra_score: '', description: '', amenities: { wifi: true, pool: false, spa: false, gym: false }
    });

    // Derived Data
    const filteredOpportunities = opportunities
        .filter(opp => {
            if (filterStatus === 'all') return true;
            return opp.status === filterStatus;
        })
        .sort((a, b) => {
            switch (sortOption) {
                case 'date-desc':
                    return new Date(b.created_at) - new Date(a.created_at);
                case 'date-asc':
                    return new Date(a.created_at) - new Date(b.created_at);
                case 'score-desc':
                    return (b.myra_score || 0) - (a.myra_score || 0);
                case 'score-asc':
                    return (a.myra_score || 0) - (b.myra_score || 0);
                case 'lift-desc':
                    return (b.conversion_lift || 0) - (a.conversion_lift || 0);
                default:
                    return 0;
            }
        });

    if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-secondary" /></div>;

    return (
        <div className="space-y-6 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Opportunities</h1>
                    <div className="text-sm text-muted-foreground">Manage Leads & Approvals</div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleOpenAdd}
                        className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                    >
                        <Plus className="h-4 w-4" />
                        New Lead
                    </button>
                </div>
            </div>

            {/* Filters & Sort Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 bg-muted/30 p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium whitespace-nowrap">Filter Status:</span>
                    <select
                        className="h-8 rounded-md border text-sm px-2 bg-background focus:ring-1 focus:ring-primary"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All Statuses</option>
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="negotiating">Negotiating</option>
                        <option value="closed">Closed</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium whitespace-nowrap">Sort By:</span>
                    <select
                        className="h-8 rounded-md border text-sm px-2 bg-background focus:ring-1 focus:ring-primary"
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                    >
                        <option value="date-desc">Newest First</option>
                        <option value="date-asc">Oldest First</option>
                        <option value="score-desc">Highest Score</option>
                        <option value="score-asc">Lowest Score</option>
                        <option value="lift-desc">Highest Lift</option>
                    </select>
                </div>
            </div>

            <div className="rounded-md border bg-card">
                <div className="w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted text-left">
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Hotel Name</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Location</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Myra Score</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Est. Lift</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Status (Action)</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right w-[140px]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {filteredOpportunities.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-muted-foreground">No opportunities match your filter.</td>
                                </tr>
                            ) : (
                                filteredOpportunities.map((opp) => (
                                    <tr key={opp.id} className="border-b transition-colors hover:bg-muted/50">
                                        <td className="p-4 align-middle">
                                            <div className="font-medium">{opp.hotel_name}</div>
                                            <div className="text-xs text-muted-foreground truncate max-w-[150px]">{opp.description}</div>
                                        </td>
                                        <td className="p-4 align-middle text-muted-foreground">{opp.location}</td>
                                        <td className="p-4 align-middle">
                                            <div className="flex items-center gap-1">
                                                <span className={cn(
                                                    "font-bold",
                                                    opp.myra_score >= 80 ? "text-green-600" : opp.myra_score >= 60 ? "text-amber-600" : "text-red-500"
                                                )}>{opp.myra_score || '-'}</span>
                                                <span className="text-xs text-muted-foreground">/100</span>
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle font-bold text-mmt-orange">+{opp.conversion_lift}%</td>
                                        <td className="p-4 align-middle">
                                            <select
                                                className={cn(
                                                    "h-8 rounded-md border bg-transparent px-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring",
                                                    opp.status === 'new' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                        opp.status === 'contacted' ? "bg-purple-50 text-purple-700 border-purple-200" :
                                                            opp.status === 'negotiating' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                                "bg-green-50 text-green-700 border-green-200"
                                                )}
                                                value={opp.status}
                                                onChange={(e) => handleStatusChange(opp.id, e.target.value, opp)}
                                            >
                                                <option value="new">New</option>
                                                <option value="contacted">Contacted</option>
                                                <option value="negotiating">Negotiating</option>
                                                <option value="closed">Closed (Submit)</option>
                                            </select>
                                        </td>
                                        <td className="p-4 align-middle text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => setSelectedOpp(opp)} className="p-2 hover:bg-purple-50 text-purple-600 rounded-md" title="AI Insight"><Sparkles className="h-4 w-4" /></button>
                                                <button onClick={() => handleOpenEdit(opp)} className="p-2 hover:bg-gray-100 rounded-md" title="Edit"><Edit className="h-4 w-4" /></button>
                                                <button onClick={() => handleDeleteOpp(opp.id)} className="p-2 hover:bg-red-50 text-red-600 rounded-md" title="Delete"><Trash2 className="h-4 w-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* AI Modal */}
            {selectedOpp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-2xl relative bg-white dark:bg-gray-900">
                        <button onClick={() => setSelectedOpp(null)} className="absolute right-4 top-4 opacity-70 hover:opacity-100"><X className="h-4 w-4" /></button>
                        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4"><Sparkles className="h-5 w-5 text-purple-500" /> Myra AI Analysis</h2>
                        <div className="space-y-4">
                            <div className="rounded-lg bg-orange-50 p-4 text-sm text-orange-900 dark:bg-orange-900/20 dark:text-orange-100">
                                <p className="font-bold mb-1">Myra Score: {selectedOpp.myra_score}/100</p>
                                <p>Match Confidence for "{selectedOpp.location}" market is High.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-full max-w-2xl rounded-xl border bg-card p-6 shadow-2xl relative bg-white dark:bg-gray-900 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-lg font-semibold mb-4">{isEditMode ? 'Edit Opportunity' : 'Create New Lead'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Hotel Name</label>
                                    <input required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.hotel_name} onChange={(e) => setFormData({ ...formData, hotel_name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Location</label>
                                    <input required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium">Description</label>
                                <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Key highlights..." />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Status</label>
                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                                        <option value="new">New</option>
                                        <option value="contacted">Contacted</option>
                                        <option value="negotiating">Negotiating</option>
                                        <option value="closed">Closed</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Est. Lift (%)</label>
                                    <input type="number" step="0.1" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.conversion_lift} onChange={(e) => setFormData({ ...formData, conversion_lift: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Myra Score (0-100)</label>
                                    <input type="number" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.myra_score} onChange={(e) => setFormData({ ...formData, myra_score: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-2 block">Amenities Included</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formData.amenities.wifi} onChange={(e) => setFormData({ ...formData, amenities: { ...formData.amenities, wifi: e.target.checked } })} /> Wifi</label>
                                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formData.amenities.pool} onChange={(e) => setFormData({ ...formData, amenities: { ...formData.amenities, pool: e.target.checked } })} /> Pool</label>
                                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formData.amenities.spa} onChange={(e) => setFormData({ ...formData, amenities: { ...formData.amenities, spa: e.target.checked } })} /> Spa</label>
                                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formData.amenities.gym} onChange={(e) => setFormData({ ...formData, amenities: { ...formData.amenities, gym: e.target.checked } })} /> Gym</label>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium">Tags</label>
                                <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium">Cancel</button>
                                <button type="submit" className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90">{isEditMode ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Opportunities;
