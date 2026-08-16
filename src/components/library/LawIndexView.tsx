import { useState, useEffect } from 'react';
import { ChevronDown, ChevronLeft, Search, Loader2, BookOpen } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import type { LawStructureNode, Legislation } from '@/lib/types';
import type { ResultRow } from './ResultsTable';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface LawIndexViewProps {
  onDocumentSelect: (row: ResultRow, dataSource: string) => void;
}

export default function LawIndexView({ onDocumentSelect }: LawIndexViewProps) {
  const [laws, setLaws] = useState<Legislation[]>([]);
  const [selectedLaw, setSelectedLaw] = useState<Legislation | null>(null);
  const [tree, setTree] = useState<LawStructureNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchArticle, setSearchArticle] = useState('');
  const [loading, setLoading] = useState(false);
  const [treeLoading, setTreeLoading] = useState(false);

  useEffect(() => {
    fetchLaws();
  }, []);

  const fetchLaws = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('legislation')
      .select('*')
      .order('year', { ascending: true });
    setLaws(data || []);
    setLoading(false);
  };

  const fetchTree = async (lawId: string) => {
    setTreeLoading(true);
    const { data } = await supabase
      .from('law_structure')
      .select('*')
      .eq('legislation_id', lawId)
      .order('sort_order', { ascending: true });
    setTree(buildTree(data || []));
    setTreeLoading(false);
  };

  const buildTree = (flat: LawStructureNode[]): LawStructureNode[] => {
    const map = new Map<string, LawStructureNode>();
    const roots: LawStructureNode[] = [];
    flat.forEach((node) => {
      map.set(node.id, { ...node, children: [] });
    });
    flat.forEach((node) => {
      if (node.parent_id && map.has(node.parent_id)) {
        map.get(node.parent_id)!.children!.push(map.get(node.id)!);
      } else {
        roots.push(map.get(node.id)!);
      }
    });
    return roots;
  };

  const handleSelectLaw = (law: Legislation) => {
    setSelectedLaw(law);
    setExpandedNodes(new Set());
    fetchTree(law.id);
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const renderNode = (node: LawStructureNode, depth: number): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isArticle = node.node_type === 'مادة';
    const matchesSearch =
      !searchArticle ||
      (node.node_number?.includes(searchArticle) ?? false) ||
      node.title.includes(searchArticle);

    if (!matchesSearch && !isArticle) {
      const childMatch = node.children?.some((c) => renderNode(c, depth + 1) !== null);
      if (!childMatch) return null;
    }

    if (searchArticle && isArticle && !matchesSearch) return null;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 py-2 px-2 hover:bg-gold/5 rounded cursor-pointer transition-colors ${
            isArticle ? 'pr-8' : ''
          }`}
          style={{ paddingRight: `${depth * 20 + 8}px` }}
          onClick={() => hasChildren && toggleNode(node.id)}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown size={14} className="text-ink/40 flex-shrink-0" />
            ) : (
              <ChevronLeft size={14} className="text-ink/40 flex-shrink-0" />
            )
          ) : (
            <span className="w-3.5" />
          )}
          <span
            className={`font-body text-xs ${
              isArticle ? 'text-ink/70' : 'font-bold text-midnight'
            }`}
          >
            {node.title}
          </span>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
        {isArticle && node.content && (
          <div
            className="py-2 px-2 bg-gray-50 rounded text-xs font-body text-ink/60 leading-[1.9] mb-1"
            style={{ marginRight: `${depth * 20 + 24}px` }}
          >
            {node.content}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-heading font-bold text-midnight text-lg mb-1">
          القوانين المصرية وفهرس القانون
        </h2>
        <p className="font-body text-xs text-ink/50">
          اختر قانوناً من القائمة لعرض هيكله الشجري (أبواب، فصول، مواد)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-[500px]">
        {/* Right: Laws table */}
        <div className="border-l border-gray-100 overflow-y-auto max-h-[600px]">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="text-gold animate-spin" />
            </div>
          ) : (
            <table className="w-full text-right">
              <thead className="sticky top-0 bg-gray-50/80 backdrop-blur-sm">
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-10">م</th>
                  <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">اسم القانون</th>
                  <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-20">رقم</th>
                  <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-16">سنة</th>
                </tr>
              </thead>
              <tbody>
                {laws.map((law, i) => (
                  <tr
                    key={law.id}
                    onClick={() => handleSelectLaw(law)}
                    className={`border-b border-gray-50 cursor-pointer transition-colors ${
                      selectedLaw?.id === law.id ? 'bg-gold/10' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-3 font-body text-xs text-ink/40">{i + 1}</td>
                    <td className="px-4 py-3 font-body text-xs text-ink/80">{law.title}</td>
                    <td className="px-4 py-3 font-body text-xs text-ink/60">{law.legislation_number}</td>
                    <td className="px-4 py-3 font-body text-xs text-ink/60">{law.year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Left: Tree structure */}
        <div className="overflow-y-auto max-h-[600px] p-4">
          {selectedLaw ? (
            <>
              <div className="mb-4 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen size={16} className="text-gold" />
                  <h3 className="font-heading font-bold text-midnight text-sm">
                    {selectedLaw.title}
                  </h3>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={searchArticle}
                    onChange={(e) => setSearchArticle(e.target.value)}
                    placeholder="بحث برقم المادة..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg pr-9 pl-3 py-2 text-xs font-body text-ink focus:border-gold focus:outline-none"
                  />
                  <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
                </div>
              </div>
              {treeLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={24} className="text-gold animate-spin" />
                </div>
              ) : tree.length > 0 ? (
                <div>{tree.map((node) => renderNode(node, 0))}</div>
              ) : (
                <p className="font-body text-xs text-ink/40 text-center py-10">
                  لا يتوفر هيكل شجري لهذا القانون بعد.
                </p>
              )}
              <button
                onClick={() => onDocumentSelect(selectedLaw as unknown as ResultRow, 'legislation')}
                className="mt-4 w-full py-2.5 bg-midnight text-cream rounded-lg font-body text-xs hover:bg-midnight-light transition-colors"
              >
                عرض النص الكامل للقانون
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <BookOpen size={40} strokeWidth={1} className="text-ink/20 mb-4" />
              <p className="font-body text-xs text-ink/40">
                اختر قانوناً من القائمة لعرض هيكله الشجري
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
