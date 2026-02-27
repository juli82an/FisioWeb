import { useState, useMemo, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
    CalendarDays,
    CalendarPlus,
    Search,
    Trash2,
    Home,
    Hospital,
    ChevronDown,
    RotateCcw,
    FileText,
    Pencil,
    X,
    User,
    UsersRound,
    CheckCircle2,
    CircleDashed,
    CalendarClock,
    Tag as TagIcon,
} from 'lucide-react';
import { db, type EjercicioAsignado, type Ejercicio, type Paciente, type Sesion, type Tag } from '../db';
import { useLocation, useNavigate } from 'react-router-dom';
import SlideOver from '../components/SlideOver';
import PatientAutocomplete from '../components/PatientAutocomplete';
import ConfirmModal from '../components/ConfirmModal';

// ─── Exercise Autocomplete ──────────────────────────
function ExerciseAutocomplete({
    ejercicios,
    tags,
    onSelect,
    excludeIds,
    completedExerciseIds,
}: {
    ejercicios: Ejercicio[];
    tags: Tag[];
    onSelect: (e: Ejercicio) => void;
    excludeIds: number[];
    completedExerciseIds: Set<number>;
}) {
    const [query, setQuery] = useState('');
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const results = useMemo(() => {
        if (!query.trim() && !activeTag) return [];
        let list = ejercicios.filter(e => !excludeIds.includes(e.id!));

        if (activeTag) {
            list = list.filter(e => e.etiquetas.includes(activeTag));
        }

        if (query.trim()) {
            const q = query.toLowerCase();
            list = list.filter(e =>
                e.nombre.toLowerCase().includes(q) ||
                e.etiquetas.some(t => t.toLowerCase().includes(q))
            );
        }

        return list.slice(0, 8);
    }, [query, activeTag, ejercicios, excludeIds]);

    useEffect(() => {
        const handler = (ev: MouseEvent) => {
            if (ref.current && !ref.current.contains(ev.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const getTagColor = (tagName: string) => {
        const tag = tags.find(t => t.nombre === tagName);
        return tag ? tag.color : 'bg-slate-100 text-slate-600';
    };

    return (
        <div ref={ref} className="relative mb-2">
            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    className="input pl-10"
                    placeholder="Buscar ejercicio por nombre o etiqueta…"
                    value={query}
                    onChange={e => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => (query.trim() || activeTag) && setOpen(true)}
                />
            </div>

            {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                    {tags.map(tag => (
                        <button
                            key={tag.id}
                            type="button"
                            onClick={() => {
                                const newTag = activeTag === tag.nombre ? null : tag.nombre;
                                setActiveTag(newTag);
                                if (newTag || query.trim()) setOpen(true);
                            }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${activeTag === tag.nombre
                                ? tag.color + ' ring-2 ring-offset-1 ring-violet-300 scale-105'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            <TagIcon className="w-3 h-3 opacity-70" />
                            {tag.nombre}
                        </button>
                    ))}
                </div>
            )}

            {open && results.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                    {results.map(e => {
                        const completed = completedExerciseIds.has(e.id!);
                        return (
                            <button
                                key={e.id}
                                type="button"
                                className={`w-full text-left px-4 py-3 transition-colors border-b border-gray-100 last:border-0 flex flex-col gap-1.5 ${completed ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-violet-50'
                                    }`}
                                onClick={() => { onSelect(e); setQuery(''); setActiveTag(null); setOpen(false); }}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className={`text-sm font-semibold ${completed ? 'text-red-700 line-through' : 'text-gray-800'}`}>
                                        {e.nombre}
                                    </span>
                                    {completed && (
                                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                                            Ya realizado
                                        </span>
                                    )}
                                </div>
                                {e.etiquetas.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {e.etiquetas.map(tagName => (
                                            <span
                                                key={tagName}
                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${getTagColor(tagName)}`}
                                            >
                                                <TagIcon className="w-2.5 h-2.5" />
                                                {tagName}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {open && (query.trim() || activeTag) && results.length === 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg p-5 text-center text-sm text-gray-400">
                    No se encontraron ejercicios que coincidan con la búsqueda.
                </div>
            )}
        </div>
    );
}

function PatientContextPanel({
    paciente,
    sesionesPaciente,
    ejercicioMap,
}: {
    paciente: Paciente | null;
    sesionesPaciente: Sesion[];
    ejercicioMap: Map<number, Ejercicio>;
}) {
    const orderedSessions = useMemo(
        () => [...sesionesPaciente].sort((a, b) => b.fecha.localeCompare(a.fecha)),
        [sesionesPaciente]
    );

    const summary = useMemo(() => {
        let totalAsignados = 0;
        let totalCompletados = 0;
        const completedMap = new Map<number, { count: number; lastDate: string }>();

        orderedSessions.forEach(s => {
            s.ejercicios_asignados.forEach(a => {
                totalAsignados++;
                if (!a.completado) return;
                totalCompletados++;
                const prev = completedMap.get(a.ejercicio_id);
                if (prev) {
                    completedMap.set(a.ejercicio_id, {
                        count: prev.count + 1,
                        lastDate: s.fecha > prev.lastDate ? s.fecha : prev.lastDate,
                    });
                    return;
                }
                completedMap.set(a.ejercicio_id, { count: 1, lastDate: s.fecha });
            });
        });

        const completion = totalAsignados > 0 ? Math.round((totalCompletados / totalAsignados) * 100) : 0;
        return {
            totalAsignados,
            totalCompletados,
            completion,
            completedMap,
            recentSessions: orderedSessions.slice(0, 4),
        };
    }, [orderedSessions]);

    const completedEntries = useMemo(
        () =>
            Array.from(summary.completedMap.entries())
                .sort((a, b) => b[1].lastDate.localeCompare(a[1].lastDate))
                .slice(0, 8)
                .map(([id, info]) => ({
                    id,
                    info,
                    nombre: ejercicioMap.get(id)?.nombre ?? `Ejercicio #${id}`,
                })),
        [summary.completedMap, ejercicioMap]
    );

    return (
        <div className="h-full flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-base font-semibold text-gray-800">Información del paciente</h3>
                <p className="text-xs text-gray-500 mt-0.5">Resumen clínico durante la sesión</p>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50">
                {paciente ? (
                    <>
                        <div className="bg-white rounded-2xl border border-gray-100 p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-sanitary-100 text-sanitary-700 font-bold text-sm shrink-0">
                                    {paciente.nombre[0]}{paciente.apellidos?.[0] ?? ''}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-gray-800 truncate">
                                        {paciente.nombre} {paciente.apellidos}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                        {paciente.fecha_nacimiento || 'Fecha de nacimiento no registrada'}
                                    </p>
                                </div>
                            </div>
                            {paciente.historial && (
                                <p className="text-xs text-gray-600 mt-3 border-t border-gray-100 pt-3 whitespace-pre-wrap">
                                    {paciente.historial}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white rounded-xl border border-gray-100 px-3 py-2.5">
                                <p className="text-[11px] uppercase tracking-wide text-gray-400">Sesiones</p>
                                <p className="text-lg font-semibold text-gray-800">{orderedSessions.length}</p>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-100 px-3 py-2.5">
                                <p className="text-[11px] uppercase tracking-wide text-gray-400">Adherencia</p>
                                <p className="text-lg font-semibold text-emerald-700">{summary.completion}%</p>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-100 px-3 py-2.5">
                                <p className="text-[11px] uppercase tracking-wide text-gray-400">Asignados</p>
                                <p className="text-lg font-semibold text-gray-800">{summary.totalAsignados}</p>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-100 px-3 py-2.5">
                                <p className="text-[11px] uppercase tracking-wide text-gray-400">Completados</p>
                                <p className="text-lg font-semibold text-violet-700">{summary.totalCompletados}</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 p-4">
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                                Ejercicios completados
                            </p>
                            {completedEntries.length > 0 ? (
                                <div className="space-y-1.5">
                                    {completedEntries.map(entry => (
                                        <div key={entry.id} className="text-xs text-gray-700 flex items-center justify-between gap-2">
                                            <span className="truncate">{entry.nombre}</span>
                                            <span className="text-[10px] text-gray-400 shrink-0">
                                                {entry.info.count}x
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400 italic">Sin ejercicios completados todavía.</p>
                            )}
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 p-4">
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                                Últimas sesiones
                            </p>
                            {summary.recentSessions.length > 0 ? (
                                <div className="space-y-2">
                                    {summary.recentSessions.map(s => {
                                        const total = s.ejercicios_asignados.length;
                                        const done = s.ejercicios_asignados.filter(a => a.completado).length;
                                        return (
                                            <div key={s.id} className="flex items-center justify-between text-xs">
                                                <span className="text-gray-700">{s.fecha}</span>
                                                <span className="text-gray-500">{done}/{total}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400 italic">Este paciente aún no tiene sesiones.</p>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center px-6">
                        <User className="w-10 h-10 text-gray-300 mb-3" />
                        <p className="text-sm font-semibold text-gray-600">Selecciona un paciente</p>
                        <p className="text-xs text-gray-400 mt-1">
                            Al seleccionar un paciente verás aquí su resumen clínico.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main Page ──────────────────────────────────────
export default function SesionesPage() {
    const sesiones = useLiveQuery(() => db.sesiones.orderBy('fecha').reverse().toArray()) ?? [];
    const pacientes = useLiveQuery(() => db.pacientes.toArray()) ?? [];
    const ejercicios = useLiveQuery(() => db.ejercicios.toArray()) ?? [];
    const grupos = useLiveQuery(() => db.grupos.toArray()) ?? [];
    const tags = useLiveQuery(() => db.tags.toArray()) ?? [];

    // Session creation state
    const [slideOpen, setSlideOpen] = useState(false);
    const [mode, setMode] = useState<'paciente' | 'grupo'>('paciente');
    const [selectedPacienteId, setSelectedPacienteId] = useState<number | ''>('');
    const [selectedGrupoId, setSelectedGrupoId] = useState<number | ''>('');
    const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
    const [notas, setNotas] = useState('');
    const [asignados, setAsignados] = useState<EjercicioAsignado[]>([]);
    const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
    const [autoLoaded, setAutoLoaded] = useState(false);
    const [replacingIdx, setReplacingIdx] = useState<number | null>(null);

    // Session viewing/execution state
    const [viewSlideOpen, setViewSlideOpen] = useState(false);
    const [viewingSession, setViewingSession] = useState<Sesion | null>(null);
    const [execNotas, setExecNotas] = useState('');
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const location = useLocation();
    const navigate = useNavigate();

    // Helpers
    const pacienteMap = useMemo(() => {
        const m = new Map<number, Paciente>();
        pacientes.forEach(p => m.set(p.id!, p));
        return m;
    }, [pacientes]);

    const ejercicioMap = useMemo(() => {
        const m = new Map<number, Ejercicio>();
        ejercicios.forEach(e => m.set(e.id!, e));
        return m;
    }, [ejercicios]);

    const selectedPaciente = useMemo(() => {
        if (mode !== 'paciente' || !selectedPacienteId) return null;
        return pacienteMap.get(selectedPacienteId as number) ?? null;
    }, [mode, selectedPacienteId, pacienteMap]);

    const selectedPacienteHistorySessions = useMemo(() => {
        if (mode !== 'paciente' || !selectedPacienteId) return [];
        return sesiones.filter(s => s.paciente_id === selectedPacienteId && s.id !== editingSessionId);
    }, [sesiones, selectedPacienteId, editingSessionId, mode]);

    const completedExerciseMeta = useMemo(() => {
        const map = new Map<number, { count: number; lastDate: string }>();
        selectedPacienteHistorySessions.forEach(s => {
            s.ejercicios_asignados.forEach(a => {
                if (!a.completado) return;
                const prev = map.get(a.ejercicio_id);
                if (prev) {
                    map.set(a.ejercicio_id, {
                        count: prev.count + 1,
                        lastDate: s.fecha > prev.lastDate ? s.fecha : prev.lastDate,
                    });
                    return;
                }
                map.set(a.ejercicio_id, { count: 1, lastDate: s.fecha });
            });
        });
        return map;
    }, [selectedPacienteHistorySessions]);

    const completedExerciseIds = useMemo(
        () => new Set<number>(Array.from(completedExerciseMeta.keys())),
        [completedExerciseMeta]
    );

    const viewingPaciente = useMemo(() => {
        if (!viewingSession) return null;
        return pacienteMap.get(viewingSession.paciente_id) ?? null;
    }, [viewingSession, pacienteMap]);

    const viewingPacienteSessions = useMemo(() => {
        if (!viewingSession) return [];
        return sesiones.filter(s => s.paciente_id === viewingSession.paciente_id);
    }, [viewingSession, sesiones]);

    // ── Auto-load last session exercises ──────────────
    useEffect(() => {
        if (mode !== 'paciente' || !selectedPacienteId || autoLoaded || editingSessionId) return;
        (async () => {
            const lastSession = await db.sesiones
                .where('[paciente_id+fecha]')
                .between([selectedPacienteId as number, ''], [selectedPacienteId as number, '\uffff'])
                .reverse()
                .limit(1)
                .toArray();
            if (lastSession.length > 0) {
                const prev = lastSession[0];
                const allExercises = prev.ejercicios_asignados.map(a => ({
                    ...a,
                    completado: false,
                }));

                if (allExercises.length > 0) {
                    setAsignados(allExercises);
                    setAutoLoaded(true);
                }
            }
        })();
    }, [selectedPacienteId, autoLoaded, editingSessionId, mode]);

    // ── Direct Session Initialization (from Navigate state) ───
    useEffect(() => {
        const state = location.state as { newSessionForPaciente?: number; newSessionForGrupo?: number } | null;
        if (state?.newSessionForPaciente) {
            setMode('paciente');
            setSelectedPacienteId(state.newSessionForPaciente);
            setSelectedGrupoId('');
            setFecha(new Date().toISOString().slice(0, 10));
            setNotas('');
            setAsignados([]);
            setEditingSessionId(null);
            setAutoLoaded(false);
            setReplacingIdx(null);
            setSlideOpen(true);
            navigate(location.pathname, { replace: true });
        } else if (state?.newSessionForGrupo) {
            setMode('grupo');
            setSelectedGrupoId(state.newSessionForGrupo);
            setSelectedPacienteId('');
            setFecha(new Date().toISOString().slice(0, 10));
            setNotas('');
            setAsignados([]);
            setEditingSessionId(null);
            setAutoLoaded(false);
            setReplacingIdx(null);
            setSlideOpen(true);
            navigate(location.pathname, { replace: true });
        }
    }, [location.state, location.pathname, navigate]);

    // ── Handlers (Creation) ────────────────────────────
    const openNew = () => {
        setMode('paciente');
        setSelectedPacienteId('');
        setSelectedGrupoId('');
        setFecha(new Date().toISOString().slice(0, 10));
        setNotas('');
        setAsignados([]);
        setEditingSessionId(null);
        setAutoLoaded(false);
        setReplacingIdx(null);
        setSlideOpen(true);
    };

    const addEjercicio = (e: Ejercicio) => {
        setAsignados(prev => [...prev, { ejercicio_id: e.id!, lugar: 'clinica', completado: false }]);
        setReplacingIdx(null);
    };

    const replaceEjercicio = (idx: number, e: Ejercicio) => {
        setAsignados(prev => prev.map((a, currentIdx) => {
            if (currentIdx !== idx) return a;
            if (a.ejercicio_id === e.id) return a;
            return {
                ...a,
                ejercicio_id: e.id!,
                completado: false,
                progresion_desde_ejercicio_id: a.ejercicio_id,
            };
        }));
        setReplacingIdx(null);
    };

    const removeEjercicio = (idx: number) => {
        setAsignados(prev => prev.filter((_, i) => i !== idx));
        setReplacingIdx(prev => {
            if (prev === null) return null;
            if (prev === idx) return null;
            if (prev > idx) return prev - 1;
            return prev;
        });
    };

    const toggleLugar = (idx: number) => {
        setAsignados(prev =>
            prev.map((a, i) => i === idx ? { ...a, lugar: a.lugar === 'clinica' ? 'casa' : 'clinica' } : a),
        );
    };

    const handleSave = async () => {
        if (mode === 'paciente') {
            if (!selectedPacienteId) return;
            if (editingSessionId) {
                await db.sesiones.update(editingSessionId, {
                    paciente_id: selectedPacienteId as number,
                    fecha,
                    notas: notas.trim(),
                    ejercicios_asignados: asignados,
                });
            } else {
                await db.sesiones.add({
                    paciente_id: selectedPacienteId as number,
                    fecha,
                    notas: notas.trim(),
                    ejercicios_asignados: asignados,
                });
            }
        } else {
            if (!selectedGrupoId) return;
            const grupo = grupos.find(g => g.id === selectedGrupoId);
            if (!grupo) return;
            const promises = grupo.pacientes_ids.map(pid =>
                db.sesiones.add({
                    paciente_id: pid,
                    grupo_id: grupo.id,
                    fecha,
                    notas: notas.trim(),
                    ejercicios_asignados: asignados.map(a => ({ ...a })),
                }),
            );
            await Promise.all(promises);
        }
        setSlideOpen(false);
        setReplacingIdx(null);
    };

    const handleDeleteClick = (e: React.MouseEvent, id?: number) => {
        e.stopPropagation();
        if (id) setDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        await db.sesiones.delete(deleteId);
        if (viewingSession?.id === deleteId) setViewSlideOpen(false);
        setDeleteId(null);
    };

    const handleEditClick = (e: React.MouseEvent, s: Sesion) => {
        e.stopPropagation();
        setEditingSessionId(s.id!);
        if (s.grupo_id) {
            setMode('grupo');
            setSelectedGrupoId(s.grupo_id);
            setSelectedPacienteId('');
        } else {
            setMode('paciente');
            setSelectedPacienteId(s.paciente_id);
            setSelectedGrupoId('');
        }
        setFecha(s.fecha);
        setNotas(s.notas);
        setAsignados(s.ejercicios_asignados.map(a => ({ ...a })));
        setAutoLoaded(false);
        setReplacingIdx(null);
        setSlideOpen(true);
    };

    const onPacienteChange = (val: number | '') => {
        setSelectedPacienteId(val);
        setAutoLoaded(false);
        setAsignados([]);
        setReplacingIdx(null);
    };

    // ── Handlers (Execution/Viewing) ───────────────────
    const openSession = (s: Sesion) => {
        setViewingSession(s);
        setExecNotas(s.notas);
        setViewSlideOpen(true);
    };

    const toggleExecStatus = async (idx: number) => {
        if (!viewingSession?.id) return;

        const updatedAsignados = [...viewingSession.ejercicios_asignados];
        updatedAsignados[idx] = {
            ...updatedAsignados[idx],
            completado: !updatedAsignados[idx].completado,
        };

        const updatedSession = { ...viewingSession, ejercicios_asignados: updatedAsignados };
        setViewingSession(updatedSession);

        await db.sesiones.update(viewingSession.id, { ejercicios_asignados: updatedAsignados });
    };

    const handleExecNotesSave = async () => {
        if (!viewingSession?.id) return;
        await db.sesiones.update(viewingSession.id, { notas: execNotas.trim() });
        setViewSlideOpen(false);
    };

    // Calculated execution lists
    const execClinica = useMemo(() => {
        if (!viewingSession) return [];
        return viewingSession.ejercicios_asignados.map((a, currentIdx) => ({ a, currentIdx })).filter(o => o.a.lugar === 'clinica');
    }, [viewingSession]);

    const execCasa = useMemo(() => {
        if (!viewingSession) return [];
        return viewingSession.ejercicios_asignados.map((a, currentIdx) => ({ a, currentIdx })).filter(o => o.a.lugar === 'casa');
    }, [viewingSession]);

    const formatAssignedName = (a: EjercicioAsignado) => {
        const current = ejercicioMap.get(a.ejercicio_id)?.nombre ?? `Ejercicio #${a.ejercicio_id}`;
        if (!a.progresion_desde_ejercicio_id) return current;
        const prev = ejercicioMap.get(a.progresion_desde_ejercicio_id)?.nombre ?? `Ejercicio #${a.progresion_desde_ejercicio_id}`;
        return `${prev} -> ${current}`;
    };

    // ── Render ─────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Sesiones</h2>
                    <p className="text-gray-500 mt-1">
                        {sesiones.length} sesión{sesiones.length !== 1 ? 'es' : ''} registrada{sesiones.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <button onClick={openNew} className="btn-primary">
                    <CalendarPlus className="w-4 h-4" />
                    Nueva Sesión
                </button>
            </div>

            {/* Session list */}
            {sesiones.length > 0 ? (
                <div className="space-y-3">
                    {sesiones.map(s => {
                        const pac = pacienteMap.get(s.paciente_id);

                        const totalEj = s.ejercicios_asignados.length;
                        const completadosEj = s.ejercicios_asignados.filter(e => e.completado).length;
                        const isAllCompleted = totalEj > 0 && totalEj === completadosEj;

                        return (
                            <div
                                key={s.id}
                                onClick={() => openSession(s)}
                                className="card group hover:border-violet-300 cursor-pointer transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`flex items-center justify-center w-11 h-11 rounded-xl shrink-0 transition-colors ${isAllCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-violet-100 text-violet-600'
                                            }`}>
                                            {isAllCompleted ? <CheckCircle2 className="w-5 h-5" /> : <CalendarDays className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-800 leading-tight group-hover:text-violet-700 transition-colors">
                                                {pac ? `${pac.nombre} ${pac.apellidos}` : `Paciente #${s.paciente_id}`}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-gray-500 font-medium">{s.fecha}</span>
                                                {totalEj > 0 && (
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${isAllCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                                        }`}>
                                                        {completadosEj}/{totalEj} completados
                                                    </span>
                                                )}
                                            </div>
                                            {s.grupo_id != null && (
                                                <span className="mt-1 inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                                                    <UsersRound className="w-3 h-3" /> Grupo
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => handleEditClick(e, s)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-sanitary-600 hover:bg-sanitary-50 transition-colors"
                                            title="Editar sesión"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteClick(e, s.id)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            title="Eliminar sesión"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Exercises Preview */}
                                {s.ejercicios_asignados.length > 0 && (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {s.ejercicios_asignados.map((a, i) => (
                                            <span
                                                key={i}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${a.completado
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                    : 'bg-gray-50 text-gray-600 border-gray-100'
                                                    }`}
                                            >
                                                {a.completado ? (
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                                ) : (
                                                    a.lugar === 'casa'
                                                        ? <Home className="w-3 h-3 text-emerald-400" />
                                                        : <Hospital className="w-3 h-3 text-violet-400" />
                                                )}
                                                <span className={a.completado ? 'line-through opacity-70' : ''}>
                                                    {formatAssignedName(a)}
                                                </span>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Notes Preview */}
                                {s.notas && (
                                    <div className="mt-3 pt-3 border-t border-gray-50 flex items-start gap-2 text-sm text-gray-500">
                                        <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                        <p className="line-clamp-1 italic">{s.notas}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="card flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-100 mb-4">
                        <CalendarDays className="w-8 h-8 text-violet-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700">Sin sesiones aún</h3>
                    <p className="text-sm text-gray-400 mt-1 max-w-sm">
                        Registra sesiones vinculadas a pacientes con notas y ejercicios asignados.
                    </p>
                </div>
            )}

            {/* ── SlideOver Form (Creation/Edition) ─────────────────────────── */}
            <SlideOver
                open={slideOpen}
                onClose={() => { setSlideOpen(false); setReplacingIdx(null); }}
                title={editingSessionId ? 'Editar Sesión' : 'Nueva Sesión'}
                leftPanel={mode === 'paciente' ? (
                    <PatientContextPanel
                        paciente={selectedPaciente}
                        sesionesPaciente={selectedPacienteHistorySessions}
                        ejercicioMap={ejercicioMap}
                    />
                ) : undefined}
                panelClassName="max-w-xl"
            >
                <div className="space-y-5">
                    {/* Mode toggle */}
                    <div className="flex rounded-xl bg-gray-100 p-1">
                        <button
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'paciente' ? 'bg-white shadow-sm text-sanitary-700' : 'text-gray-500'
                                }`}
                            onClick={() => setMode('paciente')}
                        >
                            <User className="w-4 h-4" /> Paciente
                        </button>
                        <button
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'grupo' ? 'bg-white shadow-sm text-sanitary-700' : 'text-gray-500'
                                }`}
                            onClick={() => setMode('grupo')}
                        >
                            <UsersRound className="w-4 h-4" /> Grupo
                        </button>
                    </div>

                    {/* Selector */}
                    {mode === 'paciente' ? (
                        <div>
                            <label className="label">Paciente *</label>
                            <PatientAutocomplete
                                pacientes={pacientes}
                                selectedId={selectedPacienteId}
                                onSelect={onPacienteChange}
                            />
                            {autoLoaded && (
                                <div className="mt-2 p-3 bg-violet-50 rounded-xl border border-violet-100 flex items-start gap-2 text-violet-700">
                                    <RotateCcw className="w-4 h-4 mt-0.5 shrink-0" />
                                    <div className="text-sm">
                                        <p className="font-semibold">Ejercicios cargados automáticamente</p>
                                        <p className="text-violet-600/80 mt-0.5 leading-snug text-xs">
                                            Se han añadido los ejercicios de la última sesión. Los ya completados aparecen en rojo y tachados.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <label className="label">Grupo *</label>
                            <div className="relative">
                                <select
                                    className="input appearance-none pr-10"
                                    value={selectedGrupoId}
                                    onChange={e => setSelectedGrupoId(e.target.value ? Number(e.target.value) : '')}
                                >
                                    <option value="">Seleccionar grupo…</option>
                                    {grupos.map(g => (
                                        <option key={g.id} value={g.id}>{g.nombre} ({g.pacientes_ids.length} miembros)</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    )}

                    {/* Date */}
                    <div>
                        <label className="label">Fecha</label>
                        <input type="date" className="input" value={fecha} onChange={e => setFecha(e.target.value)} />
                    </div>

                    {/* Exercise autocomplete */}
                    <div>
                        <label className="label">Añadir ejercicios</label>
                        <ExerciseAutocomplete
                            ejercicios={ejercicios}
                            tags={tags}
                            onSelect={addEjercicio}
                            excludeIds={asignados.map(a => a.ejercicio_id)}
                            completedExerciseIds={completedExerciseIds}
                        />
                    </div>

                    {/* Assigned exercises */}
                    {asignados.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Ejercicios asignados ({asignados.length})
                            </p>
                            {asignados.map((a, i) => {
                                const ej = ejercicioMap.get(a.ejercicio_id);
                                const wasCompletedBefore = completedExerciseMeta.has(a.ejercicio_id);
                                const fromProgression = a.progresion_desde_ejercicio_id
                                    ? ejercicioMap.get(a.progresion_desde_ejercicio_id)
                                    : null;
                                return (
                                    <div
                                        key={i}
                                        className={`px-3 py-2.5 rounded-xl border ${wasCompletedBefore ? 'bg-red-50/60 border-red-200' : 'bg-gray-50 border-gray-100'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <span className={`text-sm font-medium truncate block ${wasCompletedBefore ? 'text-red-700 line-through' : 'text-gray-700'}`}>
                                                    {ej?.nombre ?? `#${a.ejercicio_id}`}
                                                </span>
                                                {wasCompletedBefore && (
                                                    <span className="text-[10px] text-red-500 font-medium">
                                                        Ya realizado en historial
                                                    </span>
                                                )}
                                                {fromProgression && (
                                                    <span className="text-[10px] text-violet-600 font-medium block">
                                                        Progresión: {fromProgression.nombre} {'->'} {ej?.nombre ?? `#${a.ejercicio_id}`}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleLugar(i)}
                                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${a.lugar === 'clinica'
                                                        ? 'bg-violet-100 text-violet-700'
                                                        : 'bg-emerald-100 text-emerald-700'
                                                        }`}
                                                    title={a.lugar === 'clinica' ? 'En clínica' : 'Para casa'}
                                                >
                                                    {a.lugar === 'clinica'
                                                        ? <><Hospital className="w-3 h-3" /> Clínica</>
                                                        : <><Home className="w-3 h-3" /> Casa</>
                                                    }
                                                </button>
                                                {wasCompletedBefore && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setReplacingIdx(prev => prev === i ? null : i)}
                                                        className={`p-1 rounded-lg transition-colors ${replacingIdx === i
                                                            ? 'text-violet-700 bg-violet-100'
                                                            : 'text-gray-400 hover:text-violet-600 hover:bg-violet-50'
                                                            }`}
                                                        title="Sustituir por otro ejercicio"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => removeEjercicio(i)}
                                                    className="p-1 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                                                    title="Eliminar ejercicio"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        {replacingIdx === i && (
                                            <div className="mt-2 pt-2 border-t border-violet-100">
                                                <p className="text-[10px] uppercase tracking-wide text-violet-600 font-semibold mb-1.5">
                                                    Selecciona el ejercicio progresado
                                                </p>
                                                <ExerciseAutocomplete
                                                    ejercicios={ejercicios}
                                                    tags={tags}
                                                    onSelect={(nextExercise) => replaceEjercicio(i, nextExercise)}
                                                    excludeIds={asignados
                                                        .filter((_, currentIdx) => currentIdx !== i)
                                                        .map(item => item.ejercicio_id)}
                                                    completedExerciseIds={completedExerciseIds}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className="label">Notas iniciales</label>
                        <textarea
                            className="input min-h-[80px] resize-y"
                            placeholder="Observaciones previas, objetivos..."
                            value={notas}
                            onChange={e => setNotas(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button onClick={handleSave} className="btn-primary flex-1 justify-center">
                            {editingSessionId ? 'Guardar Cambios' : 'Crear Sesión'}
                        </button>
                        <button onClick={() => { setSlideOpen(false); setReplacingIdx(null); }} className="btn-secondary flex-1 justify-center">
                            Cancelar
                        </button>
                    </div>
                </div>
            </SlideOver>

            {/* ── SlideOver Form (Execution/View) ──────────────── */}
            <SlideOver
                open={viewSlideOpen}
                onClose={() => setViewSlideOpen(false)}
                title="Ejecución de Sesión"
                leftPanel={(
                    <PatientContextPanel
                        paciente={viewingPaciente}
                        sesionesPaciente={viewingPacienteSessions}
                        ejercicioMap={ejercicioMap}
                    />
                )}
                panelClassName="max-w-xl"
            >
                {viewingSession && (
                    <div className="space-y-6 flex flex-col h-full">
                        {/* Header Info */}
                        <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 p-4 rounded-xl border border-violet-100 shrink-0">
                            <div className="flex items-center gap-2 text-violet-800 mb-1">
                                <User className="w-4 h-4" />
                                <span className="font-semibold">
                                    {pacienteMap.get(viewingSession.paciente_id)?.nombre} {pacienteMap.get(viewingSession.paciente_id)?.apellidos}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-violet-600/80 text-sm">
                                <CalendarClock className="w-4 h-4" />
                                <span>{viewingSession.fecha}</span>
                            </div>
                        </div>

                        {/* Exercises Checklists */}
                        <div className="flex-1 overflow-y-auto space-y-6 px-1">
                            {/* Clínica section */}
                            {execClinica.length > 0 && (
                                <section>
                                    <h3 className="flex items-center gap-2 text-sm font-bold text-violet-700 mb-3 pb-2 border-b border-violet-100">
                                        <Hospital className="w-4 h-4" />
                                        En Clínica ({execClinica.filter(o => o.a.completado).length}/{execClinica.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {execClinica.map(({ a, currentIdx }) => (
                                            <div
                                                key={currentIdx}
                                                onClick={() => toggleExecStatus(currentIdx)}
                                                className={`group flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${a.completado
                                                    ? 'bg-violet-50/50 border-violet-100'
                                                    : 'bg-white border-gray-200 hover:border-violet-300 shadow-sm'
                                                    }`}
                                            >
                                                <div className={`transition-colors shrink-0 ${a.completado ? 'text-violet-500' : 'text-gray-300 group-hover:text-violet-400'}`}>
                                                    {a.completado ? <CheckCircle2 className="w-6 h-6" /> : <CircleDashed className="w-6 h-6" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-medium transition-all ${a.completado ? 'text-violet-700/60 line-through' : 'text-gray-800'}`}>
                                                        {formatAssignedName(a)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Casa section */}
                            {execCasa.length > 0 && (
                                <section>
                                    <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-700 mb-3 pb-2 border-b border-emerald-100">
                                        <Home className="w-4 h-4" />
                                        Para Casa ({execCasa.filter(o => o.a.completado).length}/{execCasa.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {execCasa.map(({ a, currentIdx }) => (
                                            <div
                                                key={currentIdx}
                                                onClick={() => toggleExecStatus(currentIdx)}
                                                className={`group flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${a.completado
                                                    ? 'bg-emerald-50/50 border-emerald-100'
                                                    : 'bg-white border-gray-200 hover:border-emerald-300 shadow-sm'
                                                    }`}
                                            >
                                                <div className={`transition-colors shrink-0 ${a.completado ? 'text-emerald-500' : 'text-gray-300 group-hover:text-emerald-400'}`}>
                                                    {a.completado ? <CheckCircle2 className="w-6 h-6" /> : <CircleDashed className="w-6 h-6" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-medium transition-all ${a.completado ? 'text-emerald-700/60 line-through' : 'text-gray-800'}`}>
                                                        {formatAssignedName(a)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {viewingSession.ejercicios_asignados.length === 0 && (
                                <p className="text-sm text-gray-400 italic text-center py-6">No hay ejercicios asignados.</p>
                            )}

                            {/* Notes update */}
                            <div className="pt-2">
                                <label className="flex items-center gap-2 label text-gray-700">
                                    <FileText className="w-4 h-4" /> Notas de la sesión
                                </label>
                                <textarea
                                    className="input min-h-[100px] resize-y bg-yellow-50/30 focus:bg-white"
                                    placeholder="Anota cómo fue la sesión, el progreso del paciente, dificultades reportadas..."
                                    value={execNotas}
                                    onChange={e => setExecNotas(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4 border-t border-gray-100 shrink-0">
                            <button onClick={handleExecNotesSave} className="btn-primary flex-1 justify-center">
                                Guardar Cierre
                            </button>
                        </div>
                    </div>
                )}
            </SlideOver>

            {/* Confirm Delete Modal */}
            <ConfirmModal
                isOpen={deleteId !== null}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                title="Eliminar Sesión"
                message="¿Seguro que quieres eliminar esta sesión? Esta acción no se puede deshacer."
            />
        </div>
    );
}
