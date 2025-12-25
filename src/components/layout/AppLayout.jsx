import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

const AppLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-background text-foreground font-sans">
            {/* Sidebar with Mobile Props */}
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Header */}
                <header className="flex h-16 items-center gap-4 border-b bg-background px-6 md:hidden sticky top-0 z-30">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="text-muted-foreground hover:text-foreground p-1 -ml-1"
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    <span className="font-bold text-lg">MMT Nexus</span>
                </header>

                <div className="flex-1 overflow-auto p-4 md:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AppLayout;
