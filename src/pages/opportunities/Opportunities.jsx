
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { Loader2, Sparkles, X, Plus, Trash2, Edit, CheckSquare, Save } from 'lucide-react';
import { cn } from '../../lib/utils';

const Opportunities = () => {
    const [opportunities, setOpportunities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOpp, setSelectedOpp] = useState(null); // For AI Modal

    // Add/Edit Modal State
    const [showModal, setShowModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentId, setCurrentId] = useState(null);

    // Expanded Form Data
    const [formData, setFormData] = useState({
        hotel_name: '',
        location: '',
        status: 'new',
        conversion_lift: '',
        tags: '',
        myra_score: '',
        description: '',
        amenities: { wifi: true, pool: false, spa: false, gym: false }
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: opps, error } = await supabase
            .from('opportunities')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error(error);
        else setOpportunities(opps || []);
        setLoading(false);
    };

    const handleOpenAdd = () => {
        setIsEditMode(false);
        setFormData({
            hotel_name: '', location: '', status: 'new', conversion_lift: '', tags: '',
            myra_score: '', description: '', amenities: { wifi: true, pool: false, spa: false, gym: false }
        });
        setShowModal(true);
    };

    const handleOpenEdit = (opp) => {
        setIsEditMode(true);
        setCurrentId(opp.id);
        setFormData({
            hotel_name: opp.hotel_name || '',
            location: opp.location || '',
            status: opp.status,
            conversion_lift: opp.conversion_lift,
            tags: opp.knowledge_graph_tags ? opp.knowledge_graph_tags.join(', ') : '',
            myra_score: opp.myra_score || '',
            description: opp.description || '',
            amenities: opp.amenities || { wifi: false, pool: false, spa: false, gym: false }
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(t => t);
            const payload = {
                hotel_name: formData.hotel_name,
                location: formData.location,
                status: formData.status,
                conversion_lift: parseFloat(formData.conversion_lift),
                knowledge_graph_tags: tagsArray,
                myra_score: parseFloat(formData.myra_score),
                description: formData.description,
                amenities: formData.amenities
            };

            // Check if status changed to CLOSED -> Prompt for Approval Workflow
            if (formData.status === 'closed' && (!isEditMode || opportunities.find(o => o.id === currentId)?.status !== 'closed')) {
                if (window.confirm("Lead is Closed. Submit to Partner Approvals queue?")) {
                    await handleApproveToPending(payload); // Create Pending Partner
                }
            }

            if (isEditMode) {
                await supabase.from('opportunities').update(payload).eq('id', currentId);
            } else {
                await supabase.from('opportunities').insert(payload);
            }

            setShowModal(false);
            fetchData();
        } catch (error) {
            console.error(error);
            alert('Operation failed');
        }
    };

    // New Workflow: Create PENDING partner from Lead
    const handleApproveToPending = async (oppData) => {
        try {
            // Assign a random nice hotel image if one wasn't provided (Logic Polish)
            const fallbackImages = [
                'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1571896349842-6e53ce41be03?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1455587734955-081b22074882?auto=format&fit=crop&w=800&q=80'
            ];
            const randomImage = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];

            await supabase.from('partners').insert({
                name: oppData.hotel_name,
                location: oppData.location,
                ugc_validation_status: 'pending', // Starts as Pending
                amenities: oppData.amenities || { wifi: true, pool: false, spa: false },
                myra_score: oppData.myra_score || 85, // Default score if missing
                description: oppData.description || `New partner opportunity from ${oppData.location}.`,
                image_url: randomImage,
                onboarding_timestamp: new Date()
            });
            alert("Lead submitted to Partner Approvals (Pending)!");
        } catch (error) {
            console.error("Failed to push to approvals", error);
        }
    };

    // In-Line Status Change
    const handleStatusChange = async (id, newStatus, opp) => {
        if (newStatus === 'closed') {
            if (window.confirm("Mark as Closed & Submit for Partner Approval?")) {
                await handleApproveToPending({
                    hotel_name: opp.hotel_name,
                    location: opp.location,
                    amenities: opp.amenities || {},
                    myra_score: opp.myra_score,
                    description: opp.description
                });
            }
        }

        await supabase.from('opportunities').update({ status: newStatus }).eq('id', id);
        fetchData(); // Refresh to show update
    };

    const handleDeleteOpp = async (id) => {
        if (!window.confirm("Delete this opportunity?")) return;
        await supabase.from('opportunities').delete().eq('id', id);
        setOpportunities(opportunities.filter(o => o.id !== id));
    };

    if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-mmt-blue" /></div>;

    return (
        <div className="space-y-6 relative">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Opportunities</h1>
                    <div className="text-sm text-muted-foreground">Manage Leads & Approvals</div>
                </div>
                <button
                    onClick={handleOpenAdd}
                    className="flex items-center gap-2 rounded-md bg-mmt-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
                >
                    <Plus className="h-4 w-4" />
                    New Lead
                </button>
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
                            {opportunities.map((opp) => (
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
                            ))}
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
                                <button type="submit" className="bg-mmt-blue text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600">{isEditMode ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Opportunities;
