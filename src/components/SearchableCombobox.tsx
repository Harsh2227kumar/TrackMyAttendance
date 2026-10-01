import React, { useState, useRef, useEffect } from 'react';
import { Subject, Faculty } from '../types/index.ts';
import { Search, BookOpen, Check, X, ChevronDown, GraduationCap, Building2 } from 'lucide-react';

// ============================================================================
// SEARCHABLE SUBJECT COMBOBOX
// ============================================================================
interface SearchableSubjectComboboxProps {
  subjects: Subject[];
  selectedSubjectId: string;
  onSelect: (subject: Subject | null) => void;
  required?: boolean;
  placeholder?: string;
  label?: string;
  id?: string;
}

export const SearchableSubjectCombobox: React.FC<SearchableSubjectComboboxProps> = ({
  subjects,
  selectedSubjectId,
  onSelect,
  required = false,
  placeholder = 'Search by Subject Code or Name...',
  label,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  const filteredSubjects = subjects.filter((sub) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      (sub.code || '').toLowerCase().includes(q) ||
      (sub.name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Hidden input for form validation compatibility */}
      <input
        type="text"
        id={id}
        required={required}
        value={selectedSubjectId || ''}
        onChange={() => {}}
        className="sr-only"
        tabIndex={-1}
      />

      {/* Main Trigger Pill / Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full min-h-[38px] px-3 py-1.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition select-none bg-white ${
          isOpen
            ? 'border-blue-600 ring-2 ring-blue-500/20'
            : selectedSubject
            ? 'border-slate-300 hover:border-slate-400'
            : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <div className="flex items-center space-x-2 truncate mr-1">
          <BookOpen className="w-3.5 h-3.5 text-blue-800 shrink-0" />
          {selectedSubject ? (
            <div className="flex items-center space-x-1.5 truncate">
              <span className="font-mono font-bold text-blue-900 bg-blue-100 px-1.5 py-0.5 rounded text-[11px] shrink-0">
                {selectedSubject.code}
              </span>
              <span className="font-medium text-slate-900 truncate" title={selectedSubject.name}>
                {selectedSubject.name}
              </span>
            </div>
          ) : (
            <span className="text-slate-400 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center space-x-1 shrink-0 ml-1">
          {selectedSubject && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(null);
              }}
              className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded cursor-pointer"
              title="Clear selection"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown Floating Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden text-xs">
          {/* Search Header */}
          <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type code (e.g. CS501) or title..."
                className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-300 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-slate-400 hover:text-slate-600 absolute right-2 top-2 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
            <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
              {filteredSubjects.length} of {subjects.length}
            </span>
          </div>

          {/* List of Subjects */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
            {filteredSubjects.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                {subjects.length === 0 ? (
                  <span>No subjects registered in Master List. Please add subjects in Admin Portal.</span>
                ) : (
                  <span>No subjects match "{searchTerm}". Try a different keyword.</span>
                )}
              </div>
            ) : (
              filteredSubjects.map((sub) => {
                const isSelected = sub.id === selectedSubjectId;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      onSelect(sub);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left p-2.5 hover:bg-blue-50/70 transition flex items-center justify-between cursor-pointer ${
                      isSelected ? 'bg-blue-50 font-semibold' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate mr-2">
                      <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200 shrink-0">
                        {sub.code}
                      </span>
                      <span className="text-slate-900 text-xs truncate" title={sub.name}>
                        {sub.name}
                      </span>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-700 shrink-0 ml-1" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SEARCHABLE FACULTY COMBOBOX
// ============================================================================
interface SearchableFacultyComboboxProps {
  facultyList: Faculty[];
  selectedFacultyId: string;
  onSelect: (faculty: Faculty | null) => void;
  required?: boolean;
  placeholder?: string;
  label?: string;
  id?: string;
}

export const SearchableFacultyCombobox: React.FC<SearchableFacultyComboboxProps> = ({
  facultyList,
  selectedFacultyId,
  onSelect,
  required = false,
  placeholder = 'Search by Faculty Name or Department...',
  label,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedFaculty = facultyList.find((f) => f.id === selectedFacultyId);

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  const filteredFaculty = facultyList.filter((fac) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      (fac.name || '').toLowerCase().includes(q) ||
      (fac.department || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Hidden input for form validation compatibility */}
      <input
        type="text"
        id={id}
        required={required}
        value={selectedFacultyId || ''}
        onChange={() => {}}
        className="sr-only"
        tabIndex={-1}
      />

      {/* Main Trigger Pill / Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full min-h-[38px] px-3 py-1.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition select-none bg-white ${
          isOpen
            ? 'border-blue-600 ring-2 ring-blue-500/20'
            : selectedFaculty
            ? 'border-slate-300 hover:border-slate-400'
            : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <div className="flex items-center space-x-2 truncate mr-1">
          <GraduationCap className="w-3.5 h-3.5 text-blue-800 shrink-0" />
          {selectedFaculty ? (
            <div className="flex items-center space-x-1.5 truncate">
              <span className="font-semibold text-slate-900 truncate">
                {selectedFaculty.name}
              </span>
              <span
                className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[140px]"
                title={selectedFaculty.department}
              >
                {selectedFaculty.department}
              </span>
            </div>
          ) : (
            <span className="text-slate-400 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center space-x-1 shrink-0 ml-1">
          {selectedFaculty && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(null);
              }}
              className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded cursor-pointer"
              title="Clear selection"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown Floating Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden text-xs">
          {/* Search Header */}
          <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type faculty name or department..."
                className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-300 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-slate-400 hover:text-slate-600 absolute right-2 top-2 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
            <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
              {filteredFaculty.length} of {facultyList.length}
            </span>
          </div>

          {/* List of Faculty */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
            {filteredFaculty.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                {facultyList.length === 0 ? (
                  <span>No faculty registered in Master List. Please add faculty in Admin Portal.</span>
                ) : (
                  <span>No faculty match "{searchTerm}". Try a different name or department.</span>
                )}
              </div>
            ) : (
              filteredFaculty.map((fac) => {
                const isSelected = fac.id === selectedFacultyId;
                return (
                  <button
                    key={fac.id}
                    type="button"
                    onClick={() => {
                      onSelect(fac);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left p-2.5 hover:bg-blue-50/70 transition flex items-center justify-between cursor-pointer ${
                      isSelected ? 'bg-blue-50 font-semibold' : ''
                    }`}
                  >
                    <div className="truncate mr-2">
                      <div className="font-semibold text-slate-900 text-xs truncate">
                        {fac.name}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center space-x-1 mt-0.5 truncate">
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{fac.department}</span>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-700 shrink-0 ml-1" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
