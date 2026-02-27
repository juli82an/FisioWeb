import { NavLink, Outlet } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Dumbbell,
    CalendarDays,
    UsersRound,
    Activity,
} from 'lucide-react';

const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/pacientes', label: 'Pacientes', icon: Users },
    { to: '/ejercicios', label: 'Ejercicios', icon: Dumbbell },
    { to: '/sesiones', label: 'Sesiones', icon: CalendarDays },
    { to: '/grupos', label: 'Grupos', icon: UsersRound },
];

export default function Layout() {
    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            {/* ── Sidebar ──────────────────────────────────── */}
            <aside className="w-64 flex-shrink-0 flex flex-col bg-white border-r border-gray-100 shadow-sm">
                {/* Logo / Brand */}
                <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-sanitary-400 to-sanitary-600 shadow-md">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-800 leading-tight">FisioWeb</h1>
                        <p className="text-[11px] text-gray-400 font-medium tracking-wide uppercase">Fisioterapia Pro</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {navItems.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === '/'}
                            className={({ isActive }) =>
                                `group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                                    ? 'bg-sanitary-100 text-sanitary-700 shadow-sm'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon
                                        className={`w-5 h-5 transition-colors duration-200 ${isActive ? 'text-sanitary-600' : 'text-gray-400 group-hover:text-gray-600'
                                            }`}
                                    />
                                    {label}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100">
                    <p className="text-[11px] text-gray-400 text-center">v1.0 &middot; Datos locales</p>
                </div>
            </aside>

            {/* ── Main Content ─────────────────────────────── */}
            <main className="flex-1 overflow-y-auto">
                <div className="p-8 max-w-6xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
