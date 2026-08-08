import { Search, RotateCcw, HelpCircle } from 'lucide-react';
import type { SearchFilters, SearchPrecision } from '@/lib/types';
import type { SearchSectionConfig } from '@/lib/libraryConfig';
import { legislationTypeOptions } from '@/lib/libraryConfig';

interface SearchFormProps {
  config: SearchSectionConfig;
  filters: SearchFilters;
  onFilterChange: (key: string, value: string | string[]) => void;
  onSearch: () => void;
  onReset: () => void;
}

export default function SearchForm({
  config,
  filters,
  onFilterChange,
  onSearch,
  onReset,
}: SearchFormProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 lg:p-8">
      {/* Section title */}
      <div className="mb-6 pb-4 border-b border-gray-100">
        <h2 className="font-heading font-bold text-midnight text-lg mb-1">
          {config.title}
        </h2>
        <p className="font-body text-xs text-ink/50">{config.subtitle}</p>
      </div>

      {/* Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {config.fields.map((field) => {
          if (field.type === 'select') {
            return (
              <div key={field.key} className={field.full ? 'md:col-span-2 lg:col-span-4' : ''}>
                <label className="block font-body text-xs text-ink/60 mb-2">
                  {field.label}
                </label>
                <select
                  value={(filters as unknown as Record<string, unknown>)[field.key] as string}
                  onChange={(e) => onFilterChange(field.key, e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-body text-ink focus:border-gold focus:outline-none transition-colors"
                >
                  <option value="">— اختر —</option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            );
          }
          return (
            <div key={field.key} className={field.full ? 'md:col-span-2 lg:col-span-4' : ''}>
              <label className="block font-body text-xs text-ink/60 mb-2">
                {field.label}
              </label>
              <input
                type={field.type === 'date' ? 'date' : 'text'}
                value={(filters as unknown as Record<string, unknown>)[field.key] as string}
                onChange={(e) => onFilterChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-body text-ink focus:border-gold focus:outline-none transition-colors placeholder:text-ink/30"
              />
            </div>
          );
        })}
      </div>

      {/* Precision options */}
      {config.showPrecision && (
        <div className="flex flex-wrap items-center gap-6 mb-6">
          <span className="font-body text-xs text-ink/60">خيارات الدقة:</span>
          {([
            { value: 'all', label: 'كل الكلمات' },
            { value: 'phrase', label: 'مطابقة الجملة' },
            { value: 'any', label: 'أي كلمة' },
          ] as { value: SearchPrecision; label: string }[]).map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="precision"
                value={opt.value}
                checked={filters.precision === opt.value}
                onChange={() => onFilterChange('precision', opt.value)}
                className="accent-gold"
              />
              <span className="font-body text-xs text-ink/70">{opt.label}</span>
            </label>
          ))}
        </div>
      )}

      {/* Scope toggle */}
      {config.showScopeToggle && (
        <div className="flex flex-wrap items-center gap-6 mb-6">
          <span className="font-body text-xs text-ink/60">النطاق:</span>
          {[
            { value: 'current', label: 'القانون الحالي' },
            { value: 'all', label: 'كل القوانين' },
          ].map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="scopeToggle"
                value={opt.value}
                checked={filters.scope === opt.value}
                onChange={() => onFilterChange('scope', opt.value)}
                className="accent-gold"
              />
              <span className="font-body text-xs text-ink/70">{opt.label}</span>
            </label>
          ))}
        </div>
      )}

      {/* Legislation type checkboxes (only for search-legislation) */}
      {config.fields.some((f) => f.key === 'query') && config.dataSource === 'legislation' && config.title.includes('تشريع') && (
        <div className="mb-6">
          <span className="block font-body text-xs text-ink/60 mb-3">نوع التشريع:</span>
          <div className="flex flex-wrap gap-4">
            {legislationTypeOptions.map((opt) => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.legislationTypes.includes(opt)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...filters.legislationTypes, opt]
                      : filters.legislationTypes.filter((t) => t !== opt);
                    onFilterChange('legislationTypes', next);
                  }}
                  className="accent-gold"
                />
                <span className="font-body text-xs text-ink/70">{opt}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onSearch}
          className="flex items-center gap-2 px-6 py-2.5 bg-midnight text-cream rounded-lg font-body text-sm hover:bg-midnight-light transition-colors duration-300"
        >
          <Search size={16} />
          بحث
        </button>
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-ink/70 rounded-lg font-body text-sm hover:bg-gray-200 transition-colors duration-300"
        >
          <RotateCcw size={16} />
          إفراغ المعايير
        </button>
        <button
          className="flex items-center gap-2 px-6 py-2.5 text-ink/50 rounded-lg font-body text-sm hover:text-gold transition-colors duration-300"
        >
          <HelpCircle size={16} />
          إرشادات البحث
        </button>
      </div>
    </div>
  );
}
