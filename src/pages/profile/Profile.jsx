
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabase';
import { Loader2, User, Mail, Building, Save } from 'lucide-react';
import { cn } from '../../lib/utils';

const Profile = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState({
        full_name: '',
        role: 'rm',
        avatar_url: ''
    });
    const [message, setMessage] = useState(null);

    useEffect(() => {
        if (user) {
            getProfile();
        }
    }, [user]);

    const getProfile = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                // PGRST116 is "Row not found", we might need to create one if it doesn't exist (triggers usually handle this, but for now we ignore)
                console.error(error);
            }
            if (data) {
                setProfile({
                    full_name: data.full_name || '',
                    role: data.role || 'rm',
                    avatar_url: data.avatar_url || ''
                });
            }
        } catch (error) {
            console.error('Error loading user data', error);
        } finally {
            setLoading(false);
        }
    };

    const updateProfile = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            setMessage(null);

            const updates = {
                id: user.id,
                full_name: profile.full_name,
                role: profile.role,
                updated_at: new Date(),
            };

            const { error } = await supabase.from('profiles').upsert(updates);
            if (error) throw error;
            setMessage('Profile updated successfully!');
        } catch (error) {
            setMessage('Error updating the data!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-primary">Your Profile</h1>

            <div className="rounded-xl border bg-card text-card-foreground shadow">
                <div className="p-6 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="h-20 w-20 rounded-full bg-mmt-blue/10 flex items-center justify-center text-mmt-blue">
                            <User className="h-10 w-10" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold">{profile.full_name || 'User'}</h2>
                            <p className="text-sm text-muted-foreground">{user?.email}</p>
                        </div>
                    </div>

                    <form onSubmit={updateProfile} className="space-y-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="email">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <input
                                    className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 pl-9 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    id="email"
                                    value={user?.email || ''}
                                    disabled
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium leading-none" htmlFor="fullName">Full Name</label>
                            <input
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                id="fullName"
                                type="text"
                                value={profile.full_name}
                                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                            />
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium leading-none" htmlFor="role">Role</label>
                            <div className="relative">
                                <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    id="role"
                                    value={profile.role}
                                    onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                                >
                                    <option value="rm">Relationship Manager</option>
                                    <option value="corporate_sales">Corporate Sales</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>

                        {message && (
                            <div className={cn("text-sm p-3 rounded-md", message.includes('Error') ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600")}>
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-mmt-blue text-primary-foreground hover:bg-blue-600 h-10 px-4 py-2 w-full sm:w-auto"
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Changes
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Profile;
