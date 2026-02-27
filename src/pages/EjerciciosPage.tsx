import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
    Dumbbell,
    Plus,
    Search,
    Pencil,
    Trash2,
    Tag as TagIcon,
    ExternalLink,
    Settings2,
    X,
} from 'lucide-react';
import { db, type Ejercicio, type Tag } from '../db';
import SlideOver from '../components/SlideOver';
import ConfirmModal from '../components/ConfirmModal';

const emptyForm = { nombre: '', descripcion: '', media_url: '', etiquetas: [] as string[] };

const COLOR_OPTIONS = [
    'bg-sky-100 text-sky-700',
    'bg-blue-100 text-blue-700',
    'bg-indigo-100 text-indigo-700',
    'bg-violet-100 text-violet-700',
    'bg-fuchsia-100 text-fuchsia-700',
    'bg-pink-100 text-pink-700',
    'bg-rose-100 text-rose-700',
    'bg-red-100 text-red-700',
    'bg-orange-100 text-orange-700',
    'bg-amber-100 text-amber-700',
    'bg-yellow-100 text-yellow-700',
    'bg-lime-100 text-lime-700',
    'bg-emerald-100 text-emerald-700',
    'bg-teal-100 text-teal-700',
    'bg-cyan-100 text-cyan-700',
    'bg-slate-100 text-slate-700',
];

