
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { Loader2, MapPin, CheckCircle, AlertCircle, Wifi, Waves as Pool, Coffee, Trash2, Edit, XCircle, Clock, Filter, ArrowUpDown, Dumbbell } from 'lucide-react';
import { cn } from '../../lib/utils';

const Partners = () => {
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters & Tabs
    const [activeTab, setActiveTab] = useState('approved'); // approved, pending, rejected
    const [sortBy, setSortBy] = useState('created_at'); // created_at, myra_score

    // Micro-Cohorts
    const MICRO_COHORTS = ['Couple', 'Romantic', 'Family', 'Friends', 'Party', 'Premium', 'Luxury'];

    // Placeholder Images
    const PLACEHOLDER_IMAGES = [
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=300",
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=300",
        "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&q=80&w=300",
        "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=300",
        "https://images.unsplash.com/photo-1596436889106-be35e843f974?auto=format&fit=crop&q=80&w=300"
    ];

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [formData, setFormData] = useState({
        name: '', location: '', amenities: { wifi: true, pool: false, spa: false }, image_url: '', description: '', myra_score: ''
    });

    // Rejection Modal
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectId, setRejectId] = useState(null);

    useEffect(() => {
        fetchPartners();
    }, [sortBy]); // Refetch when sort changes

    const fetchPartners = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('partners')
            .select('*')
            .order(sortBy, { ascending: false });

        if (error) {
            console.error(error);
        } else {
            // Auto-fix: Assign random Micro-Cohort & Image to existing partners
            const fixedData = await Promise.all((data || []).map(async (p) => {
                let needsUpdate = false;
                const updates = {};
                let updatedPartner = { ...p };

                // Fix Micro-Cohort
                if (!p.amenities?.micro_cohort) {
                    const randomCohort = MICRO_COHORTS[Math.floor(Math.random() * MICRO_COHORTS.length)];
                    const newAmenities = { ...(p.amenities || {}), micro_cohort: randomCohort };
                    updates.amenities = newAmenities;
                    updatedPartner.amenities = newAmenities;
                    needsUpdate = true;
                }

                // Fix Image
                if (!p.image_url) {
                    const randomImage = PLACEHOLDER_IMAGES[Math.floor(Math.random() * PLACEHOLDER_IMAGES.length)];
                    updates.image_url = randomImage;
                    updatedPartner.image_url = randomImage;
                    needsUpdate = true;
                }

                if (needsUpdate) {
                    await supabase.from('partners').update(updates).eq('id', p.id);
                }

                return updatedPartner;
            }));
            setPartners(fixedData);
        }
        setLoading(false);
    };

    // Filter Logic
    const filteredPartners = partners.filter(p => {
        if (activeTab === 'approved') return p.ugc_validation_status === 'green';
        if (activeTab === 'pending') return p.ugc_validation_status === 'pending';
        if (activeTab === 'rejected') return p.ugc_validation_status === 'red';
        return true;
    });

    // Actions
    const handleApprove = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm("Approve this partner?")) return;
        await supabase.from('partners').update({ ugc_validation_status: 'green', onboarding_timestamp: new Date() }).eq('id', id);
        fetchPartners();
    };

    const handleRejectClick = (id, e) => {
        e.stopPropagation();
        setRejectId(id);
        setShowRejectModal(true);
    };

    const confirmReject = async () => {
        await supabase.from('partners').update({
            ugc_validation_status: 'red',
            rejection_reason: rejectReason
        }).eq('id', rejectId);
        setShowRejectModal(false);
        setRejectReason('');
        fetchPartners();
    };

    // CRUD
    const handleOpenAdd = () => {
        setIsEditMode(false);
        setFormData({ name: '', location: '', amenities: { wifi: true, pool: false, spa: false }, image_url: '', description: '', myra_score: '' });
        setShowModal(true);
    };

    const handleOpenEdit = (partner) => {
        setIsEditMode(true);
        setCurrentId(partner.id);
        setFormData({
            name: partner.name,
            location: partner.location,
            amenities: partner.amenities || {},
            image_url: partner.image_url || '',
            description: partner.description || '',
            myra_score: partner.myra_score || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: formData.name,
                location: formData.location,
                amenities: formData.amenities,
                image_url: formData.image_url,
                description: formData.description,
                myra_score: parseFloat(formData.myra_score)
            };
            if (!isEditMode) {
                payload.ugc_validation_status = 'pending'; // New always pending
                await supabase.from('partners').insert(payload);
            } else {
                await supabase.from('partners').update(payload).eq('id', currentId);
            }
            setShowModal(false);
            fetchPartners();
        } catch (error) {
            console.error(error);
            alert('Operation failed');
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm("Delete Partner?")) return;
        await supabase.from('opportunities').delete().eq('partner_id', id);
        await supabase.from('partners').delete().eq('id', id);
        setPartners(partners.filter(p => p.id !== id));
    };


    if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-secondary" /></div>;

    return (
        <div className="space-y-6 relative animate-in fade-in zoom-in-95 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Partner Directory</h1>
                    <div className="text-sm text-muted-foreground">Manage Hotel Network & Approvals</div>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:ring-primary/50"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="created_at">Sort: Newest</option>
                        <option value="myra_score">Sort: Myra Score</option>
                    </select>
                    <button onClick={handleOpenAdd} className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 shadow-lg hover:shadow-primary/20 transition-all">
                        Add Partner
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 rounded-lg bg-muted p-1 w-fit shadow-inner">
                {['approved', 'pending', 'rejected'].map(tab => (
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
                        {tab} {tab === 'pending' && <span className="ml-1 rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.5 text-[10px] animate-pulse">{partners.filter(p => p.ugc_validation_status === 'pending').length}</span>}
                    </button>
                ))}
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPartners.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground bg-gray-50/50 rounded-xl border border-dashed">
                        <Filter className="h-10 w-10 mb-2 opacity-20" />
                        <p>No partners found in {activeTab}.</p>
                    </div>
                ) : filteredPartners.map((partner, i) => (
                    <div
                        key={partner.id}
                        className="group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                        style={{ animationDelay: `${i * 50}ms` }}
                    >
                        {/* Action Overlay */}
                        <div className="absolute top-2 right-2 z-10 flex gap-2 transition-opacity duration-200">
                            {activeTab === 'pending' && (
                                <>
                                    <button onClick={(e) => handleApprove(partner.id, e)} className="p-2 rounded-full bg-green-500 text-white shadow-lg hover:scale-110 transition-transform" title="Approve">
                                        <CheckCircle className="h-4 w-4" />
                                    </button>
                                    <button onClick={(e) => handleRejectClick(partner.id, e)} className="p-2 rounded-full bg-red-500 text-white shadow-lg hover:scale-110 transition-transform" title="Reject">
                                        <XCircle className="h-4 w-4" />
                                    </button>
                                </>
                            )}
                            <button onClick={() => handleOpenEdit(partner)} className="p-2 rounded-full bg-white/90 text-gray-700 hover:bg-white shadow-md backdrop-blur-sm"><Edit className="h-4 w-4" /></button>
                            <button onClick={(e) => handleDelete(partner.id, e)} className="p-2 rounded-full bg-white/90 text-red-600 hover:bg-white shadow-md backdrop-blur-sm"><Trash2 className="h-4 w-4" /></button>
                        </div>

                        <div className="h-48 bg-gray-100 relative group-hover:scale-105 transition-transform duration-300">
                            {partner.image_url ? (
                                <img src={partner.image_url} alt={partner.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-gradient-to-br from-blue-50 to-orange-50">
                                    <MapPin className="h-10 w-10 opacity-20" />
                                </div>
                            )}
                            <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 backdrop-blur-sm">
                                <span>Score:</span>
                                <span className={partner.myra_score >= 80 ? "text-green-400" : "text-yellow-400"}>{partner.myra_score || 'N/A'}</span>
                            </div>

                            {/* Micro Cohort Badge */}
                            {partner.amenities?.micro_cohort && (
                                <div className="absolute top-2 left-2 bg-purple-600/90 text-white px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-sm">
                                    {partner.amenities.micro_cohort}
                                </div>
                            )}
                        </div>

                        <div className="p-5">
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <h3 className="font-semibold text-lg leading-none tracking-tight">{partner.name}</h3>
                                    <div className="mt-1 flex items-center text-sm text-muted-foreground">
                                        <MapPin className="mr-1 h-3 w-3" />
                                        {partner.location}
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs text-muted-foreground line-clamp-2 mb-4 h-8">{partner.description || "No description available."}</p>

                            {/* Rejected Reason */}
                            {partner.ugc_validation_status === 'red' && partner.rejection_reason && (
                                <div className="mb-3 rounded bg-red-50 p-2 text-xs text-red-700">
                                    <span className="font-semibold">Rejection Reason:</span> {partner.rejection_reason}
                                </div>
                            )}

                            <div className="mt-auto">
                                <div className="flex gap-2 flex-wrap">
                                    {partner.amenities?.wifi && <AmenityBadge icon={Wifi} label="Wifi" />}
                                    {partner.amenities?.pool && <AmenityBadge icon={Pool} label="Pool" />}
                                    {partner.amenities?.spa && <AmenityBadge icon={Coffee} label="Spa" />}
                                    {partner.amenities?.gym && <AmenityBadge icon={Dumbbell} label="Gym" />}
                                </div>
                            </div>

                            {partner.onboarding_timestamp && (
                                <div className="mt-4 pt-3 border-t flex items-center text-[10px] text-muted-foreground">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Onboarded: {new Date(partner.onboarding_timestamp).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-2xl relative bg-white dark:bg-gray-900 overflow-y-auto max-h-[90vh]">
                        <h2 className="text-lg font-semibold mb-4">{isEditMode ? 'Edit Partner' : 'Add New Partner'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Hotel Name</label>
                                    <input required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Location</label>
                                    <input required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Description</label>
                                <textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Myra Score</label>
                                    <input type="number" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.myra_score} onChange={(e) => setFormData({ ...formData, myra_score: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Image URL</label>
                                    <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">Amenities</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formData.amenities.wifi} onChange={(e) => setFormData({ ...formData, amenities: { ...formData.amenities, wifi: e.target.checked } })} /> Wifi</label>
                                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formData.amenities.pool} onChange={(e) => setFormData({ ...formData, amenities: { ...formData.amenities, pool: e.target.checked } })} /> Pool</label>
                                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formData.amenities.spa} onChange={(e) => setFormData({ ...formData, amenities: { ...formData.amenities, spa: e.target.checked } })} /> Spa</label>
                                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formData.amenities.gym} onChange={(e) => setFormData({ ...formData, amenities: { ...formData.amenities, gym: e.target.checked } })} /> Gym</label>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium">Cancel</button>
                                <button type="submit" className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90">{isEditMode ? 'Update' : 'Save'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reject Reason Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-xl bg-white dark:bg-gray-900">
                        <h3 className="font-semibold mb-2">Reject Partner</h3>
                        <p className="text-xs text-muted-foreground mb-4">Please provide a reason for rejection.</p>
                        <textarea
                            className="w-full h-24 rounded-md border p-2 text-sm mb-4"
                            placeholder="Reason for rejection..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowRejectModal(false)} className="px-3 py-1.5 text-xs">Cancel</button>
                            <button onClick={confirmReject} className="bg-red-600 text-white px-3 py-1.5 rounded text-xs hover:bg-red-700">Confirm Reject</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const AmenityBadge = ({ icon: Icon, label }) => (
    <div className="flex items-center gap-1 rounded bg-pink-100 px-2 py-1 text-[10px] text-pink-700 font-semibold border border-pink-200">
        <span className="font-medium">{label}</span>
    </div>
);

export default Partners;
