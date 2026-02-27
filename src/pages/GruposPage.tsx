import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
    UsersRound,
    FolderPlus,
    Search,
    Pencil,
    Trash2,
    Check,
    UserPlus,
    X,
    PlayCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, type Grupo, type Paciente } from '../db';
import SlideOver from '../components/SlideOver';
import ConfirmModal from '../components/ConfirmModal';

export default function GruposPage() {
    const grupos = useLiveQuery(() => db.grupos.toArray()) ?? [];
    const pacientes = useLiveQuery(() => db.pacientes.toArray()) ?? [];
    const navigate = useNavigate();

    const [slideOpen, setSlideOpen] = useState(false);
    const [editing, setEditing] = useState<Grupo | null>(null);
    const [nombre, setNombre] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [patientSearch, setPatientSearch] = useState('');
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const pacienteMap = useMemo(() => {
        const m = new Map<number, Paciente>();
        pacientes.forEach(p => m.set(p.id!, p));
        return m;
    }, [pacientes]);

    const filteredPacientes = useMemo(() => {
        if (!patientSearch.trim()) return pacientes;
        const q = patientSearch.toLowerCase();
        return pacientes.filter(p =>
            p.nombre.toLowerCase().includes(q) ||
            p.apellidos.toLowerCase().includes(q),
        );
    }, [pacientes, patientSearch]);

    const openNew = () => {
        setEditing(null);
        setNombre('');
        setSelectedIds([]);
        setPatientSearch('');
        setSlideOpen(true);
    };

    const openEdit = (g: Grupo) => {
        setEditing(g);
        setNombre(g.nombre);
        setSelectedIds([...g.pacientes_ids]);
        setPatientSearch('');
        setSlideOpen(true);
    };

    const togglePatient = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
        );
    };

    const handleSave = async () => {
        if (!nombre.trim()) return;
        if (editing?.id) {
            const oldGroup = await db.grupos.get(editing.id);
            await db.grupos.update(editing.id, {
                nombre: nombre.trim(),
                pacientes_ids: selectedIds,
            });
            if (oldGroup) {
                const removed = oldGroup.pacientes_ids.filter(id => !selectedIds.includes(id));
                const added = selectedIds.filter(id => !oldGroup.pacientes_ids.includes(id));
                for (const pid of removed) {
                    const p = await db.pacientes.get(pid);
                    if (p) await db.pacientes.update(pid, { grupos_ids: p.grupos_ids.filter(gid => gid !== editing.id) });
                }
                for (const pid of added) {
                    const p = await db.pacientes.get(pid);
                    if (p && !p.grupos_ids.includes(editing.id!)) {
                        await db.pacientes.update(pid, { grupos_ids: [...p.grupos_ids, editing.id!] });
                    }
                }
            }
        } else {
            const groupId = await db.grupos.add({
                nombre: nombre.trim(),
                pacientes_ids: selectedIds,
            });
            for (const pid of selectedIds) {
                const p = await db.pacientes.get(pid);
                if (p) await db.pacientes.update(pid, { grupos_ids: [...p.grupos_ids, groupId as number] });
            }
        }
        setSlideOpen(false);
    };

    const handleDeleteClick = (e: React.MouseEvent, id?: number) => {
        e.preventDefault();
        if (id) setDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        const g = await db.grupos.get(deleteId);
        if (g) {
            for (const pid of g.pacientes_ids) {
                const p = await db.pacientes.get(pid);
                if (p) await db.pacientes.update(pid, { grupos_ids: p.grupos_ids.filter(gid => gid !== deleteId) });
            }
        }
        await db.grupos.delete(deleteId);
        setDeleteId(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Grupos</h2>
                    <p className="text-gray-500 mt-1">
                        {grupos.length} grupo{grupos.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <button onClick={openNew} className="btn-primary">
                    <FolderPlus className="w-4 h-4" />
                    Nuevo Grupo
                </button>
            </div>

            {grupos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {grupos.map(g => (
                        <div key={g.id} className="card group hover:border-amber-200">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-amber-100 text-amber-600 shrink-0">
                                        <UsersRound className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-800">{g.nombre}</h4>
                                        <p className="text-xs text-gray-400">
                                            {g.pacientes_ids.length} miembro{g.pacientes_ids.length !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => navigate('/sesiones', { state: { newSessionForGrupo: g.id } })}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                        title="Iniciar Sesión Directa"
                                    >
                                        <PlayCircle className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => openEdit(g)}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                        title="Editar"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteClick(e, g.id)}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {g.pacientes_ids.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {g.pacientes_ids.slice(0, 6).map(pid => {
                                        const p = pacienteMap.get(pid);
                                        return (
                                            <span
                                                key={pid}
                                                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-sanitary-100 text-sanitary-700 text-xs font-bold"
                                                title={p ? `${p.nombre} ${p.apellidos}` : `#${pid}`}
                                            >
                                                {p ? `${p.nombre[0]}${p.apellidos?.[0] ?? ''}` : '?'}
                                            </span>
                                        );
                                    })}
                                    {g.pacientes_ids.length > 6 && (
                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-500 text-xs font-bold">
                                            +{g.pacientes_ids.length - 6}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 mb-4">
                        <UsersRound className="w-8 h-8 text-amber-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700">Sin grupos aún</h3>
                    <p className="text-sm text-gray-400 mt-1 max-w-sm">
                        Crea grupos para organizar pacientes por patología, horario u otros criterios.
                    </p>
                </div>
            )}

            <SlideOver
                open={slideOpen}
                onClose={() => setSlideOpen(false)}
                title={editing ? 'Editar Grupo' : 'Nuevo Grupo'}
            >
                <div className="space-y-5">
                    <div>
                        <label className="label">Nombre del grupo *</label>
                        <input
                            className="input"
                            placeholder="Ej: Lumbalgia crónica"
                            value={nombre}
                            onChange={e => setNombre(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="label">Miembros ({selectedIds.length} seleccionados)</label>
                        <div className="relative mb-2">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                className="input pl-10 pr-10"
                                placeholder="Buscar paciente…"
                                value={patientSearch}
                                onChange={e => setPatientSearch(e.target.value)}
                            />
                            {patientSearch && (
                                <button
                                    type="button"
                                    onClick={() => setPatientSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="max-h-52 overflow-y-auto space-y-1 border border-gray-100 rounded-xl p-2">
                            {filteredPacientes.map(p => {
                                const isSelected = selectedIds.includes(p.id!);
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => togglePatient(p.id!)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isSelected
                                            ? 'bg-sanitary-50 text-sanitary-700'
                                            : 'hover:bg-gray-50 text-gray-700'
                                            }`}
                                    >
                                        <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${isSelected ? 'bg-sanitary-200 text-sanitary-800' : 'bg-gray-100 text-gray-500'
                                            }`}>
                                            {p.nombre[0]}{p.apellidos?.[0] ?? ''}
                                        </div>
                                        <span className="flex-1 text-left truncate">{p.nombre} {p.apellidos}</span>
                                        {isSelected
                                            ? <Check className="w-4 h-4 text-sanitary-600 shrink-0" />
                                            : <UserPlus className="w-4 h-4 text-gray-300 shrink-0" />
                                        }
                                    </button>
                                );
                            })}
                            {filteredPacientes.length === 0 && (
                                <p className="text-sm text-gray-400 text-center py-4">No se encontraron pacientes</p>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button onClick={handleSave} className="btn-primary flex-1 justify-center">
                            {editing ? 'Guardar Cambios' : 'Crear Grupo'}
                        </button>
                        <button onClick={() => setSlideOpen(false)} className="btn-secondary flex-1 justify-center">
                            Cancelar
                        </button>
                    </div>
                </div>
            </SlideOver>

            <ConfirmModal
                isOpen={deleteId !== null}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                title="Eliminar Grupo"
                message="¿Seguro que quieres eliminar este grupo? Los pacientes no serán eliminados, pero perderás la organización del grupo y sus sesiones colectivas."
            />
        </div>
    );
}
