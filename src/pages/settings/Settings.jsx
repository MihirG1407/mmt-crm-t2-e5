
import React, { useState } from 'react';
import { Bell, Moon, Shield, Smartphone } from 'lucide-react';
import { cn } from '../../lib/utils';

const Settings = () => {
    const [notifications, setNotifications] = useState(true);
    const [darkMode, setDarkMode] = useState(false);

    React.useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-primary">Settings</h1>

            <div className="grid gap-6">

                {/* Appearance Section */}
                <div className="rounded-xl border bg-card text-card-foreground shadow">
                    <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-lg font-medium">Appearance</h3>
                        <Moon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="p-6 pt-0">
                        <div className="flex items-center justify-between py-4">
                            <div className="space-y-0.5">
                                <label className="text-base font-medium">Dark Mode</label>
                                <p className="text-sm text-muted-foreground">Adjust the appearance of the application.</p>
                            </div>
                            <button
                                onClick={() => setDarkMode(!darkMode)}
                                className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", darkMode ? "bg-mmt-blue" : "bg-input")}
                            >
                                <span className={cn("pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform", darkMode ? "translate-x-5" : "translate-x-0")} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Notifications Section */}
                <div className="rounded-xl border bg-card text-card-foreground shadow">
                    <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-lg font-medium">Notifications</h3>
                        <Bell className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="p-6 pt-0">
                        <div className="flex items-center justify-between py-4 border-b">
                            <div className="space-y-0.5">
                                <label className="text-base font-medium">Push Notifications</label>
                                <p className="text-sm text-muted-foreground">Receive alerts about new high-intent leads.</p>
                            </div>
                            <button
                                onClick={() => setNotifications(!notifications)}
                                className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", notifications ? "bg-mmt-blue" : "bg-input")}
                            >
                                <span className={cn("pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform", notifications ? "translate-x-5" : "translate-x-0")} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between py-4">
                            <div className="space-y-0.5">
                                <label className="text-base font-medium">Email Digests</label>
                                <p className="text-sm text-muted-foreground">Weekly summary of your portfolio performance.</p>
                            </div>
                            <div className="text-sm text-muted-foreground">On (Default)</div>
                        </div>
                    </div>
                </div>

                {/* Security Section (Placeholder) */}
                <div className="rounded-xl border bg-card text-card-foreground shadow opacity-80">
                    <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-lg font-medium">Security & Privacy</h3>
                        <Shield className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="p-6 pt-0">
                        <div className="py-2">
                            <button className="text-sm text-mmt-blue hover:underline">Change Password</button>
                        </div>
                        <div className="py-2">
                            <button className="text-sm text-destructive hover:underline">Delete Account</button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Settings;
