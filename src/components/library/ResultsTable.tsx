import { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  List,
  LayoutGrid,
  ArrowUpDown,
  FileText,
  Eye,
  Loader2,
} from 'lucide-react';
import type { ViewMode, SortOrder } from '@/lib/types';
import type { ResultColumn } from '@/lib/libraryConfig';

export interface ResultRow {
  id: string;
  [key: string]: unknown;
}

interface ResultsTableProps {
  columns: ResultColumn[];
  rows: ResultRow[];
  loading: boolean;
  onRowClick: (row: ResultRow) => void;
  resultCount?: number;
}

const PAGE_SIZE = 10;

export default function ResultsTable({
  columns,
  rows,
  loading,
  onRowClick,
  resultCount,
}: ResultsTableProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [rows.length]);

  const sortedRows = [...rows].sort((a, b) => {
    if (sortOrder === 'newest' || sortOrder === 'oldest') {
      const dateA = (a.created_at as string) || '';
      const dateB = (b.created_at as string) || '';
      return sortOrder === 'newest'
        ? dateB.localeCompare(dateA)
        : dateA.localeCompare(dateB);
    }
    // number sort
    const numA = (a.legislation_number as string) || (a.ruling_number as string) || '';
    const numB = (b.legislation_number as string) || (b.ruling_number as string) || '';
    return numA.localeCompare(numB, undefined, { numeric: true });
  });

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const paginatedRows = sortedRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const renderCell = (row: ResultRow, col: ResultColumn, index: number): string => {
    if (col.key === 'index') {
      return String((currentPage - 1) * PAGE_SIZE + index + 1);
    }
    const val = row[col.key];
    if (val === null || val === undefined) return '—';
    if (col.key === 'publication_date' || col.key === 'session_date' || col.key === 'fatwa_date') {
      try {
        const d = new Date(val as string);
        return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
      } catch {
        return String(val);
      }
    }
    return String(val);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="text-gold animate-spin" />
        <span className="mr-3 font-body text-sm text-ink/50">جاري البحث...</span>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-16">
        <FileText size={40} strokeWidth={1} className="text-ink/20 mx-auto mb-4" />
        <p className="font-body text-sm text-ink/50">لا توجد نتائج مطابقة. حاول تعديل معايير البحث.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <p className="font-body text-xs text-ink/50">
          {resultCount !== undefined ? `${resultCount} نتيجة` : `${rows.length} نتيجة`}
        </p>
        <div className="flex items-center gap-3">
          {/* Sort */}
          <button
            onClick={() => {
              const order = sortOrder === 'newest' ? 'oldest' : sortOrder === 'oldest' ? 'number' : 'newest';
              setSortOrder(order);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg font-body text-xs text-ink/60 hover:text-gold transition-colors"
          >
            <ArrowUpDown size={14} />
            {sortOrder === 'newest' ? 'الأحدث' : sortOrder === 'oldest' ? 'الأقدم' : 'بالرقم'}
          </button>
          {/* View mode */}
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-midnight text-cream' : 'text-ink/40 hover:text-ink'}`}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-midnight text-cream' : 'text-ink/40 hover:text-ink'}`}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* List view */}
      {viewMode === 'list' && (
        <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 font-body text-xs font-medium text-ink/60 ${col.width || ''}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((row, i) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick(row)}
                  className="border-b border-gray-50 hover:bg-gold/5 cursor-pointer transition-colors duration-200"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 font-body text-xs text-ink/80 ${col.width || ''}`}>
                      {col.key === 'actions' ? (
                        <button className="text-gold hover:text-gold-dark transition-colors">
                          <Eye size={16} />
                        </button>
                      ) : (
                        renderCell(row, col, i)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grid view */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedRows.map((row, i) => (
            <button
              key={row.id}
              onClick={() => onRowClick(row)}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-right hover:border-gold/30 hover:shadow-md transition-all duration-300"
            >
              {columns
                .filter((c) => c.key !== 'index' && c.key !== 'actions')
                .slice(0, 4)
                .map((col) => (
                  <div key={col.key} className="mb-2">
                    <span className="font-body text-[10px] text-ink/40 block">{col.label}</span>
                    <span className="font-body text-xs text-ink/80">{renderCell(row, col, i)}</span>
                  </div>
                ))}
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-gray-200 text-ink/60 disabled:opacity-30 hover:text-gold transition-colors"
          >
            <ChevronRight size={16} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`w-8 h-8 rounded-lg font-body text-xs transition-colors ${
                currentPage === page
                  ? 'bg-midnight text-cream'
                  : 'bg-gray-50 text-ink/60 hover:text-gold'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-gray-200 text-ink/60 disabled:opacity-30 hover:text-gold transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
