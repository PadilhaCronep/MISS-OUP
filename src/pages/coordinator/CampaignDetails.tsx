
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Layout,
  List,
  Network,
  Plus,
  Search,
  Settings,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import { ErrorState } from '../../components/ui/ErrorState.tsx';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader.tsx';
import { usePageTitle } from '../../hooks/usePageTitle.ts';
import {
  type CampaignTaskPriority,
  type CampaignTaskStatus,
  type CampaignTaskWorkspace,
  useCampanha,
} from '../../hooks/useCampanha.ts';
import { useDebounce } from '../../hooks/useDebounce.ts';
import { apiClient } from '../../lib/api-client.ts';
import { useToast } from '../../components/ui/ToastProvider.tsx';
import { useAuth } from '../../components/AuthContext.tsx';
import { cn } from '../../lib/cn.ts';
import { isCoordinatorRole } from '../../lib/role-groups.ts';

type ViewMode = 'board' | 'list' | 'calendar';

type FilterAll = 'ALL';

interface CreateTaskForm {
  title: string;
  description: string;
  sectorId: string;
  subsectorId: string;
  assignedTo: string;
  priority: CampaignTaskPriority;
  status: CampaignTaskStatus;
  deadline: string;
  estimatedHours: string;
  xpReward: string;
}

interface ConnectionInsight {
  id: string;
  fromSector: string;
  toSector: string;
  tasks: number;
  message: string;
}

interface GamificationRow {
  memberId: string;
  volunteerId: string;
  nome: string;
  setor: string;
  completed: number;
  inProgress: number;
  inReview: number;
  points: number;
  level: number;
  nextLevelPoints: number;
  badges: string[];
}

const COLUMNS: Array<{ key: CampaignTaskStatus; label: string }> = [
  { key: 'PENDENTE', label: 'Backlog' },
  { key: 'EM_PROGRESSO', label: 'Em Progresso' },
  { key: 'REVISAO', label: 'Revisao' },
  { key: 'CONCLUIDA', label: 'Concluidas' },
];

const statusLabel: Record<CampaignTaskStatus, string> = {
  PENDENTE: 'Pendente',
  EM_PROGRESSO: 'Em progresso',
  REVISAO: 'Revisao',
  CONCLUIDA: 'Concluida',
};

const priorityClass: Record<CampaignTaskPriority, string> = {
  BAIXA: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  MEDIA: 'bg-blue-900/40 text-blue-300 border-blue-700/40',
  ALTA: 'bg-red-900/40 text-red-300 border-red-700/40',
};

const priorityText: Record<CampaignTaskPriority, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Media',
  ALTA: 'Alta',
};

const formatDate = (date: string | null): string => {
  if (!date) return 'Sem prazo';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Sem prazo';
  return parsed.toLocaleDateString('pt-BR');
};

const isLate = (date: string | null, status: CampaignTaskStatus): boolean => {
  if (!date || status === 'CONCLUIDA') return false;
  const parsed = new Date(date);
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() < Date.now();
};

const dayKey = (date: Date): string => date.toISOString().slice(0, 10);

