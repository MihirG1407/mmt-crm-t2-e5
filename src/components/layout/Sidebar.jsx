
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building2, Briefcase, FileText, Settings, UserCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

const Sidebar = () => {
    const navItems = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/partners', label: 'Partner Directory', icon: Building2 },
        { path: '/opportunities', label: 'Opportunities', icon: Briefcase },
        { path: '/rfp', label: 'RFPs & Invoices', icon: FileText },
    ];

    return (
        <aside className="hidden w-64 flex-col border-r bg-card md:flex">
            <div className="flex h-16 items-center border-b px-6">
                <div className="flex items-center gap-2 font-bold text-xl text-mmt-blue">
                    <span className="text-secondary">MMT</span>Nexus
                </div>
            </div>
            <div className="flex-1 flex flex-col gap-1 p-4">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            cn(
                                isActive
                                    ? 'bg-mmt-blue/10 text-mmt-blue font-semibold border-r-4 border-mmt-blue'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white',
                                'group flex items-center px-3 py-2 text-sm font-medium rounded-l-md transition-all duration-200'
                            )
                        }
                    >
                        <item.icon
                            className={cn(
                                'mr-3 h-5 w-5 flex-shrink-0 transition-colors',
                            )}
                            aria-hidden="true"
                        />
                        {item.label}
                    </NavLink>
                ))}
            </div>
            <div className="border-t p-4 flex flex-col gap-1">
                <NavLink
                    to="/profile"
                    className={({ isActive }) =>
                        cn(
                            isActive
                                ? 'bg-mmt-blue/10 text-mmt-blue font-semibold border-r-4 border-mmt-blue'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white',
                            'group flex items-center px-3 py-2 text-sm font-medium rounded-l-md transition-all duration-200'
                        )
                    }
                >
                    <UserCircle className="mr-3 h-5 w-5 flex-shrink-0 transition-colors" />
                    <span>Profile</span>
                </NavLink>
                <NavLink
                    to="/settings"
                    className={({ isActive }) =>
                        cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                            isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                        )
                    }
                >
                    <Settings className="h-5 w-5" />
                    <span>Settings</span>
                </NavLink>
            </div>
        </aside>
    );
};

export default Sidebar;
