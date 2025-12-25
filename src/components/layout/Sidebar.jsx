import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, Briefcase, FileText, Settings, UserCircle, LogOut, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
    const { signOut } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    }

    const navItems = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/partners', label: 'Partner Directory', icon: Building2 },
        { path: '/opportunities', label: 'Opportunities', icon: Briefcase },
        { path: '/rfp', label: 'RFPs & Invoices', icon: FileText },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform duration-300 md:translate-x-0 md:static md:h-screen",
                isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
            )}>
                <div className="flex h-16 items-center justify-between border-b px-6">
                    {/* Logo Area */}
                    <div className="flex items-center gap-2">
                        {/* Light Mode Logo (Colored) */}
                        <img
                            src="https://imgak.mmtcdn.com/pwa_v3/pwa_hotel_assets/header/logo@2x.png"
                            alt="MakeMyTrip"
                            className="h-8 object-contain dark:hidden"
                        />
                        {/* Dark Mode Logo (White) */}
                        <img
                            src="https://imgak.mmtcdn.com/pwa_v3/pwa_hotel_assets/header/mmtLogoWhite.png"
                            alt="MakeMyTrip"
                            className="h-8 object-contain hidden dark:block"
                        />
                    </div>

                    {/* Mobile Close Button */}
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden"
                    >
                        <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                </div>

                <div className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => onClose?.()} // Close drawer on navigation
                            className={({ isActive }) =>
                                cn(
                                    isActive
                                        ? 'bg-primary/10 text-primary font-semibold border-r-4 border-primary'
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
                        onClick={() => onClose?.()}
                        className={({ isActive }) =>
                            cn(
                                isActive
                                    ? 'bg-primary/10 text-primary font-semibold border-r-4 border-primary'
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
                        onClick={() => onClose?.()}
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
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                        <LogOut className="h-5 w-5" />
                        <span>Log Out</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
