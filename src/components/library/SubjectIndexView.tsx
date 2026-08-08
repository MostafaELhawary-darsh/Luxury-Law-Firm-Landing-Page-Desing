import { useState, useEffect } from 'react';
import { ChevronDown, ChevronLeft, Search, Loader2, FolderTree } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import type { SubjectIndexNode } from '@/lib/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface SubjectIndexViewProps {
  title: string;
  subtitle: string;
}

export default function SubjectIndexView({ title, subtitle }: SubjectIndexViewProps) {
  const [nodes, setNodes] = useState<SubjectIndexNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchIndex();
  }, []);

  const fetchIndex = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('subject_index')
      .select('*')
      .order('sort_order', { ascending: true });
    setNodes(buildTree(data || []));
    setLoading(false);
  };

  const buildTree = (flat: SubjectIndexNode[]): SubjectIndexNode[] => {
    const map = new Map<string, SubjectIndexNode>();
    const roots: SubjectIndexNode[] = [];
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

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const nodeMatches = (node: SubjectIndexNode): boolean => {
    if (!search) return true;
    if (node.subject_name.includes(search)) return true;
    return node.children?.some((c) => nodeMatches(c)) ?? false;
  };

  const renderNode = (node: SubjectIndexNode, depth: number): React.ReactNode => {
    if (!nodeMatches(node)) return null;
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id}>
        <div
          className="flex items-center gap-2 py-2 px-2 hover:bg-gold/5 rounded cursor-pointer transition-colors"
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
            <span className="w-3.5 h-3.5 rounded-full border border-gold/30 flex-shrink-0" />
          )}
          <span className="font-body text-sm text-ink/80">{node.subject_name}</span>
          {node.category && (
            <span className="font-body text-[10px] text-ink/30 mr-auto">
              {node.category}
            </span>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-heading font-bold text-midnight text-lg mb-1">{title}</h2>
        <p className="font-body text-xs text-ink/50">{subtitle}</p>
      </div>

      <div className="p-4 border-b border-gray-100">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث في الفهرس..."
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pr-9 pl-3 py-2.5 text-sm font-body text-ink focus:border-gold focus:outline-none"
          />
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
        </div>
      </div>

      <div className="p-4 max-h-[500px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="text-gold animate-spin" />
          </div>
        ) : nodes.length > 0 ? (
          <div>
            {nodes.map((node) => renderNode(node, 0))}
            <button className="mt-4 flex items-center gap-1.5 text-gold hover:text-gold-dark transition-colors font-body text-xs">
              <Search size={14} />
              عرض الأحدث
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FolderTree size={40} strokeWidth={1} className="text-ink/20 mb-4" />
            <p className="font-body text-xs text-ink/40">لا يتوفر فهرس حالياً.</p>
          </div>
        )}
      </div>
    </div>
  );
}
