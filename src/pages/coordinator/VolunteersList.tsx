import React, { useEffect, useState } from 'react';
import { useAuth } from '../../components/AuthContext.tsx';
import { motion } from 'motion/react';
import { 
  Search, 
  Filter, 
  ChevronDown, 
  MoreHorizontal, 
  Eye, 
  Mail, 
  MessageSquare, 
  Crown,
  Download,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../../hooks/useDebounce.ts';

export const VolunteersList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchVolunteers = () => {
    setLoading(true);
    const params = new URLSearchParams({
      state: user?.state || '',
      city: user?.city || '',
      role: user?.role || '',
      filter,
      search: debouncedSearch,
      page: page.toString(),
      limit: '25'
    });

    fetch(`/api/coordenador/voluntarios?${params}`)
      .then(res => res.json())
      .then(data => {
        setVolunteers(data.volunteers);
        setTotalPages(data.pagination.pages);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (user) fetchVolunteers();
  }, [user, filter, page, debouncedSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchVolunteers();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === volunteers.length) setSelectedIds([]);
    else setSelectedIds(volunteers.map(v => v.id));
  };

  const getEngagementBlocks = (missions: number) => {
    if (missions >= 10) return 'â–ˆâ–ˆâ–ˆâ–ˆâ–ˆ';
    if (missions >= 5) return 'â–ˆâ–ˆâ–ˆâ–ˆâ–‘';
    if (missions >= 2) return 'â–ˆâ–ˆâ–ˆâ–‘â–‘';
    if (missions >= 1) return 'â–ˆâ–ˆâ–‘â–‘â–‘';
    return 'â–ˆâ–‘â–‘â–‘â–‘';
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">GestÃ£o de VoluntÃ¡rios</h1>
          <p className="text-zinc-500 font-medium">Controle e engajamento da base no territÃ³rio</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-zinc-900 text-white font-bold py-3 px-6 rounded-xl border border-zinc-800 hover:bg-zinc-800 transition-all flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
          <button className="bg-[#F5C400] text-black font-black py-3 px-6 rounded-xl hover:bg-[#e0b300] transition-all flex items-center gap-2 text-sm shadow-lg">
            <UserPlus className="w-4 h-4" /> Convidar Novo
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#111111] p-2 rounded-2xl border border-zinc-800 flex flex-wrap gap-2">
        {[
          { id: 'todos', label: 'Todos' },
          { id: 'ativos', label: 'Ativos' },
          { id: 'inativos', label: 'Inativos' },
          { id: 'lideres', label: 'LÃ­deres' },
          { id: 'novos', label: 'Novos' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => { setFilter(f.id); setPage(1); }}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              filter === f.id ? 'bg-[#F5C400] text-black shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search & Bulk Actions */}
      <div className="flex justify-between items-center gap-4">
        <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#111111] border border-zinc-800 text-white focus:ring-2 focus:ring-[#F5C400] focus:border-transparent outline-none transition-all placeholder:text-zinc-600 text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </form>

        {selectedIds.length > 0 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-4 bg-[#F5C400] px-6 py-3 rounded-xl shadow-xl">
            <span className="text-xs font-black text-black uppercase tracking-wider">{selectedIds.length} selecionados</span>
            <div className="h-4 w-[1px] bg-black/20" />
            <button className="text-xs font-black text-black hover:underline uppercase tracking-wider">Atribuir MissÃ£o</button>
            <button className="text-xs font-black text-black hover:underline uppercase tracking-wider">Comunicado</button>
          </motion.div>
        )}
      </div>

      {/* Table */}
      <div className="bg-[#111111] rounded-2xl border border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/50 border-b border-zinc-800 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                <th className="p-5 w-12">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-[#F5C400] focus:ring-[#F5C400]" 
                    checked={selectedIds.length === volunteers.length && volunteers.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="p-5">VoluntÃ¡rio</th>
                <th className="p-5">LocalizaÃ§Ã£o</th>
                <th className="p-5">NÃ­vel / XP</th>
                <th className="p-5">Engajamento</th>
                <th className="p-5">Ãšltimo Acesso</th>
                <th className="p-5">Score</th>
                <th className="p-5 text-right">AÃ§Ãµes</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-20 text-center">
                    <div className="w-8 h-8 border-2 border-[#F5C400] border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : volunteers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-20 text-center text-zinc-500 font-medium">Nenhum voluntÃ¡rio encontrado</td>
                </tr>
              ) : (
                volunteers.map(v => (
                  <tr key={v.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-all group cursor-pointer" onClick={() => navigate(`/coordinator/volunteers/${v.id}`)}>
                    <td className="p-5" onClick={e => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-[#F5C400] focus:ring-[#F5C400]" 
                        checked={selectedIds.includes(v.id)}
                        onChange={() => toggleSelect(v.id)}
                      />
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-lg border border-zinc-700">
                          {v.photo_url ? <img src={v.photo_url} className="w-full h-full object-cover rounded-xl" /> : 'ðŸ‘¤'}
                        </div>
                        <div>
                          <p className="font-bold text-white group-hover:text-[#F5C400] transition-colors">{v.name}</p>
                          <p className="text-[10px] text-zinc-500 font-medium">{v.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <span className="bg-zinc-900 text-zinc-400 text-[10px] font-black px-2 py-1 rounded border border-zinc-800 uppercase tracking-wider">
                        {v.city} â€” {v.state}
                      </span>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">Lvl {v.current_level}</span>
                        <div className="h-1 w-12 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-[#F5C400] w-[60%]" />
                        </div>
                      </div>
                      <p className="text-[10px] font-mono text-zinc-600 mt-1">{v.xp_total} XP</p>
                    </td>
                    <td className="p-5">
                      <div className="font-mono text-[#F5C400] text-xs tracking-tighter">
                        {getEngagementBlocks(v.missions_completed)}
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${new Date(v.last_active_at) > new Date(Date.now() - 24*60*60*1000) ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-600'}`} />
                        <span className="text-xs text-zinc-400">Hoje</span>
                      </div>
                    </td>
                    <td className="p-5">
                      <span className={`text-xs font-black ${v.leadership_score >= 70 ? 'text-emerald-500' : v.leadership_score >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {v.leadership_score}
                      </span>
                    </td>
                    <td className="p-5 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => navigate(`/coordinator/volunteers/${v.id}`)} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all" title="Ver Perfil">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-zinc-500 hover:text-[#F5C400] hover:bg-zinc-800 rounded-lg transition-all" title="Atribuir MissÃ£o">
                          <Target className="w-4 h-4" />
                        </button>
                        {v.leadership_score >= 70 && (
                          <button className="p-2 text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-all" title="Promover">
                            <Crown className="w-4 h-4" />
                          </button>
                        )}
                        <button className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-5 border-t border-zinc-800 flex items-center justify-between bg-zinc-900/20">
          <p className="text-xs text-zinc-500 font-medium">Mostrando 25 de {totalPages * 25} voluntÃ¡rios</p>
          <div className="flex gap-2">
            <button 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)}
              className="p-2 rounded-lg border border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${
                    page === i + 1 ? 'bg-[#F5C400] text-black' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button 
              disabled={page === totalPages} 
              onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-lg border border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

