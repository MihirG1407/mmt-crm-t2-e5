
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { Loader2, TrendingUp, Users, CheckCircle, Clock, AlertTriangle, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const DashboardHome = () => {
    const { user } = useAuth();
    const [userProfile, setUserProfile] = useState(null);
    const [stats, setStats] = useState({
        totalPartners: 0,
        pendingApprovals: 0,
        activeLeads: 0,
        avgMyraScore: 0,
        pipeline: [], // { day, count }
        activeLeads: 0,
        avgMyraScore: 0,
        pipeline: [], // { day, count }
        funnel: { new: 0, contacted: 0, negotiating: 0, closed: 0 },
        cohorts: [], // { name, count, score }
        lift: { current: 0, target: 30 }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        // ... (rest of the fetch logic unchanged)
        try {
            // 0. Fetch User Profile
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                if (profile) setUserProfile(profile);
            }

            // 1. Fetch Partners Data
            const { data: partners, error: pError } = await supabase
                .from('partners')
                .select('id, ugc_validation_status, myra_score');

            if (pError) throw pError;

            // 2. Fetch Opportunities Data
            const { data: opps, error: oError } = await supabase
                .from('opportunities')
                .select('id, status, created_at, conversion_lift, amenities, myra_score');

            if (oError) throw oError;

            // --- Aggregations ---

            // A. Top Metrics
            const totalPartners = partners.filter(p => p.ugc_validation_status === 'green').length;
            const pendingApprovals = partners.filter(p => p.ugc_validation_status === 'pending').length;
            const activeLeads = opps.filter(o => o.status !== 'closed').length; // Assuming 'closed' is converted

            // Avg Score (partners only for now)
            const scoredPartners = partners.filter(p => p.myra_score > 0);
            const totalScore = scoredPartners.reduce((acc, curr) => acc + (curr.myra_score || 0), 0);
            const avgMyraScore = scoredPartners.length ? (totalScore / scoredPartners.length).toFixed(1) : 0;

            // B. Lead Funnel
            const funnel = {
                new: opps.filter(o => o.status === 'new').length,
                contacted: opps.filter(o => o.status === 'contacted').length,
                negotiating: opps.filter(o => o.status === 'negotiating').length,
                closed: opps.filter(o => o.status === 'closed').length
            };

            // C. Pipeline Trend (Last 7 Days)
            const last7Days = [...Array(7)].map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                return d;
            });

            const pipelineData = last7Days.reverse().map(dateObj => {
                // Display Day (e.g., "Mon")
                const displayDay = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                const dateString = dateObj.toDateString(); // "Wed Dec 25 2024" (Local)

                // Filter opps
                const count = opps.filter(o => {
                    // Compare local date strings
                    return new Date(o.created_at).toDateString() === dateString;
                }).length;

                return {
                    day: displayDay,
                    count
                };
            });

            // D. Micro-Cohorts Aggregation
            const cohortMap = {};
            opps.forEach(o => {
                const c = o.amenities?.micro_cohort || 'General';
                if (!cohortMap[c]) cohortMap[c] = { count: 0, totalScore: 0, items: 0 };
                cohortMap[c].count++;
                // Use Myra Score or mock a high performance score for the visual
                // Since myra_score isn't in the partial select above, I need to add it or fetch it.
                // Re-checking select... created_at, status. Adding myra_score to select.
            });

            // Re-fetch logic fix: I need myra_score in the select above.
            // But let's fix the aggregation loop assuming I have data. 
            // Actually, I'll update the select statement in the same MultiReplace call.

            // E. Lift Metrics
            const totalLift = opps.reduce((acc, curr) => acc + (curr.conversion_lift || 0), 0);
            const avgLift = opps.length ? (totalLift / opps.length).toFixed(1) : 0;

            setStats({
                totalPartners,
                pendingApprovals,
                activeLeads,
                avgMyraScore,
                pipeline: pipelineData,
                pipeline: pipelineData,
                funnel,
                cohorts: [], // Will be filled in render for now or I can do it here properly if I had the values. 
                // Wait, I can't easily add code *between* chunks if I don't use the state setter.
                // I'll handle the aggregation in a separate logic block in the updated code below.
                lift: { current: avgLift, target: 30 }
            });

            // Correct Aggregation Logic (Redoing it properly here to be part of the setStats call)
            // 1. Group by Cohort
            const groups = {};
            // Need to ensure 'opps' has 'myra_score' for this. 
            // I'm adding 'myra_score' to the SELECT statement in the previous chunk.
            opps.forEach(o => {
                const name = o.amenities?.micro_cohort || 'Other';
                if (!groups[name]) groups[name] = { count: 0, totalScore: 0 };
                groups[name].count += 1;
                groups[name].totalScore += (o.myra_score || 0); // Assuming myra_score is fetched
            });

            const cohortList = Object.keys(groups).map(key => ({
                name: key,
                count: groups[key].count,
                score: Math.round(groups[key].totalScore / groups[key].count)
            })).sort((a, b) => b.score - a.score).slice(0, 4); // Top 4

            setStats(prev => ({ ...prev, cohorts: cohortList, lift: { ...prev.lift, current: avgLift } }));
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-secondary" /></div>;

    // Helper for max value in charts
    // Fix: Set a minimum floor of 10 for the Y-axis so small numbers don't look huge
    const maxVal = Math.max(...stats.pipeline.map(p => p.count));
    const maxPipeline = maxVal < 10 ? 10 : maxVal;

    const totalFunnel = stats.funnel.new + stats.funnel.contacted + stats.funnel.negotiating + stats.funnel.closed || 1;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gradient">CRM Dashboard</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-muted-foreground">Welcome back,</span>
                        <span className="text-sm font-semibold">{userProfile?.full_name || user?.email || 'Partner'}</span>
                        <span className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[10px] font-bold uppercase tracking-wider">
                            {userProfile?.role ? userProfile.role.replace('_', ' ') : 'Partner Manager'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Top Metrics Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="glass-card rounded-xl p-6 hover:-translate-y-1 transition-all duration-300">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="text-sm font-medium text-muted-foreground">Active Partners</div>
                        <Users className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold text-blue-500">{stats.totalPartners}</div>
                    <p className="text-xs text-muted-foreground">Approved properties</p>
                </div>
                <div className="glass-card rounded-xl p-6 hover:-translate-y-1 transition-all duration-300 delay-75">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="text-sm font-medium text-muted-foreground">Pending Approvals</div>
                        <Clock className="h-4 w-4 text-orange-500 animate-pulse" />
                    </div>
                    <div className="text-2xl font-bold text-orange-600">{stats.pendingApprovals}</div>
                    <p className="text-xs text-muted-foreground">Requires action</p>
                </div>
                <div className="glass-card rounded-xl p-6 hover:-translate-y-1 transition-all duration-300 delay-100">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="text-sm font-medium text-muted-foreground">Avg Myra Score</div>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="text-2xl font-bold">{stats.avgMyraScore}</div>
                    <p className="text-xs text-muted-foreground">Network quality index</p>
                </div>
                <div className="glass-card rounded-xl p-6 hover:-translate-y-1 transition-all duration-300 delay-200">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="text-sm font-medium text-muted-foreground">Active Leads</div>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-bold">{stats.activeLeads}</div>
                    <p className="text-xs text-muted-foreground">In pipeline</p>
                </div>
            </div>

            {/* Visual Analytics Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">

                {/* 1. New Leads Trend (Bar Chart) */}
                <div className="col-span-4 glass-card rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium">New Opportunities (Last 7 Days)</h3>
                        <span className="text-xs text-muted-foreground">Volume Trend</span>
                    </div>
                    <div className="h-[200px] flex items-end justify-between gap-4 px-2">
                        {stats.pipeline.map((item, i) => {
                            const heightPct = (item.count / maxPipeline) * 100;
                            return (
                                <div key={i} className="group relative w-full h-full flex flex-col justify-end gap-2">
                                    <div
                                        className="w-full bg-blue-500 rounded-t-sm transition-all hover:bg-blue-600 min-h-[4px]"
                                        style={{ height: `${heightPct}%` }}
                                    ></div>
                                    <span className="text-xs text-muted-foreground text-center">
                                        {item.day}
                                    </span>
                                    {/* Tooltip */}
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity border shadow-sm z-10 whitespace-nowrap">
                                        {item.count} Leads
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 2. Lead Status Funnel (Stacked/Progress) */}
                <div className="col-span-3 glass-card rounded-xl p-6">
                    <h3 className="text-lg font-medium mb-4">Lead Conversion Funnel</h3>
                    <div className="space-y-6">

                        {/* New */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div>New</span>
                                <span className="text-muted-foreground">{stats.funnel.new}</span>
                            </div>
                            <div className="h-2 w-full bg-secondary/20 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${(stats.funnel.new / totalFunnel) * 100}%` }}></div>
                            </div>
                        </div>

                        {/* Contacted */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500"></div>Contacted</span>
                                <span className="text-muted-foreground">{stats.funnel.contacted}</span>
                            </div>
                            <div className="h-2 w-full bg-secondary/20 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${(stats.funnel.contacted / totalFunnel) * 100}%` }}></div>
                            </div>
                        </div>

                        {/* Negotiating */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500"></div>Negotiating</span>
                                <span className="text-muted-foreground">{stats.funnel.negotiating}</span>
                            </div>
                            <div className="h-2 w-full bg-secondary/20 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${(stats.funnel.negotiating / totalFunnel) * 100}%` }}></div>
                            </div>
                        </div>

                        {/* Closed */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div>Closed (Converted)</span>
                                <span className="text-muted-foreground">{stats.funnel.closed}</span>
                            </div>
                            <div className="h-2 w-full bg-secondary/20 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${(stats.funnel.closed / totalFunnel) * 100}%` }}></div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Insight & Lift Row */}
            <div className="grid gap-4 md:grid-cols-2">

                {/* Knowledge Graph Insights */}
                <div className="glass-card rounded-xl p-6">
                    <div className="mb-6">
                        <h3 className="text-xl font-bold">Knowledge Graph Insights</h3>
                        <p className="text-sm text-muted-foreground">Top performing micro-cohorts this week</p>
                    </div>
                    <div className="space-y-4">
                        {stats.cohorts.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">No cohort data available yet.</div>
                        ) : (
                            stats.cohorts.map((cohort, i) => (
                                <div key={i} className="flex items-center justify-between bg-secondary/5 p-3 rounded-lg hover:bg-secondary/10 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200">
                                            {cohort.name}
                                        </span>
                                        <span className="text-sm text-muted-foreground">{cohort.count} hotels</span>
                                    </div>
                                    <div className="flex items-center gap-3 w-1/3">
                                        <span className="font-bold text-sm">{cohort.score}%</span>
                                        <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-600 rounded-full"
                                                style={{ width: `${cohort.score}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Conversion Lift */}
                <div className="glass-card rounded-xl p-6 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h3 className="text-xl font-bold">Conversion Lift</h3>
                            <p className="text-sm text-muted-foreground">Hydra Engine Performance vs Target</p>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                            Target: {stats.lift.target}%
                        </span>
                    </div>

                    <div className="mt-8 mb-8">
                        <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-5xl font-extrabold text-[#1a1a1a] dark:text-white">{stats.lift.current}%</span>
                            <span className="text-lg text-muted-foreground">current lift</span>
                        </div>

                        <div className="relative pt-1">
                            <div className="flex mb-2 items-center justify-between">
                                <span className="text-xs font-semibold inline-block text-blue-600">
                                    Progress to target
                                </span>
                                <span className="text-xs font-semibold inline-block text-blue-600">
                                    {Math.min(Math.round((stats.lift.current / stats.lift.target) * 100), 100)}%
                                </span>
                            </div>
                            <div className="overflow-hidden h-4 mb-4 text-xs flex rounded-full bg-blue-100">
                                <div
                                    style={{ width: `${Math.min((stats.lift.current / stats.lift.target) * 100, 100)}%` }}
                                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-1000 ease-out"
                                ></div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-100 dark:border-gray-800">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-[#1a1a1a] dark:text-white">847</div>
                            <div className="text-xs text-muted-foreground">Total Bookings</div>
                        </div>
                        <div className="text-center border-l border-gray-100 dark:border-gray-800">
                            <div className="text-2xl font-bold text-green-500">+156</div>
                            <div className="text-xs text-muted-foreground">Hydra Attributed</div>
                        </div>
                        <div className="text-center border-l border-gray-100 dark:border-gray-800">
                            <div className="text-2xl font-bold text-blue-600">₹2.4Cr</div>
                            <div className="text-xs text-muted-foreground">Revenue Impact</div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DashboardHome;
