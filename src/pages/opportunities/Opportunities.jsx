
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

    // Micro-Cohorts List
    // Micro-Cohorts List
    const MICRO_COHORTS = ['Couple', 'Romantic', 'Family', 'Friends', 'Party', 'Premium', 'Luxury'];

    // Placeholder Images for Auto-Fix
    const PLACEHOLDER_IMAGES = [
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=300",
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=300",
        "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&q=80&w=300",
        "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=300",
        "https://images.unsplash.com/photo-1596436889106-be35e843f974?auto=format&fit=crop&q=80&w=300"
    ];

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

            // Auto-fix: Assign random Myra Score and Micro-Cohort to existing leads that don't have them
            const fixedData = await Promise.all((data || []).map(async (opp) => {
                let needsUpdate = false;
                const updates = {};
                let updatedOpp = { ...opp };

                // 1. Fix Score
                if (opp.myra_score === null || opp.myra_score === undefined) {
                    const randomScore = Math.floor(Math.random() * (99 - 60 + 1)) + 60;
                    updates.myra_score = randomScore;
                    updatedOpp.myra_score = randomScore;
                    needsUpdate = true;
                }

                // 2. Fix Micro-Cohort & Image (stored in amenities)
                if (!opp.amenities?.micro_cohort || !opp.amenities?.image_url) {
                    const randomCohort = MICRO_COHORTS[Math.floor(Math.random() * MICRO_COHORTS.length)];
                    const randomImage = PLACEHOLDER_IMAGES[Math.floor(Math.random() * PLACEHOLDER_IMAGES.length)];

                    const newAmenities = {
                        ...(opp.amenities || {}),
                        micro_cohort: opp.amenities?.micro_cohort || randomCohort,
                        image_url: opp.amenities?.image_url || randomImage
                    };
                    updates.amenities = newAmenities;
                    updatedOpp.amenities = newAmenities;
                    needsUpdate = true;
                }

                if (needsUpdate) {
                    await supabase.from('opportunities').update(updates).eq('id', opp.id);
                }

                return updatedOpp;
            }));

            setOpportunities(fixedData);
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
            myra_score: '', description: '', amenities: { wifi: true, pool: false, spa: false, gym: false, image_url: '' }
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

            // If status is 'closed', convert to Pending Partner
            if (newStatus === 'closed') {
                const { error: partnerError } = await supabase.from('partners').insert({
                    name: currentOpp.hotel_name,
                    location: currentOpp.location,
                    description: currentOpp.description,
                    myra_score: currentOpp.myra_score,
                    amenities: currentOpp.amenities, // Includes micro_cohort
                    image_url: currentOpp.amenities?.image_url || '', // Carry over image
                    ugc_validation_status: 'pending', // Send to Approvals
                });
                if (partnerError) console.error("Error creating partner:", partnerError);
                else alert("Lead converted to Pending Partner successfully!");
            }

        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
            setOpportunities(originalOpps); // Revert
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Exclude tags as the column doesn't exist in Supabase
            // eslint-disable-next-line no-unused-vars
            const { tags, ...rest } = formData;

            const payload = {
                ...rest,
                conversion_lift: formData.conversion_lift ? parseFloat(formData.conversion_lift) : null,
                myra_score: isEditMode ? (formData.myra_score ? parseInt(formData.myra_score) : null) : Math.floor(Math.random() * (99 - 60 + 1)) + 60,
                // Assign random cohort for new leads if not present
                amenities: {
                    ...formData.amenities,
                    micro_cohort: isEditMode ? formData.amenities?.micro_cohort : MICRO_COHORTS[Math.floor(Math.random() * MICRO_COHORTS.length)]
                }
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
            alert(`Failed to save opportunity: ${error.message || error.details || 'Unknown error'}`);
        }
    };

    // Form State
    const [formData, setFormData] = useState({
        hotel_name: '', location: '', status: 'new', conversion_lift: '', tags: '',
        myra_score: '', description: '', amenities: { wifi: true, pool: false, spa: false, gym: false, image_url: '' }
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
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Myra AI Analysis</th>
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
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-md bg-gray-100 overflow-hidden flex-shrink-0">
                                                    {opp.amenities?.image_url ? (
                                                        <img src={opp.amenities.image_url} alt="" className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center bg-gray-200 text-gray-400 text-xs">IMG</div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-medium">{opp.hotel_name}</div>
                                                    <div className="text-xs text-muted-foreground truncate max-w-[150px]">{opp.description}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle text-muted-foreground">{opp.location}</td>
                                        <td className="p-4 align-middle">
                                            <div className="flex flex-col gap-1">
                                                {opp.myra_score >= 80 && (
                                                    <span className="inline-flex items-center w-fit rounded-full bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                                                        <Sparkles className="mr-1 h-3 w-3" /> High Value Lead
                                                    </span>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 bg-muted rounded-full h-1.5 w-24 overflow-hidden">
                                                        <div
                                                            className={cn("h-full rounded-full", opp.myra_score >= 80 ? "bg-gradient-to-r from-green-500 to-emerald-600" : opp.myra_score >= 60 ? "bg-gradient-to-r from-amber-400 to-amber-500" : "bg-red-400")}
                                                            style={{ width: `${opp.myra_score}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm font-semibold">{opp.myra_score}</span>
                                                </div>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-lg rounded-xl border bg-white dark:bg-gray-900 p-0 shadow-2xl relative overflow-hidden">
                        <div className="p-6 border-b bg-muted/20">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-mmt-orange" />
                                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-pink-600">Myra AI Insight</span>
                                </h2>
                                <button onClick={() => setSelectedOpp(null)} className="opacity-70 hover:opacity-100 hover:bg-muted p-1 rounded-full text-foreground"><X className="h-5 w-5" /></button>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">AI-powered micro-cohort analysis for {selectedOpp.hotel_name}</p>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="rounded-xl border bg-gradient-to-br from-orange-50 to-pink-50 dark:from-orange-950/20 dark:to-pink-950/20 p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recommended Micro-Cohort</span>
                                    <span className={cn(
                                        "text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm",
                                        selectedOpp.myra_score >= 80 ? "bg-orange-600" : selectedOpp.myra_score >= 60 ? "bg-amber-500" : "bg-red-500"
                                    )}>{selectedOpp.myra_score}% Match</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-orange-600">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold">{selectedOpp.amenities?.micro_cohort || 'General'} Segment</h3>
                                        <div className="text-xs text-muted-foreground">Based on {selectedOpp.location} market trends</div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-medium mb-2">Why this hotel fits:</h4>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Ideal for couples from Mumbai/Delhi seeking luxury anniversary experiences.
                                    High correlation with users who previously booked Maldives trips but prefer domestic options.
                                    Peak interest during <span className="text-foreground font-medium">Feb (Valentine's)</span> and <span className="text-foreground font-medium">Oct-Nov (wedding season)</span>.
                                </p>
                            </div>

                            <button
                                className="w-full group relative flex items-center justify-center gap-2 rounded-lg border border-orange-200 bg-orange-50/50 dark:bg-orange-900/10 px-4 py-3 text-sm font-medium text-orange-700 dark:text-orange-300 transition-all hover:bg-orange-100 dark:hover:bg-orange-900/30"
                                onClick={() => setSelectedOpp(null)}
                            >
                                <span className="h-4 w-4 rounded-full border border-orange-400 group-hover:bg-orange-500 transition-colors" />
                                <span>Human-in-the-loop: I have verified this AI insight is accurate</span>
                            </button>
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

                            <div className="grid grid-cols-2 gap-4">
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
                            </div>

                            <div>
                                <label className="text-sm font-medium">Image URL</label>
                                <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.amenities.image_url || ''} onChange={(e) => setFormData({ ...formData, amenities: { ...formData.amenities, image_url: e.target.value } })} placeholder="https://..." />
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
