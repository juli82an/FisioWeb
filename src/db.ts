import Dexie, { type Table } from 'dexie';

// ─── Interfaces ───────────────────────────────────────────────
export interface Paciente {
    id?: number;
    nombre: string;
    apellidos: string;
    fecha_nacimiento: string;
    historial: string;
    grupos_ids: number[];
}

export interface Ejercicio {
    id?: number;
    nombre: string;
    descripcion: string;
    etiquetas: string[];
    media_url: string;
}

export interface Tag {
    id?: number;
    nombre: string;
    color: string;
}

export interface EjercicioAsignado {
    ejercicio_id: number;
    lugar: 'clinica' | 'casa';
    completado?: boolean;
    progresion_desde_ejercicio_id?: number;
}

export interface Sesion {
    id?: number;
    paciente_id: number;
    grupo_id?: number;
    fecha: string;
    notas: string;
    ejercicios_asignados: EjercicioAsignado[];
}

export interface Grupo {
    id?: number;
    nombre: string;
    pacientes_ids: number[];
}

// ─── Database ─────────────────────────────────────────────────
class FisioDB extends Dexie {
    pacientes!: Table<Paciente, number>;
    ejercicios!: Table<Ejercicio, number>;
    sesiones!: Table<Sesion, number>;
    grupos!: Table<Grupo, number>;
    tags!: Table<Tag, number>;

    constructor() {
        super('FisioDB');

        this.version(1).stores({
            pacientes: '++id, nombre',
            ejercicios: '++id, nombre',
            sesiones: '++id, paciente_id, fecha',
            grupos: '++id, nombre',
        });

        this.version(2).stores({
            pacientes: '++id, nombre, apellidos',
            ejercicios: '++id, nombre',
            sesiones: '++id, paciente_id, fecha',
            grupos: '++id, nombre',
        }).upgrade(tx => {
            return tx.table('pacientes').toCollection().modify(p => {
                if (!p.apellidos) p.apellidos = '';
                if (!p.fecha_nacimiento) p.fecha_nacimiento = '';
            });
        });

        this.version(3).stores({
            pacientes: '++id, nombre, apellidos',
            ejercicios: '++id, nombre',
            sesiones: '++id, paciente_id, fecha, grupo_id',
            grupos: '++id, nombre',
        }).upgrade(tx => {
            return tx.table('sesiones').toCollection().modify(s => {
                if (s.ejercicios_asignados_ids && !s.ejercicios_asignados) {
                    s.ejercicios_asignados = s.ejercicios_asignados_ids.map((id: number) => ({ ejercicio_id: id, lugar: 'clinica' as const }));
                    delete s.ejercicios_asignados_ids;
                }
                if (!s.ejercicios_asignados) s.ejercicios_asignados = [];
            });
        });

        this.version(4).stores({
            pacientes: '++id, nombre, apellidos',
            ejercicios: '++id, nombre',
            sesiones: '++id, paciente_id, fecha, grupo_id',
            grupos: '++id, nombre',
            tags: '++id, nombre',
        }).upgrade(async tx => {
            const tagsCount = await tx.table('tags').count();
            if (tagsCount === 0) {
                const initialTags = [
                    { nombre: 'Movilidad', color: 'bg-sky-100 text-sky-700' },
                    { nombre: 'Fuerza', color: 'bg-red-100 text-red-700' },
                    { nombre: 'Tren Superior', color: 'bg-violet-100 text-violet-700' },
                    { nombre: 'Tren Inferior', color: 'bg-indigo-100 text-indigo-700' },
                    { nombre: 'Equilibrio', color: 'bg-amber-100 text-amber-700' },
                    { nombre: 'Flexibilidad', color: 'bg-emerald-100 text-emerald-700' },
                    { nombre: 'Respiratorio', color: 'bg-teal-100 text-teal-700' },
                    { nombre: 'Core', color: 'bg-orange-100 text-orange-700' },
                    { nombre: 'Propiocepción', color: 'bg-pink-100 text-pink-700' },
                ];
                await tx.table('tags').bulkAdd(initialTags);
            }
        });

        this.version(5).stores({
            pacientes: '++id, nombre, apellidos',
            ejercicios: '++id, nombre',
            sesiones: '++id, paciente_id, fecha, grupo_id',
            grupos: '++id, nombre',
            tags: '++id, nombre',
        }).upgrade(tx => {
            return tx.table('sesiones').toCollection().modify(s => {
                if (s.ejercicios_asignados) {
                    s.ejercicios_asignados.forEach((a: EjercicioAsignado) => {
                        if (a.completado === undefined) a.completado = false;
                    });
                }
            });
        });

        this.version(6).stores({
            pacientes: '++id, nombre, apellidos',
            ejercicios: '++id, nombre',
            sesiones: '++id, [paciente_id+fecha], paciente_id, fecha, grupo_id',
            grupos: '++id, nombre',
            tags: '++id, nombre',
        });
    }
}

export const db = new FisioDB();

// ─── Export / Import helpers ──────────────────────────────────
export async function exportAllData(): Promise<string> {
    const [pacientes, ejercicios, sesiones, grupos, tags] = await Promise.all([
        db.pacientes.toArray(),
        db.ejercicios.toArray(),
        db.sesiones.toArray(),
        db.grupos.toArray(),
        db.tags.toArray(),
    ]);
    return JSON.stringify({ pacientes, ejercicios, sesiones, grupos, tags }, null, 2);
}

export async function importAllData(json: string): Promise<void> {
    const data = JSON.parse(json);

    // Validate valid JSON format and expected arrays
    if (!data || typeof data !== 'object') throw new Error('Formato inválido.');
    if (data.pacientes && !Array.isArray(data.pacientes)) throw new Error('Formato de pacientes inválido.');
    if (data.ejercicios && !Array.isArray(data.ejercicios)) throw new Error('Formato de ejercicios inválido.');
    if (data.sesiones && !Array.isArray(data.sesiones)) throw new Error('Formato de sesiones inválido.');
    if (data.grupos && !Array.isArray(data.grupos)) throw new Error('Formato de grupos inválido.');
    if (data.tags && !Array.isArray(data.tags)) throw new Error('Formato de tags inválido.');

    await db.transaction('rw', [db.pacientes, db.ejercicios, db.sesiones, db.grupos, db.tags], async () => {
        if (data.pacientes?.length > 0) await db.pacientes.bulkPut(data.pacientes);
        if (data.ejercicios?.length > 0) await db.ejercicios.bulkPut(data.ejercicios);
        if (data.sesiones?.length > 0) await db.sesiones.bulkPut(data.sesiones);
        if (data.grupos?.length > 0) await db.grupos.bulkPut(data.grupos);
        if (data.tags?.length > 0) await db.tags.bulkPut(data.tags);
    });
}
