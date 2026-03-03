
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

interface Option {
    value: string;
    label: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    className?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = "Selecione...",
    label,
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Fecha o dropdown ao clicar fora
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Foca no input ao abrir
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Limpa a busca ao fechar
    useEffect(() => {
        if (!isOpen) {
            setSearchTerm('');
        }
    }, [isOpen]);

    const filteredOptions = options.filter(option =>
        (option.label || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* Botão Principal */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`
          flex items-center justify-between w-full px-3 py-2 bg-white 
          border rounded-lg cursor-pointer transition-colors
          ${isOpen ? 'border-primary-500 ring-2 ring-primary-100' : 'border-slate-300 hover:border-slate-400'}
        `}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <span className={`block truncate ${!selectedOption ? 'text-slate-500' : 'text-slate-700'}`}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </div>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg animate-fadeIn">
                    {/* Campo de Busca */}
                    <div className="p-2 border-b border-slate-100">
                        <div className="relative">
                            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full pl-8 pr-2 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-primary-400 placeholder-slate-400"
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    {/* Lista de Opções */}
                    <div className="max-h-60 overflow-y-auto overflow-x-hidden p-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <div
                                    key={option.value}
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={`
                    flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-pointer transition-colors
                    ${option.value === value ? 'bg-primary-50 text-primary-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}
                  `}
                                >
                                    <span className="truncate pr-2">{option.label}</span>
                                    {option.value === value && <Check size={14} className="text-primary-600 flex-shrink-0" />}
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-4 text-center text-sm text-slate-500">
                                Nenhuma opção encontrada
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;
