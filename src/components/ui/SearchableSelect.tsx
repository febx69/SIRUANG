// src/components/ui/SearchableSelect.tsx
// Dropdown pencarian interaktif (Combobox) yang elegan, responsif, dan dapat diketik

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";

export interface SearchableOption {
  value: string;
  label: string;
  code?: string;
  sublabel?: string;
  badge?: string;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
  id?: string;
}

export const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder = "-- Pilih Opsi --",
  searchPlaceholder = "Ketik untuk mencari...",
  disabled = false,
  allowClear = false,
  className = "",
  id,
}: SearchableSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Selected Option
  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value);
  }, [options, value]);

  // Filtered Options
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.code && opt.code.toLowerCase().includes(q)) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q)) ||
        (opt.badge && opt.badge.toLowerCase().includes(q))
    );
  }, [options, searchQuery]);

  // Batasi render DOM maksimal 80 item agar responsif seketika pada dataset besar (1.400+ kategori)
  const displayedOptions = useMemo(() => {
    return filteredOptions.slice(0, 80);
  }, [filteredOptions]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between text-left px-3 py-2 rounded-xl border text-xs transition-all duration-200 outline-none ${
          disabled
            ? "bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed"
            : isOpen
            ? "bg-white border-blue-500 ring-2 ring-blue-500/20 shadow-sm text-slate-900"
            : "bg-white border-slate-200 hover:border-slate-300 text-slate-800 shadow-2xs hover:shadow-xs"
        }`}
        style={{ minHeight: "42px" }}
      >
        <div className="flex-1 truncate pr-2">
          {selectedOption ? (
            <div className="flex items-center gap-2 truncate">
              {selectedOption.code && (
                <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                  {selectedOption.code}
                </span>
              )}
              <span className="font-medium text-slate-800 truncate">
                {selectedOption.label}
              </span>
              {selectedOption.badge && (
                <span className="text-[10px] text-slate-400 shrink-0">
                  ({selectedOption.badge})
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 font-normal">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {allowClear && selectedOption && !disabled && (
            <span
              onClick={handleClear}
              className="p-1 rounded-md hover:bg-slate-100 hover:text-slate-600 transition-colors"
              title="Kosongkan pilihan"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${
              isOpen ? "transform rotate-180 text-blue-600" : ""
            }`}
          />
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-enter-from-bottom"
          style={{ maxHeight: "320px", display: "flex", flexDirection: "column" }}
        >
          {/* Search Box Header */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="overflow-y-auto p-1.5 space-y-0.5 max-h-60 scrollbar-thin">
            {allowClear && (
              <button
                type="button"
                onClick={() => handleSelect("")}
                className={`w-full flex items-center justify-between text-left px-2.5 py-2 rounded-lg text-xs transition-colors ${
                  !value
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <span className="italic text-slate-400">-- Kosongkan (Tanpa Pilihan) --</span>
                {!value && <Check size={14} className="text-blue-600 shrink-0" />}
              </button>
            )}

            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Tidak ada hasil yang cocok dengan &quot;{searchQuery}&quot;
              </div>
            ) : (
              displayedOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full flex items-start justify-between text-left px-2.5 py-2 rounded-lg text-xs transition-colors ${
                      isSelected
                        ? "bg-blue-50 text-blue-900 font-semibold"
                        : "text-slate-700 hover:bg-slate-100/80"
                    }`}
                  >
                    <div className="flex-1 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {opt.code && (
                          <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-100/70 px-1 py-0.5 rounded">
                            {opt.code}
                          </span>
                        )}
                        <span className="font-medium">{opt.label}</span>
                      </div>
                      {opt.sublabel && (
                        <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                          {opt.sublabel}
                        </div>
                      )}
                      {opt.badge && !opt.sublabel && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Kelompok: {opt.badge}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <Check size={14} className="text-blue-600 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer count */}
          <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
            <span>
              {filteredOptions.length > displayedOptions.length
                ? `Menampilkan ${displayedOptions.length} dari ${filteredOptions.length} opsi`
                : `Ditemukan: ${filteredOptions.length} opsi`}
            </span>
            <span>Ketik kata kunci untuk menyaring</span>
          </div>
        </div>
      )}
    </div>
  );
};
