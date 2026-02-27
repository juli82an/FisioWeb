import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import {
    Users,
    UserPlus,
    Search,
    Pencil,
    Trash2,
    Calendar,
    FileText,
    Eye,
    PlayCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, type Paciente } from '../db';
import SlideOver from '../components/SlideOver';
import ConfirmModal from '../components/ConfirmModal';

const emptyForm = { nombre: '', apellidos: '', fecha_nacimiento: '', historial: '' };

export default function PacientesPage() {
    const pacientes = useLiveQuery(() => db.pacientes.toArray()) ?? [];
    const navigate = useNavigate();

    const [search, setSearch] = useState('');
    const [slideOpen, setSlideOpen] = useState(false);
    const [editing, setEditing] = useState<Paciente | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // ── Filtered list ──────────────────────────────────
    const filtered = useMemo(() => {
        if (!search.trim()) return pacientes;
        const q = search.toLowerCase();
        return pacientes.filter(
            p =>
                p.nombre.toLowerCase().includes(q) ||
                p.apellidos.toLowerCase().includes(q),
        );
    }, [pacientes, search]);

    // ── Handlers ───────────────────────────────────────
    const openNew = () => {
        setEditing(null);
        setForm(emptyForm);
        setSlideOpen(true);
    };

    const openEdit = (p: Paciente) => {
        setEditing(p);
        setForm({
            nombre: p.nombre,
            apellidos: p.apellidos,
            fecha_nacimiento: p.fecha_nacimiento,
            historial: p.historial,
        });
        setSlideOpen(true);
    };

    const handleSave = async () => {
        if (!form.nombre.trim()) return;
        if (editing?.id) {
            await db.pacientes.update(editing.id, {
                nombre: form.nombre.trim(),
                apellidos: form.apellidos.trim(),
                fecha_nacimiento: form.fecha_nacimiento,
                historial: form.historial.trim(),
            });
        } else {
            await db.pacientes.add({
                nombre: form.nombre.trim(),
                apellidos: form.apellidos.trim(),
                fecha_nacimiento: form.fecha_nacimiento,
                historial: form.historial.trim(),
                grupos_ids: [],
            });
        }
        setSlideOpen(false);
    };

    const handleDeleteClick = (e: React.MouseEvent, id?: number) => {
        e.preventDefault();
        if (id) setDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;

        // Cascade delete: remove all sessions associated with this patient
        const patientSessions = await db.sesiones.where('paciente_id').equals(deleteId).toArray();
        const sessionIds = patientSessions.map(s => s.id!);
        if (sessionIds.length > 0) {
            await db.sesiones.bulkDelete(sessionIds);
        }

        // Remove patient from any groups
        const patient = await db.pacientes.get(deleteId);
        if (patient && patient.grupos_ids.length > 0) {
            for (const gid of patient.grupos_ids) {
                const group = await db.grupos.get(gid);
                if (group) {
                    await db.grupos.update(gid, {
                        pacientes_ids: group.pacientes_ids.filter(pid => pid !== deleteId)
                    });
                }
            }
        }

        // Delete the patient
        await db.pacientes.delete(deleteId);
        setDeleteId(null);
    };

    const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

    // ── Render ─────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Pacientes</h2>
                    <p className="text-gray-500 mt-1">
                        {pacientes.length} paciente{pacientes.length !== 1 ? 's' : ''} registrado{pacientes.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <button onClick={openNew} className="btn-primary">
                    <UserPlus className="w-4 h-4" />
                    Nuevo Paciente
                </button>
            </div>

            {/* Search */}
            {pacientes.length > 0 && (
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o apellidos…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="input pl-10"
                    />
                </div>
            )}

            {/* List */}
            {filtered.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map(p => (
                        <div
                            key={p.id}
                            className="card group hover:border-sanitary-200 cursor-default"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-sanitary-100 text-sanitary-600 font-bold text-sm shrink-0">
                                        {p.nombre[0]}{p.apellidos?.[0] ?? ''}
                                    </div>
                                    <div>
                                        <Link to={`/pacientes/${p.id}`} className="font-semibold text-gray-800 leading-tight hover:text-sanitary-600 transition-colors">
                                            {p.nombre} {p.apellidos}
                                        </Link>
                                        {p.fecha_nacimiento && (
                                            <span className="inline-flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                                                <Calendar className="w-3 h-3" />
                                                {p.fecha_nacimiento}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Link
                                        to={`/pacientes/${p.id}`}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-sanitary-600 hover:bg-sanitary-50 transition-colors"
                                        title="Ver evolución"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </Link>
                                    <button
                                        onClick={() => navigate('/sesiones', { state: { newSessionForPaciente: p.id } })}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-sanitary-600 hover:bg-sanitary-50 transition-colors"
                                        title="Iniciar Sesión Directa"
                                    >
                                        <PlayCircle className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => openEdit(p)}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-sanitary-600 hover:bg-sanitary-50 transition-colors"
                                        title="Editar"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteClick(e, p.id)}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {p.historial && (
                                <div className="mt-3 flex items-start gap-2 text-sm text-gray-500">
                                    <FileText className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" />
                                    <p className="line-clamp-2">{p.historial}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : pacientes.length > 0 ? (
                /* No search results */
                <div className="card flex flex-col items-center justify-center py-12 text-center">
                    <Search className="w-8 h-8 text-gray-300 mb-3" />
                    <h3 className="text-lg font-semibold text-gray-600">Sin resultados</h3>
                    <p className="text-sm text-gray-400 mt-1">No se encontraron pacientes para "{search}"</p>
                </div>
            ) : (
                /* Empty state */
                <div className="card flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-sanitary-100 mb-4">
                        <Users className="w-8 h-8 text-sanitary-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700">Sin pacientes aún</h3>
                    <p className="text-sm text-gray-400 mt-1 max-w-sm">
                        Añade tu primer paciente para empezar a gestionar historiales y asignar sesiones.
                    </p>
                </div>
            )}

            {/* ── SlideOver Form ─────────────────────────── */}
            <SlideOver
                open={slideOpen}
                onClose={() => setSlideOpen(false)}
                title={editing ? 'Editar Paciente' : 'Nuevo Paciente'}
            >
                <div className="space-y-5">
                    <div>
                        <label className="label">Nombre *</label>
                        <input
                            className="input"
                            placeholder="Nombre del paciente"
                            value={form.nombre}
                            onChange={e => set('nombre', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label">Apellidos</label>
                        <input
                            className="input"
                            placeholder="Apellidos"
                            value={form.apellidos}
                            onChange={e => set('apellidos', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label">Fecha de Nacimiento</label>
                        <input
                            type="date"
                            className="input"
                            value={form.fecha_nacimiento}
                            onChange={e => set('fecha_nacimiento', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label">Notas / Historial</label>
                        <textarea
                            className="input min-h-[100px] resize-y"
                            placeholder="Notas iniciales, historial previo…"
                            value={form.historial}
                            onChange={e => set('historial', e.target.value)}
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button onClick={handleSave} className="btn-primary flex-1 justify-center">
                            {editing ? 'Guardar Cambios' : 'Crear Paciente'}
                        </button>
                        <button onClick={() => setSlideOpen(false)} className="btn-secondary flex-1 justify-center">
                            Cancelar
                        </button>
                    </div>
                </div>
            </SlideOver>

            {/* Confirm Delete Modal */}
            <ConfirmModal
                isOpen={deleteId !== null}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                title="Eliminar Paciente"
                message="¿Seguro que quieres eliminar este paciente? Esto borrará también su historial de sesiones y evoluciones."
            />
        </div>
    );
}