export default function EjerciciosPage() {
    const ejercicios = useLiveQuery(() => db.ejercicios.toArray()) ?? [];
    const tags = useLiveQuery(() => db.tags.toArray()) ?? [];

    const [search, setSearch] = useState('');
    const [activeTags, setActiveTags] = useState<string[]>([]);

    // Exercise Form State
    const [slideOpen, setSlideOpen] = useState(false);
    const [editing, setEditing] = useState<Ejercicio | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Tag Manager State
    const [tagSlideOpen, setTagSlideOpen] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState(COLOR_OPTIONS[0]);

    // ── Filtered list ──────────────────────────────────
    const filtered = useMemo(() => {
        let list = ejercicios;
        if (activeTags.length > 0) {
            list = list.filter(e => activeTags.every(tag => e.etiquetas.includes(tag)));
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(e => e.nombre.toLowerCase().includes(q));
        }
        return list;
    }, [ejercicios, search, activeTags]);

    // ── Unique tags in use ─────────────────────────────
    const usedTags = useMemo(() => {
        const set = new Set<string>();
        ejercicios.forEach(e => e.etiquetas.forEach(t => set.add(t)));
        return Array.from(set).sort();
    }, [ejercicios]);

    // Merge DB tags + used (so custom/stray tags also appear in filters)
    const allVisibleTags = useMemo(() => {
        const dbTagNames = tags.map(t => t.nombre);
        const merged = new Set([...dbTagNames, ...usedTags]);
        return Array.from(merged).sort();
    }, [tags, usedTags]);

    const getTagColor = (tagName: string) => {
        const tag = tags.find(t => t.nombre === tagName);
        return tag ? tag.color : 'bg-gray-100 text-gray-600';
    };

    // ── Handlers (Exercises) ───────────────────────────
    const openNew = () => {
        setEditing(null);
        setForm({ ...emptyForm, etiquetas: [] });
        setSlideOpen(true);
    };

    const openEdit = (e: Ejercicio) => {
        setEditing(e);
        setForm({
            nombre: e.nombre,
            descripcion: e.descripcion,
            media_url: e.media_url,
            etiquetas: [...e.etiquetas],
        });
        setSlideOpen(true);
    };

    const handleSave = async () => {
        if (!form.nombre.trim()) return;
        const data = {
            nombre: form.nombre.trim(),
            descripcion: form.descripcion.trim(),
            media_url: form.media_url.trim(),
            etiquetas: form.etiquetas,
        };
        if (editing?.id) {
            await db.ejercicios.update(editing.id, data);
        } else {
            await db.ejercicios.add(data);
        }
        setSlideOpen(false);
    };

    const handleDeleteClick = (e: React.MouseEvent, id?: number) => {
        e.preventDefault();
        if (id) setDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        await db.ejercicios.delete(deleteId);
        setDeleteId(null);
    };

    const toggleFormTag = (tagName: string) => {
        setForm(prev => ({
            ...prev,
            etiquetas: prev.etiquetas.includes(tagName)
                ? prev.etiquetas.filter(t => t !== tagName)
                : [...prev.etiquetas, tagName],
        }));
    };

    const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

    // ── Handlers (Tags) ────────────────────────────────
    const handleAddTag = async () => {
        const name = newTagName.trim();
        if (!name) return;

        // Prevent duplicates
        if (tags.some(t => t.nombre.toLowerCase() === name.toLowerCase())) {
            alert('Ya existe una etiqueta con este nombre.');
            return;
        }

        await db.tags.add({ nombre: name, color: newTagColor });
        setNewTagName('');
        setNewTagColor(COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)]);
    };

    const handleDeleteTag = async (tag: Tag) => {
        if (!confirm(`¿Eliminar la etiqueta "${tag.nombre}"? Se quitará de todos los ejercicios que la tengan.`)) return;

        // Cascade delete: remove from all exercises
        const exercisesWithTag = ejercicios.filter(e => e.etiquetas.includes(tag.nombre));
        for (const e of exercisesWithTag) {
            await db.ejercicios.update(e.id!, {
                etiquetas: e.etiquetas.filter(t => t !== tag.nombre)
            });
        }

        await db.tags.delete(tag.id!);
        setActiveTags(prev => prev.filter(tagName => tagName !== tag.nombre));
    };

    // ── Render ─────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Ejercicios</h2>
                    <p className="text-gray-500 mt-1">
                        {ejercicios.length} ejercicio{ejercicios.length !== 1 ? 's' : ''} en la biblioteca
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setTagSlideOpen(true)} className="btn-secondary">
                        <Settings2 className="w-4 h-4" />
                        Etiquetas
                    </button>
                    <button onClick={openNew} className="btn-primary">
                        <Plus className="w-4 h-4" />
                        Nuevo Ejercicio
                    </button>
                </div>
            </div>

            {/* Search + Tag Filter */}
            {ejercicios.length > 0 && (
                <div className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar ejercicio por nombre…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="input pl-10 pr-10"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Tag chips */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setActiveTags([])}
                            className={`badge ${activeTags.length === 0 ? 'badge-active' : 'badge-default'}`}
                        >
                            Todos
                        </button>
                        {allVisibleTags.map(tagName => (
                            <button
                                key={tagName}
                                onClick={() => {
                                    setActiveTags(prev =>
                                        prev.includes(tagName)
                                            ? prev.filter(t => t !== tagName)
                                            : [...prev, tagName]
                                    );
                                }}
                                className={`badge ${activeTags.includes(tagName) ? 'badge-active' : 'badge-default'}`}
                            >
                                {tagName}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* List */}
            {filtered.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(e => (
                        <div
                            key={e.id}
                            className="card group hover:border-emerald-200 flex flex-col"
                        >
                            {/* Media thumbnail */}
                            {e.media_url && (
                                <div className="relative -mx-6 -mt-6 mb-4 rounded-t-2xl overflow-hidden bg-gray-100 h-36">
                                    <img
                                        src={e.media_url}
                                        alt={e.nombre}
                                        className="w-full h-full object-cover"
                                        onError={(ev) => { (ev.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                    <a
                                        href={e.media_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/80 hover:bg-white text-gray-600 transition-colors"
                                        title="Abrir enlace"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                            )}

                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    {!e.media_url && (
                                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 shrink-0">
                                            <Dumbbell className="w-5 h-5" />
                                        </div>
                                    )}
                                    <h4 className="font-semibold text-gray-800 leading-tight">{e.nombre}</h4>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <button
                                        onClick={() => openEdit(e)}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                        title="Editar"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(ev) => handleDeleteClick(ev, e.id)}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {e.descripcion && (
                                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{e.descripcion}</p>
                            )}

                            {/* Tags */}
                            {e.etiquetas.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-50">
                                    {e.etiquetas.map(tagName => (
                                        <span
                                            key={tagName}
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getTagColor(tagName)}`}
                                        >
                                            <TagIcon className="w-2.5 h-2.5" />
                                            {tagName}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : ejercicios.length > 0 ? (
                <div className="card flex flex-col items-center justify-center py-12 text-center">
                    <Search className="w-8 h-8 text-gray-300 mb-3" />
                    <h3 className="text-lg font-semibold text-gray-600">Sin resultados</h3>
                    <p className="text-sm text-gray-400 mt-1">
                        No se encontraron ejercicios
                        {activeTags.length > 0 ? ` con etiquetas: ${activeTags.join(', ')}` : ''}
                        {search ? ` para "${search}"` : ''}
                    </p>
                </div>
            ) : (
                <div className="card flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 mb-4">
                        <Dumbbell className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700">Sin ejercicios aún</h3>
                    <p className="text-sm text-gray-400 mt-1 max-w-sm">
                        Crea ejercicios con descripciones, etiquetas y multimedia para asignarlos a tus pacientes.
                    </p>
                </div>
            )}

            {/* ── SlideOver Form (Exercises) ──────────────── */}
            <SlideOver
                open={slideOpen}
                onClose={() => setSlideOpen(false)}
                title={editing ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}
            >
                <div className="space-y-5">
                    <div>
                        <label className="label">Título *</label>
                        <input
                            className="input"
                            placeholder="Nombre del ejercicio"
                            value={form.nombre}
                            onChange={e => set('nombre', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label">Descripción</label>
                        <textarea
                            className="input min-h-[100px] resize-y"
                            placeholder="Instrucciones, notas técnicas…"
                            value={form.descripcion}
                            onChange={e => set('descripcion', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label">URL Imagen / Video (opcional)</label>
                        <input
                            className="input"
                            placeholder="https://…"
                            value={form.media_url}
                            onChange={e => set('media_url', e.target.value)}
                        />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="label mb-0">Etiquetas</label>
                            <button
                                type="button"
                                onClick={() => { setSlideOpen(false); setTagSlideOpen(true); }}
                                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                            >
                                Administrar
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {tags.map(tag => (
                                <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => toggleFormTag(tag.nombre)}
                                    className={`badge ${form.etiquetas.includes(tag.nombre)
                                        ? tag.color
                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                >
                                    {tag.nombre}
                                </button>
                            ))}
                            {tags.length === 0 && (
                                <p className="text-sm text-gray-400 italic">No hay etiquetas creadas.</p>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button onClick={handleSave} className="btn-primary flex-1 justify-center">
                            {editing ? 'Guardar Cambios' : 'Crear Ejercicio'}
                        </button>
                        <button onClick={() => setSlideOpen(false)} className="btn-secondary flex-1 justify-center">
                            Cancelar
                        </button>
                    </div>
                </div>
            </SlideOver>

            {/* ── SlideOver Tag Manager ───────────────────── */}
            <SlideOver
                open={tagSlideOpen}
                onClose={() => setTagSlideOpen(false)}
                title="Administrar Etiquetas"
            >
                <div className="space-y-6 flex flex-col h-full">

                    {/* List of current tags */}
                    <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
                        {tags.length > 0 ? (
                            <div className="space-y-2">
                                {tags.map(tag => (
                                    <div key={tag.id} className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 bg-gray-50/50">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-4 h-4 rounded-full ${tag.color.split(' ')[0]}`} />
                                            <span className="font-medium text-gray-700 text-sm">{tag.nombre}</span>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteTag(tag)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            title="Eliminar etiqueta"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <TagIcon className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                                <p className="text-sm font-medium text-gray-500">No hay etiquetas</p>
                            </div>
                        )}
                    </div>

                    {/* Add new tag */}
                    <div className="pt-4 border-t border-gray-100 shrink-0">
                        <label className="label">Nueva Etiqueta</label>
                        <div className="flex gap-2 mb-3">
                            <input
                                className="input flex-1"
                                placeholder="Ej: Rehabilitación"
                                value={newTagName}
                                onChange={e => setNewTagName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddTag();
                                    }
                                }}
                            />
                            <button onClick={handleAddTag} className="btn-primary" disabled={!newTagName.trim()}>
                                Añadir
                            </button>
                        </div>

                        <label className="text-xs font-medium text-gray-500 mb-2 block">Color</label>
                        <div className="flex flex-wrap gap-1.5">
                            {COLOR_OPTIONS.map((colorClass, i) => {
                                const bgClass = colorClass.split(' ')[0];
                                const isSelected = newTagColor === colorClass;
                                return (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setNewTagColor(colorClass)}
                                        className={`w-6 h-6 rounded-full transition-transform ${bgClass} ${isSelected ? 'ring-2 ring-offset-2 ring-emerald-500 scale-110' : 'hover:scale-110'}`}
                                        title="Seleccionar color"
                                    />
                                );
                            })}
                        </div>
                    </div>

                </div>
            </SlideOver>

            {/* Confirm Delete Modal */}
            <ConfirmModal
                isOpen={deleteId !== null}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                title="Eliminar Ejercicio"
                message="¿Seguro que quieres eliminar este ejercicio? Esto puede crear incongruencias en las sesiones que ya lo tienen asignado."
            />
        </div>
    );
}
