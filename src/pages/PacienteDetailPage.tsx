import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
    ArrowLeft,
    Calendar,
    FileText,
    Home,
    Hospital,
    Clock,
    User,
    Activity,
    LineChart,
    CheckCircle2,
    CircleDashed
} from 'lucide-react';
import { db, type Ejercicio } from '../db';
import { useCallback, useMemo, useState } from 'react';

export default function PacienteDetailPage() {
    const { id } = useParams<{ id: string }>();
    const pacienteId = Number(id);

    const [activeTab, setActiveTab] = useState<'timeline' | 'reporte'>('timeline');

    const paciente = useLiveQuery(() => db.pacientes.get(pacienteId), [pacienteId]);
    const sesiones = useLiveQuery(
        () => db.sesiones.where('paciente_id').equals(pacienteId).reverse().sortBy('fecha'),
        [pacienteId],
    ) ?? [];
    const ejercicios = useLiveQuery(() => db.ejercicios.toArray()) ?? [];

    const ejercicioMap = useMemo(() => {
        const m = new Map<number, Ejercicio>();
        ejercicios.forEach(e => m.set(e.id!, e));
        return m;
    }, [ejercicios]);

    const formatExerciseName = useCallback((ejercicioId: number, progressionFromId?: number) => {
        const current = ejercicioMap.get(ejercicioId)?.nombre ?? `Ejercicio #${ejercicioId}`;
        if (!progressionFromId) return current;
        const previous = ejercicioMap.get(progressionFromId)?.nombre ?? `Ejercicio #${progressionFromId}`;
        return `${previous} -> ${current}`;
    }, [ejercicioMap]);

    // Calculate Progress Report Metrics
    const reportMetrics = useMemo(() => {
        let totalCasa = 0;
        let completadosCasa = 0;
        let totalClinica = 0;
        let completadosClinica = 0;
        const notasFeed: { fecha: string; notas: string }[] = [];
        const casaDoneMap = new Map<string, { label: string; fecha: string; veces: number }>();
        const clinicaDoneMap = new Map<string, { label: string; fecha: string; veces: number }>();

        sesiones.forEach(s => {
            if (s.notas?.trim()) {
                notasFeed.push({ fecha: s.fecha, notas: s.notas });
            }
            s.ejercicios_asignados.forEach(a => {
                if (a.lugar === 'casa') {
                    totalCasa++;
                    if (a.completado) {
                        completadosCasa++;
                        const key = `${a.progresion_desde_ejercicio_id ?? 0}->${a.ejercicio_id}`;
                        const label = formatExerciseName(a.ejercicio_id, a.progresion_desde_ejercicio_id);
                        const prev = casaDoneMap.get(key);
                        if (prev) {
                            casaDoneMap.set(key, {
                                label: prev.label,
                                fecha: s.fecha > prev.fecha ? s.fecha : prev.fecha,
                                veces: prev.veces + 1,
                            });
                        } else {
                            casaDoneMap.set(key, { label, fecha: s.fecha, veces: 1 });
                        }
                    }
                } else {
                    totalClinica++;
                    if (a.completado) {
                        completadosClinica++;
                        const key = `${a.progresion_desde_ejercicio_id ?? 0}->${a.ejercicio_id}`;
                        const label = formatExerciseName(a.ejercicio_id, a.progresion_desde_ejercicio_id);
                        const prev = clinicaDoneMap.get(key);
                        if (prev) {
                            clinicaDoneMap.set(key, {
                                label: prev.label,
                                fecha: s.fecha > prev.fecha ? s.fecha : prev.fecha,
                                veces: prev.veces + 1,
                            });
                        } else {
                            clinicaDoneMap.set(key, { label, fecha: s.fecha, veces: 1 });
                        }
                    }
                }
            });
        });

        const complianceCasa = totalCasa > 0 ? Math.round((completadosCasa / totalCasa) * 100) : 0;
        const complianceClinica = totalClinica > 0 ? Math.round((completadosClinica / totalClinica) * 100) : 0;
        const completedCasaList = Array.from(casaDoneMap.values()).sort((a, b) => b.fecha.localeCompare(a.fecha));
        const completedClinicaList = Array.from(clinicaDoneMap.values()).sort((a, b) => b.fecha.localeCompare(a.fecha));

        return {
            totalCasa, completadosCasa, complianceCasa,
            totalClinica, completadosClinica, complianceClinica,
            notasFeed,
            completedCasaList,
            completedClinicaList,
        };
    }, [sesiones, formatExerciseName]);

    if (!paciente) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <User className="w-12 h-12 text-gray-300 mb-3" />
                <h3 className="text-lg font-semibold text-gray-600">Paciente no encontrado</h3>
                <Link to="/pacientes" className="text-sanitary-600 text-sm mt-2 hover:underline">
                    ← Volver a pacientes
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Back link */}
            <Link
                to="/pacientes"
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-sanitary-600 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Volver a pacientes
            </Link>

            {/* Patient header card */}
            <div className="card">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-sanitary-100 text-sanitary-700 font-bold text-lg shrink-0">
                            {paciente.nombre[0]}{paciente.apellidos?.[0] ?? ''}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">
                                {paciente.nombre} {paciente.apellidos}
                            </h2>
                            <div className="flex flex-wrap items-center gap-3 mt-1">
                                {paciente.fecha_nacimiento && (
                                    <span className="inline-flex items-center gap-1 text-sm text-gray-400">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {paciente.fecha_nacimiento}
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1 text-sm text-gray-400">
                                    <Clock className="w-3.5 h-3.5" />
                                    {sesiones.length} sesión{sesiones.length !== 1 ? 'es' : ''}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                {paciente.historial && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-sm text-gray-600 flex items-start gap-2">
                            <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                            {paciente.historial}
                        </p>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex rounded-xl bg-gray-100 p-1 space-x-1 max-w-sm mb-6">
                <button
                    onClick={() => setActiveTab('timeline')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'timeline'
                        ? 'bg-white text-violet-700 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Clock className="w-4 h-4" /> Línea de Tiempo
                </button>
                <button
                    onClick={() => setActiveTab('reporte')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'reporte'
                        ? 'bg-white text-emerald-700 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <LineChart className="w-4 h-4" /> Informe Clínico
                </button>
            </div>

            {/* Timeline View */}
            {activeTab === 'timeline' && (
                <div>
                    {sesiones.length > 0 ? (
                        <div className="relative pl-8">
                            {/* Vertical line */}
                            <div className="absolute left-3.5 top-2 bottom-2 w-px bg-gradient-to-b from-violet-300 via-violet-200 to-transparent" />

                            <div className="space-y-6">
                                {sesiones.map((s, idx) => {
                                    const completadosCount = s.ejercicios_asignados.filter(e => e.completado).length;
                                    const totalCount = s.ejercicios_asignados.length;
                                    const isAllCompleted = totalCount > 0 && completadosCount === totalCount;

                                    return (
                                        <div key={s.id} className="relative">
                                            {/* Dot */}
                                            <div
                                                className={`absolute -left-8 top-1.5 w-4 h-4 rounded-full border-2 ${idx === 0
                                                    ? 'bg-violet-500 border-violet-500 shadow-md shadow-violet-200'
                                                    : 'bg-white border-violet-300'
                                                    }`}
                                            />

                                            <div className="card hover:border-violet-200">
                                                {/* Date */}
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-violet-500" />
                                                        <span className="text-sm font-semibold text-gray-700">{s.fecha}</span>
                                                        {idx === 0 && (
                                                            <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">
                                                                Última sesión
                                                            </span>
                                                        )}
                                                    </div>
                                                    {totalCount > 0 && (
                                                        <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wide ${isAllCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                                                            }`}>
                                                            {completadosCount}/{totalCount} completados
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Exercises */}
                                                {s.ejercicios_asignados.length > 0 && (
                                                    <div className="space-y-1.5">
                                                        {s.ejercicios_asignados.map((a, i) => {
                                                            return (
                                                                <div
                                                                    key={i}
                                                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${a.completado ? 'bg-gray-50/50 border-gray-100' : 'bg-white border-gray-100'
                                                                        }`}
                                                                >
                                                                    <div className={`shrink-0 ${a.completado ? 'text-emerald-500' : 'text-gray-300'}`}>
                                                                        {a.completado ? <CheckCircle2 className="w-4 h-4" /> : <CircleDashed className="w-4 h-4" />}
                                                                    </div>
                                                                    <span className={`text-sm flex-1 truncate ${a.completado ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                                                        {formatExerciseName(a.ejercicio_id, a.progresion_desde_ejercicio_id)}
                                                                    </span>
                                                                    <span
                                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${a.lugar === 'casa'
                                                                            ? 'bg-emerald-50 text-emerald-600'
                                                                            : 'bg-violet-50 text-violet-600'
                                                                            }`}
                                                                    >
                                                                        {a.lugar === 'casa'
                                                                            ? <><Home className="w-3 h-3" /> Casa</>
                                                                            : <><Hospital className="w-3 h-3" /> Clínica</>
                                                                        }
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Notes */}
                                                {s.notas && (
                                                    <div className="mt-3 pt-3 border-t border-gray-50 flex items-start gap-2">
                                                        <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                                        <p className="text-sm text-gray-600 italic whitespace-pre-wrap">{s.notas}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="card flex flex-col items-center justify-center py-12 text-center">
                            <Clock className="w-8 h-8 text-gray-300 mb-3" />
                            <h4 className="text-base font-semibold text-gray-600">Sin sesiones aún</h4>
                            <p className="text-sm text-gray-400 mt-1">
                                Las sesiones de este paciente aparecerán aquí como una línea de tiempo.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Clinical Report View */}
            {activeTab === 'reporte' && (
                <div className="space-y-6">
                    {/* Metrics Section */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-emerald-500" />
                            Métricas de Adherencia
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* Casa Progress */}
                            <div className="card border-emerald-100 hover:border-emerald-200 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-sm">
                                        <Home className="w-4 h-4" /> Trabajo en Casa
                                    </div>
                                    <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                        {reportMetrics.complianceCasa}%
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mb-3">
                                    {reportMetrics.completadosCasa} de {reportMetrics.totalCasa} ejercicios completados históricamente.
                                </p>
                                {/* Progress Bar */}
                                <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${reportMetrics.complianceCasa}%` }}
                                    />
                                </div>
                                <div className="mt-4 pt-3 border-t border-emerald-100/70">
                                    <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 mb-2">
                                        Ejercicios ya realizados
                                    </p>
                                    {reportMetrics.completedCasaList.length > 0 ? (
                                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                            {reportMetrics.completedCasaList.map((item, idx) => (
                                                <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                                                    <span className="text-gray-700 truncate">{item.label}</span>
                                                    <span className="text-gray-400 shrink-0">{item.veces}x</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 italic">Todavía no hay ejercicios completados en casa.</p>
                                    )}
                                </div>
                            </div>

                            {/* Clinica Progress */}
                            <div className="card border-violet-100 hover:border-violet-200 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-1.5 text-violet-700 font-semibold text-sm">
                                        <Hospital className="w-4 h-4" /> Trabajo en Clínica
                                    </div>
                                    <span className="text-xs font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                                        {reportMetrics.complianceClinica}%
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mb-3">
                                    {reportMetrics.completadosClinica} de {reportMetrics.totalClinica} ejercicios completados históricamente.
                                </p>
                                {/* Progress Bar */}
                                <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-violet-500 rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${reportMetrics.complianceClinica}%` }}
                                    />
                                </div>
                                <div className="mt-4 pt-3 border-t border-violet-100/70">
                                    <p className="text-[11px] font-bold uppercase tracking-wide text-violet-700 mb-2">
                                        Ejercicios ya realizados
                                    </p>
                                    {reportMetrics.completedClinicaList.length > 0 ? (
                                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                            {reportMetrics.completedClinicaList.map((item, idx) => (
                                                <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                                                    <span className="text-gray-700 truncate">{item.label}</span>
                                                    <span className="text-gray-400 shrink-0">{item.veces}x</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 italic">Todavía no hay ejercicios completados en clínica.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Feedback History Section */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-3 mt-8 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-amber-500" />
                            Historial Clínico Continuo
                        </h3>
                        <div className="card bg-amber-50/30 border-amber-100/50">
                            {reportMetrics.notasFeed.length > 0 ? (
                                <div className="space-y-4">
                                    {reportMetrics.notasFeed.map((feedItem, idx) => (
                                        <div key={idx} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-bold text-amber-700/60 uppercase tracking-widest">
                                                    {feedItem.fecha}
                                                </span>
                                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pl-2 border-l-2 border-amber-200/50">
                                                    {feedItem.notas}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 italic text-center py-4">
                                    No hay notas clínicas registradas en el historial de sesiones.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
