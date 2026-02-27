import { useEffect } from 'react';
import { X } from 'lucide-react';

interface SlideOverProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    leftPanel?: React.ReactNode;
    panelClassName?: string;
}

export default function SlideOver({ open, onClose, title, children, leftPanel, panelClassName }: SlideOverProps) {
    // Lock body scroll when open
    useEffect(() => {
        if (open) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {leftPanel && (
                <div className="relative z-10 hidden lg:flex w-96 bg-white border-l border-gray-100 shadow-2xl animate-slide-in-right flex-col">
                    {leftPanel}
                </div>
            )}

            {/* Panel */}
            <div className={`relative w-full ${panelClassName ?? 'max-w-md'} bg-white shadow-2xl animate-slide-in-right flex flex-col`}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {children}
                </div>
            </div>
        </div>
    );
}
