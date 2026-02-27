import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { type Paciente } from '../db';

export default function PatientAutocomplete({
    pacientes,
    selectedId,
    onSelect,
    placeholder = 'Buscar paciente por nombre o apellido...',
}: {
    pacientes: Paciente[];
    selectedId: number | '';
    onSelect: (id: number | '') => void;
    placeholder?: string;
}) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // If an external ID is selected, reflect the name in the input if query is empty
    const selectedPaciente = useMemo(() => {
        return pacientes.find(p => p.id === selectedId);
    }, [pacientes, selectedId]);

    // Keep input in sync with external selection changes
    useEffect(() => {
        if (selectedPaciente) {
            setQuery(`${selectedPaciente.nombre} ${selectedPaciente.apellidos}`.trim());
        } else {
            setQuery('');
        }
    }, [selectedPaciente]);

    const results = useMemo(() => {
        if (!query.trim()) return pacientes.slice(0, 10); // Show some defaults if empty
        const q = query.toLowerCase();
        return pacientes
            .filter(p =>
                p.nombre.toLowerCase().includes(q) ||
                (p.apellidos && p.apellidos.toLowerCase().includes(q))
            )
            .slice(0, 10);
    }, [query, pacientes]);

    useEffect(() => {
        const handler = (ev: MouseEvent) => {
            if (ref.current && !ref.current.contains(ev.target as Node)) {
                setOpen(false);
                // On blur, if no strict match to selection, revert to selected text
                if (selectedPaciente) {
                    setQuery(`${selectedPaciente.nombre} ${selectedPaciente.apellidos}`.trim());
                } else {
                    setQuery('');
                }
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [selectedPaciente]);

    const handleClear = () => {
        setQuery('');
        onSelect('');
        setOpen(true);
    };

    return (
        <div ref={ref} className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
                className="input pl-10 pr-10"
                placeholder={placeholder}
                value={query}
                onChange={e => {
                    setQuery(e.target.value);
                    setOpen(true);
                    if (selectedId) onSelect(''); // Reset actual selection if typing
                }}
                onFocus={() => setOpen(true)}
            />
            {query && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            )}

            {open && results.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                    {results.map(p => (
                        <button
                            key={p.id}
                            type="button"
                            className="w-full text-left px-4 py-2.5 hover:bg-sanitary-50 transition-colors flex items-center justify-between gap-2"
                            onClick={() => {
                                onSelect(p.id!);
                                setOpen(false);
                            }}
                        >
                            <span className="text-sm font-medium text-gray-800">
                                {p.nombre} {p.apellidos}
                            </span>
                        </button>
                    ))}
                </div>
            )}
            {open && results.length === 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg p-4 text-center">
                    <p className="text-sm text-gray-500">No se encontraron pacientes</p>
                </div>
            )}
        </div>
    );
}
