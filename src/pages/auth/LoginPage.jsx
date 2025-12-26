
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabase';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { signIn } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { error } = await signIn({ email, password });
            if (error) throw error;
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGuestLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            // Try to sign in with specific guest credentials
            const { error } = await signIn({ email: 'guest@mmt.com', password: 'GuestUser123!' });
            if (error) throw error;
            navigate('/');
        } catch (err) {
            setError(err.message + " (Please create this user in Supabase first!)");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-md space-y-8 rounded-lg border bg-card p-10 shadow-lg">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
                        Sign in to <span className="text-blue-600 dark:text-blue-400">MMT CRM</span>
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Or <a href="/signup" className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500">Create an account</a>
                    </p>
                </div>

                <div className="mt-8 space-y-6">
                    <form className="space-y-6" onSubmit={handleLogin}>
                        {error && (
                            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                                {error}
                            </div>
                        )}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                Email address
                            </label>
                            <div className="mt-1">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full rounded-md border border-input bg-background px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                Password
                            </label>
                            <div className="mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full rounded-md border border-input bg-background px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex w-full justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Sign in"}
                            </button>
                        </div>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-300 dark:border-gray-700" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="bg-card px-2 text-muted-foreground">Demo Access</span>
                        </div>
                    </div>

                    <button
                        onClick={handleGuestLogin}
                        disabled={loading}
                        className="flex w-full justify-center rounded-md border border-gray-300 dark:border-gray-700 bg-transparent py-2 px-4 text-sm font-medium text-foreground shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Login as Guest"}
                    </button>
                    <p className="text-center text-xs text-muted-foreground mt-2">
                        (Requires 'guest@mmt.com' account)
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