const buildMonthGrid = (monthRef: Date): Date[] => {
  const firstDay = new Date(monthRef.getFullYear(), monthRef.getMonth(), 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
};

const monthTitle = (monthRef: Date): string =>
  monthRef.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

export const CampaignDetails: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();

  usePageTitle('Workspace de Campanha');

  const { campanha, loading, error, refetch } = useCampanha(id ?? null);

  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string | FilterAll>('ALL');
  const [statusFilter, setStatusFilter] = useState<CampaignTaskStatus | FilterAll>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<CampaignTaskPriority | FilterAll>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string | FilterAll>('ALL');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  const [form, setForm] = useState<CreateTaskForm>({
    title: '',
    description: '',
    sectorId: '',
    subsectorId: '',
    assignedTo: '',
    priority: 'MEDIA',
    status: 'PENDENTE',
    deadline: '',
    estimatedHours: '',
    xpReward: '80',
  });

  const searchDebounced = useDebounce(search, 250);

  const isCoordinatorProfile = Boolean(user && isCoordinatorRole(user.role));
  const backToCampaignsPath = isCoordinatorProfile ? '/coordinator/campaigns' : '/voluntario/campanhas';
  const backToCampaignsLabel = isCoordinatorProfile ? 'Voltar para campanhas' : 'Voltar para minhas campanhas';

  const canEditTask = (task: CampaignTaskWorkspace): boolean =>
    isCoordinatorProfile || task.assigned_to === user?.id;

  useEffect(() => {
    if (!campanha || campanha.sectors.length === 0) return;
    setForm((prev) => (prev.sectorId ? prev : { ...prev, sectorId: campanha.sectors[0].id }));
  }, [campanha]);

  const filteredTasks = useMemo(() => {
    if (!campanha) return [];
    const term = searchDebounced.trim().toLowerCase();

    return campanha.tasks.filter((task) => {
      if (sectorFilter !== 'ALL' && task.sector_id !== sectorFilter) return false;
      if (statusFilter !== 'ALL' && task.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) return false;
      if (assigneeFilter !== 'ALL' && (task.assigned_to ?? '') !== assigneeFilter) return false;

      if (!term) return true;
      const text = [task.title, task.description ?? '', task.sector_name, task.assigned_to_name ?? '']
        .join(' ')
        .toLowerCase();
      return text.includes(term);
    });
  }, [campanha, searchDebounced, sectorFilter, statusFilter, priorityFilter, assigneeFilter]);

  useEffect(() => {
    if (filteredTasks.length === 0) {
      setSelectedTaskId(null);
      return;
    }
    const exists = filteredTasks.some((task) => task.id === selectedTaskId);
    if (!exists) setSelectedTaskId(filteredTasks[0].id);
  }, [filteredTasks, selectedTaskId]);

  const selectedTask = useMemo(
    () => filteredTasks.find((task) => task.id === selectedTaskId) ?? null,
    [filteredTasks, selectedTaskId],
  );

  const tasksByStatus = useMemo(() => {
    return COLUMNS.reduce<Record<CampaignTaskStatus, CampaignTaskWorkspace[]>>(
      (acc, column) => {
        acc[column.key] = filteredTasks.filter((task) => task.status === column.key);
        return acc;
      },
      { PENDENTE: [], EM_PROGRESSO: [], REVISAO: [], CONCLUIDA: [] },
    );
  }, [filteredTasks]);

  const kpis = useMemo(() => {
    if (!campanha) return { sectors: 0, members: 0, total: 0, done: 0, late: 0 };
    const done = campanha.tasks.filter((task) => task.status === 'CONCLUIDA').length;
    const late = campanha.tasks.filter((task) => isLate(task.deadline, task.status)).length;
    return {
      sectors: campanha.sectors.length,
      members: campanha.members.length,
      total: campanha.tasks.length,
      done,
      late,
    };
  }, [campanha]);

  const connections = useMemo<ConnectionInsight[]>(() => {
    if (!campanha) return [];

    const sectorById = new Map<string, string>(campanha.sectors.map((sector) => [sector.id, sector.name] as [string, string]));
    const memberSectorByVolunteer = new Map<string, string>(campanha.members.map((member) => [member.volunteer_id, member.sector_id] as [string, string]));
    const connectionCount = new Map<string, number>();

    for (const task of campanha.tasks) {
      if (!task.assigned_to) continue;
      const assigneeSectorId = memberSectorByVolunteer.get(task.assigned_to);
      if (!assigneeSectorId || assigneeSectorId === task.sector_id) continue;

      const key = `${task.sector_id}__${assigneeSectorId}`;
      connectionCount.set(key, (connectionCount.get(key) ?? 0) + 1);
    }

    const derived: ConnectionInsight[] = Array.from(connectionCount.entries())
      .map(([key, amount], index) => {
        const [from, to] = key.split('__');
        return {
          id: `conn-${index + 1}`,
          fromSector: sectorById.get(from) ?? 'Setor origem',
          toSector: sectorById.get(to) ?? 'Setor destino',
          tasks: amount,
          message: `Criar ritual semanal entre ${sectorById.get(from) ?? 'origem'} e ${
            sectorById.get(to) ?? 'destino'
          } para acelerar handoff de tarefas.`,
        };
      })
      .sort((a, b) => b.tasks - a.tasks)
      .slice(0, 6);

    if (derived.length > 0) return derived;

    const fallback = [...campanha.sectors]
      .sort((a, b) => Number(b.tasks_total ?? 0) - Number(a.tasks_total ?? 0))
      .slice(0, 4);

    const fallbackConnections: ConnectionInsight[] = [];
    for (let i = 0; i < fallback.length - 1; i += 1) {
      fallbackConnections.push({
        id: `fallback-${i + 1}`,
        fromSector: fallback[i].name,
        toSector: fallback[i + 1].name,
        tasks: Math.max(1, Math.round((Number(fallback[i].tasks_total ?? 0) + Number(fallback[i + 1].tasks_total ?? 0)) / 6)),
        message: `Conexao recomendada para aumentar alinhamento entre ${fallback[i].name} e ${fallback[i + 1].name}.`,
      });
    }

    return fallbackConnections;
  }, [campanha]);

  const gamification = useMemo<GamificationRow[]>(() => {
    if (!campanha) return [];

    const rows = campanha.members.map((member) => {
      const memberTasks = campanha.tasks.filter((task) => task.assigned_to === member.volunteer_id);
      const completed = memberTasks.filter((task) => task.status === 'CONCLUIDA');
      const inProgress = memberTasks.filter((task) => task.status === 'EM_PROGRESSO');
      const inReview = memberTasks.filter((task) => task.status === 'REVISAO');

      const completedXp = completed.reduce((sum, task) => sum + Number(task.xp_reward ?? 0), 0);
      const reviewXp = inReview.reduce((sum, task) => sum + Number(task.xp_reward ?? 0) * 0.5, 0);
      const progressXp = inProgress.reduce((sum, task) => sum + Number(task.xp_reward ?? 0) * 0.25, 0);
      const perfBonus = Math.max(0, Number(member.performance_score ?? 0)) * 2;

      const points = Math.round(completedXp + reviewXp + progressXp + perfBonus);
      const level = Math.max(1, Math.floor(points / 300) + 1);
      const nextLevelPoints = level * 300;

      const badges: string[] = [];
      if (completed.length >= 5) badges.push('Executor');
      if (completedXp >= 600) badges.push('Alta Performance');
      if (inReview.length >= 3) badges.push('Qualidade');
      if (Number(member.performance_score ?? 0) >= 85) badges.push('Elite');
      if (badges.length === 0) badges.push('Em Evolucao');

      return {
        memberId: member.member_id,
        volunteerId: member.volunteer_id,
        nome: member.name,
        setor: member.sector_name,
        completed: completed.length,
        inProgress: inProgress.length,
        inReview: inReview.length,
        points,
        level,
        nextLevelPoints,
        badges,
      };
    });

    return rows.sort((a, b) => b.points - a.points);
  }, [campanha]);

  const calendarGrid = useMemo(() => buildMonthGrid(calendarMonth), [calendarMonth]);

  const tasksByDay = useMemo(() => {
    const grouped = new Map<string, CampaignTaskWorkspace[]>();
    for (const task of filteredTasks) {
      if (!task.deadline) continue;
      const parsed = new Date(task.deadline);
      if (Number.isNaN(parsed.getTime())) continue;
      const key = dayKey(parsed);
      const current = grouped.get(key) ?? [];
      current.push(task);
      grouped.set(key, current);
    }

    for (const [key, value] of grouped.entries()) {
      value.sort((a, b) => {
        const pa = a.priority === 'ALTA' ? 3 : a.priority === 'MEDIA' ? 2 : 1;
        const pb = b.priority === 'ALTA' ? 3 : b.priority === 'MEDIA' ? 2 : 1;
        return pb - pa;
      });
      grouped.set(key, value);
    }

    return grouped;
  }, [filteredTasks]);

  const updateTask = async (taskId: string, payload: Record<string, unknown>): Promise<void> => {
    if (!id) return;

    setUpdatingTaskId(taskId);
    const result = await apiClient.patch<{ success: boolean }>(
      `/api/coordenador/campanha/${id}/tarefas/${taskId}`,
      payload,
    );
    setUpdatingTaskId(null);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success('Tarefa atualizada.');
    await refetch();
  };

  const updateVolunteerTask = async (taskId: string, status: CampaignTaskStatus): Promise<void> => {
    setUpdatingTaskId(taskId);
    const result = await apiClient.patch<{ success: boolean }>(`/api/voluntario/tarefas/${taskId}/progresso`, {
      status,
      hours: 0,
    });
    setUpdatingTaskId(null);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success('Status atualizado na sua tarefa.');
    await refetch();
  };

  const handleTaskStatusChange = async (task: CampaignTaskWorkspace, status: CampaignTaskStatus): Promise<void> => {
    if (!canEditTask(task)) {
      toast.error('Voce so pode atualizar tarefas atribuidas a voce.');
      return;
    }

    if (isCoordinatorProfile) {
      await updateTask(task.id, { status });
      return;
    }

    await updateVolunteerTask(task.id, status);
  };

  const submitCreate = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!id) return;

    if (!form.title.trim() || !form.sectorId) {
      toast.error('Titulo e setor sao obrigatorios.');
      return;
    }

    setCreating(true);
    const result = await apiClient.post<{ success: boolean }>(`/api/coordenador/campanha/${id}/tarefas`, {
      title: form.title.trim(),
      description: form.description.trim() || null,
      sectorId: form.sectorId,
      subsectorId: form.subsectorId || null,
      assignedTo: form.assignedTo || null,
      priority: form.priority,
      status: form.status,
      deadline: form.deadline ? new Date(`${form.deadline}T23:59:00`).toISOString() : null,
      estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : null,
      xpReward: form.xpReward ? Number(form.xpReward) : 0,
      createdBy: user?.id ?? null,
    });
    setCreating(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success('Nova tarefa criada.');
    setShowCreate(false);
    setForm((prev) => ({
      ...prev,
      title: '',
      description: '',
      subsectorId: '',
      assignedTo: '',
      deadline: '',
      estimatedHours: '',
      xpReward: '80',
      status: 'PENDENTE',
      priority: 'MEDIA',
    }));
    await refetch();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader variant="kpi" count={1} />
        <SkeletonLoader variant="profile" count={1} />
      </div>
    );
  }

  if (error) return <ErrorState mensagem={error} onRetry={() => void refetch()} />;
  if (!campanha) return <ErrorState mensagem="Campanha nao encontrada." onRetry={() => void refetch()} />;

  const completion = kpis.total > 0 ? Math.round((kpis.done / kpis.total) * 100) : 0;
  const selectedSector = campanha.sectors.find((sector) => sector.id === form.sectorId);
  const topGamers = gamification.slice(0, 8);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link to={backToCampaignsPath} className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-300 mb-3">
            <ArrowLeft className="w-4 h-4" />
            {backToCampaignsLabel}
          </Link>
          <h1 className="text-3xl font-black text-white">{campanha.name}</h1>
          <p className="text-zinc-400">{(campanha.office || '').replaceAll('_', ' ')} - {campanha.candidate_name}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isCoordinatorProfile ? (
            <>
              <button
                onClick={() => setShowCreate((value) => !value)}
                className="px-4 py-2 rounded-xl bg-[#F5C400] text-black font-bold hover:bg-[#e8b800] inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nova tarefa
              </button>
              <button className="px-4 py-2 rounded-xl bg-zinc-800 text-white font-semibold hover:bg-zinc-700 inline-flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Configuracoes
              </button>
            </>
          ) : (
            <span className="px-3 py-2 rounded-xl border border-white/10 text-xs text-zinc-400">
              Voce pode atualizar apenas tarefas atribuidas a voce.
            </span>
          )}
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-2xl border border-white/10 bg-[#111111] p-4"><p className="text-xs text-zinc-500">Setores</p><p className="text-2xl font-black text-white mt-1">{kpis.sectors}</p></article>
        <article className="rounded-2xl border border-white/10 bg-[#111111] p-4"><p className="text-xs text-zinc-500">Membros</p><p className="text-2xl font-black text-white mt-1">{kpis.members}</p></article>
        <article className="rounded-2xl border border-white/10 bg-[#111111] p-4"><p className="text-xs text-zinc-500">Tarefas</p><p className="text-2xl font-black text-white mt-1">{kpis.total}</p></article>
        <article className="rounded-2xl border border-white/10 bg-[#111111] p-4"><p className="text-xs text-zinc-500">Concluidas</p><p className="text-2xl font-black text-emerald-300 mt-1">{kpis.done}</p></article>
        <article className="rounded-2xl border border-white/10 bg-[#111111] p-4"><p className="text-xs text-zinc-500">Atrasadas</p><p className="text-2xl font-black text-red-300 mt-1">{kpis.late}</p></article>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#111111] p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-300"><Layout className="w-4 h-4 text-[#F5C400]" />Setores da campanha</p>
          <p className="text-xs text-zinc-500">Entrega geral: {completion}%</p>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {campanha.sectors.map((sector) => {
            const total = Number(sector.tasks_total ?? 0);
            const done = Number(sector.tasks_done ?? 0);
            const rate = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <article key={sector.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{sector.name}</h3>
                    <p className="text-xs text-zinc-500">{sector.members_count ?? 0} membros</p>
                  </div>
                  {isCoordinatorProfile ? (
                    <Link to={`/coordinator/campaign/${id}/sector/${sector.slug}/rh`} className="text-xs px-2 py-1 rounded-md border border-white/10 text-zinc-300 hover:text-white">RH</Link>
                  ) : (
                    <span className="text-[10px] px-2 py-1 rounded-md border border-white/10 text-zinc-500">Leitura</span>
                  )}
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-zinc-800 overflow-hidden"><div className="h-full" style={{ width: `${rate}%`, backgroundColor: sector.color || '#F5C400' }} /></div>
                <p className="mt-2 text-[11px] text-zinc-400">{done}/{total} concluidas</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-[#111111] p-4">
          <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider inline-flex items-center gap-2 mb-3"><Network className="w-4 h-4 text-[#F5C400]" />Possiveis conexoes</h2>
          {connections.length === 0 ? (
            <EmptyState
              icone={<Network className="w-5 h-5" />}
              titulo="Sem conexoes mapeadas"
              subtitulo="Atribua tarefas entre setores para gerar matriz de conexoes."
            />
          ) : (
            <div className="space-y-3">
              {connections.map((connection) => (
                <div key={connection.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <p className="text-sm font-semibold text-white">{connection.fromSector}{' -> '}{connection.toSector}</p>
                  <p className="text-xs text-zinc-400 mt-1">{connection.tasks} tarefa(s) conectadas</p>
                  <p className="text-xs text-zinc-500 mt-2">{connection.message}</p>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-white/10 bg-[#111111] p-4">
          <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider inline-flex items-center gap-2 mb-3"><Trophy className="w-4 h-4 text-[#F5C400]" />Gamificacao da campanha</h2>
          {topGamers.length === 0 ? (
            <EmptyState
              icone={<Trophy className="w-5 h-5" />}
              titulo="Sem ranking ainda"
              subtitulo="Quando as tarefas forem atribuidas, o ranking aparece aqui."
            />
          ) : (
            <div className="space-y-2">
              {topGamers.slice(0, 5).map((gamer, index) => {
                const progressToNext = Math.min(100, Math.round((gamer.points / gamer.nextLevelPoints) * 100));
                return (
                  <div key={gamer.memberId} className="rounded-xl border border-white/10 bg-black/30 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">#{index + 1} {gamer.nome}</p>
                      <p className="text-xs text-zinc-300">Lv {gamer.level}</p>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">{gamer.setor} - {gamer.points} pts</p>
                    <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden mt-2"><div className="h-full bg-[#F5C400]" style={{ width: `${progressToNext}%` }} /></div>
                    <p className="text-[11px] text-zinc-500 mt-2">Badges: {gamer.badges.join(', ')}</p>
                  </div>
                );
              })}
            </div>
          )}
        </article>
      </section>

      {showCreate && isCoordinatorProfile ? (
        <section className="rounded-2xl border border-[#F5C400]/40 bg-[#0f0f0f] p-5">
          <h2 className="text-lg font-bold text-white mb-4">Nova tarefa</h2>
          <form onSubmit={(event) => void submitCreate(event)} className="grid gap-3 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <label htmlFor="task-title" className="text-xs text-zinc-400">Titulo</label>
              <input id="task-title" required value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white outline-none focus:border-[#F5C400]" />
            </div>
            <div className="lg:col-span-2">
              <label htmlFor="task-description" className="text-xs text-zinc-400">Descricao</label>
              <textarea id="task-description" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} className="mt-1 min-h-[80px] w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white outline-none focus:border-[#F5C400]" />
            </div>
            <div>
              <label htmlFor="task-sector" className="text-xs text-zinc-400">Setor</label>
              <select
                id="task-sector"
                value={form.sectorId}
                onChange={(event) => {
                  const nextSectorId = event.target.value;
                  const nextSector = campanha.sectors.find((sector) => sector.id === nextSectorId);
                  setForm((prev) => ({
                    ...prev,
                    sectorId: nextSectorId,
                    subsectorId: nextSector?.subsetores.some((sub) => sub.id === prev.subsectorId) ? prev.subsectorId : '',
                  }));
                }}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white"
              >
                {campanha.sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="task-subsector" className="text-xs text-zinc-400">Subsetor</label>
              <select id="task-subsector" value={form.subsectorId} onChange={(event) => setForm((prev) => ({ ...prev, subsectorId: event.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white">
                <option value="">Sem subsetor</option>
                {(selectedSector?.subsetores ?? []).map((sub) => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="task-assignee" className="text-xs text-zinc-400">Responsavel</label>
              <select id="task-assignee" value={form.assignedTo} onChange={(event) => setForm((prev) => ({ ...prev, assignedTo: event.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white">
                <option value="">Nao atribuido</option>
                {campanha.members.map((member) => <option key={member.member_id} value={member.volunteer_id}>{member.name} - {member.sector_name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="task-priority" className="text-xs text-zinc-400">Prioridade</label>
              <select id="task-priority" value={form.priority} onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value as CampaignTaskPriority }))} className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white">
                <option value="BAIXA">Baixa</option><option value="MEDIA">Media</option><option value="ALTA">Alta</option>
              </select>
            </div>
            <div>
              <label htmlFor="task-status" className="text-xs text-zinc-400">Status inicial</label>
              <select id="task-status" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as CampaignTaskStatus }))} className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white">
                {COLUMNS.map((column) => <option key={column.key} value={column.key}>{statusLabel[column.key]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="task-deadline" className="text-xs text-zinc-400">Prazo</label>
              <input id="task-deadline" type="date" value={form.deadline} onChange={(event) => setForm((prev) => ({ ...prev, deadline: event.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white" />
            </div>
            <div>
              <label htmlFor="task-hours" className="text-xs text-zinc-400">Horas estimadas</label>
              <input id="task-hours" type="number" min={0} step={0.5} value={form.estimatedHours} onChange={(event) => setForm((prev) => ({ ...prev, estimatedHours: event.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white" />
            </div>
            <div>
              <label htmlFor="task-xp" className="text-xs text-zinc-400">XP da tarefa</label>
              <input id="task-xp" type="number" min={0} value={form.xpReward} onChange={(event) => setForm((prev) => ({ ...prev, xpReward: event.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white" />
            </div>
            <div className="lg:col-span-2 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl border border-white/10 text-zinc-300">Cancelar</button>
              <button type="submit" disabled={creating} aria-busy={creating} className="px-4 py-2 rounded-xl bg-[#F5C400] text-black font-bold disabled:opacity-60">{creating ? 'Salvando...' : 'Criar tarefa'}</button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-white/10 bg-[#111111] p-4 space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setViewMode('board')} className={cn('px-3 py-2 rounded-lg text-sm border', viewMode === 'board' ? 'bg-[#F5C400] border-[#F5C400] text-black font-bold' : 'border-white/10 text-zinc-300')}>Board</button>
              <button onClick={() => setViewMode('list')} className={cn('px-3 py-2 rounded-lg text-sm border', viewMode === 'list' ? 'bg-[#F5C400] border-[#F5C400] text-black font-bold' : 'border-white/10 text-zinc-300')}>Lista</button>
              <button onClick={() => setViewMode('calendar')} className={cn('px-3 py-2 rounded-lg text-sm border inline-flex items-center gap-1', viewMode === 'calendar' ? 'bg-[#F5C400] border-[#F5C400] text-black font-bold' : 'border-white/10 text-zinc-300')}><CalendarDays className="w-3 h-3" />Calendario</button>
            </div>
            <div className="relative w-full xl:max-w-xs">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar tarefa" className="w-full rounded-lg border border-white/10 bg-black/40 pl-10 pr-3 py-2 text-sm text-white" />
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <select value={sectorFilter} onChange={(event) => setSectorFilter(event.target.value)} className="rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm text-white"><option value="ALL">Setor: todos</option>{campanha.sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}</select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as CampaignTaskStatus | FilterAll)} className="rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm text-white"><option value="ALL">Status: todos</option>{COLUMNS.map((column) => <option key={column.key} value={column.key}>{statusLabel[column.key]}</option>)}</select>
            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as CampaignTaskPriority | FilterAll)} className="rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm text-white"><option value="ALL">Prioridade: todas</option><option value="ALTA">Alta</option><option value="MEDIA">Media</option><option value="BAIXA">Baixa</option></select>
            <select value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)} className="rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm text-white"><option value="ALL">Responsavel: todos</option>{campanha.members.map((member) => <option key={member.member_id} value={member.volunteer_id}>{member.name}</option>)}</select>
          </div>

          <p className="text-xs text-zinc-500">{filteredTasks.length} tarefa(s) exibida(s)</p>

          {filteredTasks.length === 0 ? (
            <EmptyState
              icone={<Target className="w-5 h-5" />}
              titulo="Nenhuma tarefa encontrada"
              subtitulo="Ajuste os filtros ou crie uma nova tarefa."
              acao={isCoordinatorProfile ? { label: 'Criar tarefa', onClick: () => setShowCreate(true) } : undefined}
            />
          ) : viewMode === 'board' ? (
            <div className="grid gap-3 xl:grid-cols-4">
              {COLUMNS.map((column) => (
                <section key={column.key} className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-zinc-100">{column.label}</h3>
                    <span className="text-xs text-zinc-500">{tasksByStatus[column.key].length}</span>
                  </div>
                  <div className="space-y-2">
                    {tasksByStatus[column.key].map((task) => (
                      <article
                        key={task.id}
                        className={cn('rounded-lg border border-white/10 bg-[#151515] p-3 cursor-pointer hover:border-white/25', selectedTaskId === task.id && 'border-[#F5C400]/60')}
                        onClick={() => setSelectedTaskId(task.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-semibold text-white line-clamp-2">{task.title}</h4>
                          <span className={cn('rounded-md border px-2 py-0.5 text-[10px] font-semibold', priorityClass[task.priority])}>{priorityText[task.priority]}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-zinc-500">{task.sector_name}</p>
                        <p className="mt-1 text-[11px] text-zinc-400">{task.assigned_to_name ?? 'Nao atribuido'}</p>
                        <p className="mt-1 text-[11px] text-zinc-400">XP: {task.xp_reward ?? 0}</p>
                        <p className={cn('text-[11px] mt-1', isLate(task.deadline, task.status) ? 'text-red-300' : 'text-zinc-500')}>{formatDate(task.deadline)}</p>
                        {canEditTask(task) ? (
                          <select
                            aria-label={`Atualizar status da tarefa ${task.title}`}
                            value={task.status}
                            disabled={updatingTaskId === task.id}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => {
                              void handleTaskStatusChange(task, event.target.value as CampaignTaskStatus);
                            }}
                            className="mt-2 w-full rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs text-zinc-200"
                          >
                            {COLUMNS.map((option) => <option key={option.key} value={option.key}>{statusLabel[option.key]}</option>)}
                          </select>
                        ) : (
                          <p className="mt-2 text-[11px] text-zinc-500">Somente leitura</p>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : viewMode === 'list' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-zinc-400 border-b border-white/10">
                    <th className="py-2 pr-2">Tarefa</th><th className="py-2 pr-2">Setor</th><th className="py-2 pr-2">Responsavel</th><th className="py-2 pr-2">Prazo</th><th className="py-2 pr-2">XP</th><th className="py-2 pr-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className={cn('border-b border-white/5 hover:bg-white/5 cursor-pointer', selectedTaskId === task.id && 'bg-white/5')} onClick={() => setSelectedTaskId(task.id)}>
                      <td className="py-2 pr-2 text-white font-medium">{task.title}</td>
                      <td className="py-2 pr-2 text-zinc-300">{task.sector_name}</td>
                      <td className="py-2 pr-2 text-zinc-300">{task.assigned_to_name ?? 'Nao atribuido'}</td>
                      <td className={cn('py-2 pr-2', isLate(task.deadline, task.status) ? 'text-red-300' : 'text-zinc-300')}>{formatDate(task.deadline)}</td>
                      <td className="py-2 pr-2 text-zinc-300">{task.xp_reward ?? 0}</td>
                      <td className="py-2 pr-2">
                        {canEditTask(task) ? (
                          <select
                            aria-label={`Atualizar status da tarefa ${task.title}`}
                            value={task.status}
                            disabled={updatingTaskId === task.id}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => {
                              void handleTaskStatusChange(task, event.target.value as CampaignTaskStatus);
                            }}
                            className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs text-zinc-200"
                          >
                            {COLUMNS.map((option) => <option key={option.key} value={option.key}>{statusLabel[option.key]}</option>)}
                          </select>
                        ) : (
                          <span className="text-xs text-zinc-500">Somente leitura</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                  className="px-2 py-1 rounded-md border border-white/10 text-zinc-300 hover:text-white inline-flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Mes anterior
                </button>
                <p className="text-sm font-semibold text-zinc-200 capitalize">{monthTitle(calendarMonth)}</p>
                <button
                  onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                  className="px-2 py-1 rounded-md border border-white/10 text-zinc-300 hover:text-white inline-flex items-center gap-1"
                >
                  Proximo mes <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2 text-[11px] text-zinc-500">
                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map((day) => (
                  <div key={day} className="text-center font-semibold">{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {calendarGrid.map((day) => {
                  const inMonth = day.getMonth() === calendarMonth.getMonth();
                  const key = dayKey(day);
                  const dayTasks = tasksByDay.get(key) ?? [];
                  const isToday = key === dayKey(new Date());

                  return (
                    <div key={key} className={cn('min-h-[110px] rounded-lg border p-2', inMonth ? 'border-white/10 bg-black/25' : 'border-white/5 bg-black/10 text-zinc-600', isToday && 'border-[#F5C400]/50')}>
                      <p className={cn('text-xs mb-1', inMonth ? 'text-zinc-300' : 'text-zinc-600')}>{day.getDate()}</p>
                      <div className="space-y-1">
                        {dayTasks.slice(0, 2).map((task) => (
                          <button
                            key={task.id}
                            onClick={() => setSelectedTaskId(task.id)}
                            className={cn('w-full text-left text-[10px] rounded px-1.5 py-1 border', task.priority === 'ALTA' ? 'border-red-500/30 bg-red-900/20 text-red-200' : task.priority === 'MEDIA' ? 'border-blue-500/30 bg-blue-900/20 text-blue-200' : 'border-zinc-500/30 bg-zinc-800/50 text-zinc-200')}
                          >
                            {task.title}
                          </button>
                        ))}
                        {dayTasks.length > 2 ? <p className="text-[10px] text-zinc-500">+{dayTasks.length - 2} tarefa(s)</p> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <aside className="rounded-2xl border border-white/10 bg-[#111111] p-4">
          <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-4">Detalhes da tarefa</h2>
          {selectedTask ? (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">{selectedTask.title}</h3>
              <p className="text-xs text-zinc-500">{selectedTask.sector_name}{selectedTask.subsector_name ? ` - ${selectedTask.subsector_name}` : ''}</p>
              <p className="text-sm text-zinc-200 whitespace-pre-line">{selectedTask.description?.trim() || 'Sem descricao detalhada.'}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-white/10 bg-black/30 p-2"><p className="text-zinc-500">Status</p><p className="text-zinc-100 font-semibold">{statusLabel[selectedTask.status]}</p></div>
                <div className="rounded-lg border border-white/10 bg-black/30 p-2"><p className="text-zinc-500">Prazo</p><p className={cn('font-semibold', isLate(selectedTask.deadline, selectedTask.status) ? 'text-red-300' : 'text-zinc-100')}>{formatDate(selectedTask.deadline)}</p></div>
                <div className="rounded-lg border border-white/10 bg-black/30 p-2"><p className="text-zinc-500">Prioridade</p><p className="text-zinc-100 font-semibold">{priorityText[selectedTask.priority]}</p></div>
                <div className="rounded-lg border border-white/10 bg-black/30 p-2"><p className="text-zinc-500">XP</p><p className="text-zinc-100 font-semibold">{selectedTask.xp_reward ?? 0}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {canEditTask(selectedTask) ? (
                  <button onClick={() => void handleTaskStatusChange(selectedTask, 'CONCLUIDA')} disabled={selectedTask.status === 'CONCLUIDA'} className="px-3 py-2 rounded-lg bg-emerald-700/80 text-white text-xs font-semibold disabled:opacity-50 inline-flex justify-center items-center gap-1"><CheckCircle2 className="w-3 h-3" />Concluir</button>
                ) : (
                  <span className="px-3 py-2 rounded-lg border border-white/10 text-zinc-500 text-xs inline-flex justify-center items-center">Sem permissao de edicao</span>
                )}
                {isCoordinatorProfile ? (
                  <Link to={`/coordinator/campaign/${id}/sector/${selectedTask.sector_slug}/rh`} className="px-3 py-2 rounded-lg border border-white/10 text-zinc-200 text-xs font-semibold inline-flex justify-center items-center gap-1"><Users className="w-3 h-3" />Ver RH</Link>
                ) : (
                  <span className="px-3 py-2 rounded-lg border border-white/10 text-zinc-500 text-xs inline-flex justify-center items-center">Painel RH indisponivel</span>
                )}
              </div>
            </div>
          ) : (
            <EmptyState icone={<Target className="w-5 h-5" />} titulo="Nenhuma tarefa selecionada" subtitulo="Clique em uma tarefa para ver detalhes." />
          )}
        </aside>
      </section>
    </div>
  );
};




























