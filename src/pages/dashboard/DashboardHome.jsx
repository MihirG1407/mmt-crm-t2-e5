
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { Loader2, TrendingUp, Users, CheckCircle, Clock, AlertTriangle, FileText } from 'lucide-react';

const DashboardHome = () => {
    const [stats, setStats] = useState({
        totalPartners: 0,
        pendingApprovals: 0,
        activeLeads: 0,
        avgMyraScore: 0,
        pipeline: [], // { day, count }
        funnel: { new: 0, contacted: 0, negotiating: 0, closed: 0 }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            // 1. Fetch Partners Data
            const { data: partners, error: pError } = await supabase
                .from('partners')
                .select('id, ugc_validation_status, myra_score');

            if (pError) throw pError;

            // 2. Fetch Opportunities Data
            const { data: opps, error: oError } = await supabase
                .from('opportunities')
                .select('id, status, created_at');

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
            // Group opps by created_at date
            const last7Days = [...Array(7)].map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                return d.toISOString().split('T')[0];
            }).reverse();

            const pipelineData = last7Days.map(date => {
                const count = opps.filter(o => o.created_at.startsWith(date)).length;
                return {
                    day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
                    count
                };
            });

            setStats({
                totalPartners,
                pendingApprovals,
                activeLeads,
                avgMyraScore,
                pipeline: pipelineData,
                funnel
            });
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-mmt-blue" /></div>;

    // Helper for max value in charts
    // Fix: Set a minimum floor of 10 for the Y-axis so small numbers don't look huge
    const maxVal = Math.max(...stats.pipeline.map(p => p.count));
    const maxPipeline = maxVal < 10 ? 10 : maxVal;

    const totalFunnel = stats.funnel.new + stats.funnel.contacted + stats.funnel.negotiating + stats.funnel.closed || 1;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-3xl font-bold tracking-tight text-primary">Dashboard</h1>

            {/* Top Metrics Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border bg-card text-card-foreground shadow p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="text-sm font-medium text-muted-foreground">Active Partners</div>
                        <Users className="h-4 w-4 text-mmt-blue" />
                    </div>
                    <div className="text-2xl font-bold text-mmt-blue">{stats.totalPartners}</div>
                    <p className="text-xs text-muted-foreground">Approved properties</p>
                </div>
                <div className="rounded-xl border bg-card text-card-foreground shadow p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 delay-75">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="text-sm font-medium text-muted-foreground">Pending Approvals</div>
                        <Clock className="h-4 w-4 text-orange-500 animate-pulse" />
                    </div>
                    <div className="text-2xl font-bold text-orange-600">{stats.pendingApprovals}</div>
                    <p className="text-xs text-muted-foreground">Requires action</p>
                </div>
                <div className="rounded-xl border bg-card text-card-foreground shadow p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 delay-100">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="text-sm font-medium text-muted-foreground">Avg Myra Score</div>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="text-2xl font-bold">{stats.avgMyraScore}</div>
                    <p className="text-xs text-muted-foreground">Network quality index</p>
                </div>
                <div className="rounded-xl border bg-card text-card-foreground shadow p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 delay-200">
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
                <div className="col-span-4 rounded-xl border bg-card shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium">New Opportunities (Last 7 Days)</h3>
                        <span className="text-xs text-muted-foreground">Volume Trend</span>
                    </div>
                    <div className="h-[200px] flex items-end justify-between gap-4 px-2">
                        {stats.pipeline.map((item, i) => {
                            const heightPct = (item.count / maxPipeline) * 100;
                            return (
                                <div key={i} className="group relative w-full flex flex-col justify-end gap-2">
                                    <div
                                        className="w-full bg-mmt-blue/80 rounded-t-sm transition-all hover:bg-mmt-blue min-h-[4px]"
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
                <div className="col-span-3 rounded-xl border bg-card shadow p-6">
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
        </div>
    );
};

export default DashboardHome;
