import { useRef, useState } from 'react';
import {
    Download,
    Upload,
    Users,
    Dumbbell,
    CalendarDays,
    UsersRound,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react';
import { db, exportAllData, importAllData } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';

export default function DashboardPage() {
    const fileRef = useRef<HTMLInputElement>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    const pacientesCount = useLiveQuery(() => db.pacientes.count()) ?? 0;
    const ejerciciosCount = useLiveQuery(() => db.ejercicios.count()) ?? 0;
    const sesionesCount = useLiveQuery(() => db.sesiones.count()) ?? 0;
    const gruposCount = useLiveQuery(() => db.grupos.count()) ?? 0;

    const stats = [
        { label: 'Pacientes', count: pacientesCount, icon: Users, color: 'from-blue-400 to-blue-600' },
        { label: 'Ejercicios', count: ejerciciosCount, icon: Dumbbell, color: 'from-emerald-400 to-emerald-600' },
        { label: 'Sesiones', count: sesionesCount, icon: CalendarDays, color: 'from-violet-400 to-violet-600' },
        { label: 'Grupos', count: gruposCount, icon: UsersRound, color: 'from-amber-400 to-amber-600' },
    ];

    const handleExport = async () => {
        try {
            const json = await exportAllData();
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fisioterapia_backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 100);
            showFeedback('success', 'Datos exportados correctamente');
        } catch {
            showFeedback('error', 'Error al exportar los datos');
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const text = await file.text();
            await importAllData(text);
            showFeedback('success', 'Datos importados correctamente. La aplicación se actualizará ahora.');
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch {
            showFeedback('error', 'Error al importar. Verifica el archivo JSON.');
        }
        if (fileRef.current) fileRef.current.value = '';
    };

    const showFeedback = (type: 'success' | 'error', msg: string) => {
        setFeedback({ type, msg });
        setTimeout(() => setFeedback(null), 3500);
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
                <p className="text-gray-500 mt-1">Resumen general de tu clínica</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {stats.map(({ label, count, icon: Icon, color }) => (
                    <div key={label} className="card flex items-center gap-4">
                        <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${color} shadow-md`}>
                            <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{count}</p>
                            <p className="text-sm text-gray-500">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Portabilidad */}
            <div className="card">
                <h3 className="text-lg font-semibold text-gray-700 mb-1">Portabilidad de datos</h3>
                <p className="text-sm text-gray-400 mb-5">Exporta o importa todos los datos de tu clínica en formato JSON.</p>

                <div className="flex flex-wrap gap-3 mt-4">
                    <button onClick={handleExport} className="btn-primary">
                        <Download className="w-4 h-4" />
                        Exportar Datos (JSON)
                    </button>

                    <button onClick={() => fileRef.current?.click()} className="btn-secondary">
                        <Upload className="w-4 h-4" />
                        Importar Datos
                    </button>
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={handleImport}
                    />
                </div>

                <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Usa estos botones para mover tus datos entre diferentes ordenadores.
                </p>

                {/* Feedback toast */}
                {feedback && (
                    <div
                        className={`mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium animate-fade-in
              ${feedback.type === 'success'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                    >
                        {feedback.type === 'success'
                            ? <CheckCircle2 className="w-4 h-4" />
                            : <AlertCircle className="w-4 h-4" />
                        }
                        {feedback.msg}
                    </div>
                )}
            </div>
        </div>
    );
}
