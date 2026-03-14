import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../components/AuthContext.tsx';
import { AnimatePresence, motion } from 'motion/react';
import { Target, Zap, Users, Trophy, Flame, Clock, CheckCircle2, X, Upload, GraduationCap, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [trainingTracks, setTrainingTracks] = useState<any[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [selectedMission, setSelectedMission] = useState<any | null>(null);
  const [evidenceContent, setEvidenceContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetch(`/api/users/${user.id}/stats`)
        .then((res) => res.json())
        .then((data) => setStats(data));

      fetch('/api/missions')
        .then((res) => res.json())
        .then((data) => setMissions(data.missions));

      fetch('/api/formacao/trilhas')
        .then((res) => res.json())
        .then((data) => setTrainingTracks(data));
    }
  }, [user]);

  useEffect(() => {
    if (!selectedMission) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedMission]);

  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMission) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/missions/${selectedMission.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidence_content: evidenceContent,
          evidence_url: selectedMission.evidence_type === 'PHOTO' ? 'https://example.com/photo.jpg' : null,
        }),
      });

      if (res.ok) {
        alert('Missao enviada com sucesso!');
        setSelectedMission(null);
        setEvidenceContent('');

        fetch(`/api/users/${user?.id}/stats`)
          .then((result) => result.json())
          .then((data) => setStats(data));
      }
    } catch {
      alert('Erro ao enviar missao.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filterOptions = useMemo(() => {
    const dynamicTypes = Array.from(
      new Set(
        missions
          .map((mission) => String(mission?.type ?? '').trim().toUpperCase())
          .filter(Boolean),
      ),
    );
    return ['ALL', ...dynamicTypes];
  }, [missions]);

  const filteredMissions = useMemo(
    () => (filter === 'ALL' ? missions : missions.filter((mission) => String(mission?.type ?? '').toUpperCase() === filter)),
    [filter, missions],
  );

  const getFilterLabel = (value: string) => {
    switch (value) {
      case 'ALL':
        return 'Todas';
      case 'DIGITAL':
        return 'Digital';
      case 'TERRITORIAL':
        return 'Territorial';
      case 'RECRUITMENT':
      case 'RECRUTAMENTO':
        return 'Recrutamento';
      case 'TRAINING':
      case 'FORMACAO':
        return 'Formacao';
      default:
        return value;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    const normalized = String(urgency ?? '').toUpperCase();
    switch (normalized) {
      case 'URGENTE':
      case 'URGENT':
        return 'border-red-500 bg-red-50 text-red-700';
      case 'PRIORITARIA':
      case 'PRIORITY':
        return 'border-yellow-500 bg-yellow-50 text-yellow-700';
      default:
        return 'border-emerald-500 bg-emerald-50 text-emerald-700';
    }
  };

  const getMissionIcon = (type: string) => {
    const normalized = String(type ?? '').toUpperCase();
    switch (normalized) {
      case 'DIGITAL':
        return <Zap className="w-5 h-5" />;
      case 'TERRITORIAL':
        return <Target className="w-5 h-5" />;
      case 'RECRUITMENT':
      case 'RECRUTAMENTO':
        return <Users className="w-5 h-5" />;
      default:
        return <CheckCircle2 className="w-5 h-5" />;
    }
  };

  if (!stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#F5C400]" />
      </div>
    );
  }

  return (
    <div className="relative space-y-6 md:space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] bg-zinc-900 p-5 text-white shadow-xl sm:p-6 md:p-8"
      >
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#F5C400] opacity-10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4 sm:gap-5 md:gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[#F5C400] bg-zinc-800 text-2xl font-bold text-[#F5C400] shadow-[0_0_15px_rgba(245,196,0,0.3)] md:h-20 md:w-20 md:text-3xl">
              {user?.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{user?.name}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300 sm:text-sm">
                  Nivel {stats.current_level} - Militante
                </span>
                {stats.current_streak > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-400/10 px-3 py-1 text-xs font-bold text-orange-400 sm:text-sm">
                    <Flame className="h-4 w-4" /> {stats.current_streak} dias
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 md:w-72">
            <div className="mb-2 flex items-center justify-between text-xs sm:text-sm">
              <span className="font-medium text-zinc-400">Progresso para Nivel {stats.current_level + 1}</span>
              <span className="font-bold text-[#F5C400]">{stats.xp_total} XP</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
              <div className="h-full rounded-full bg-[#F5C400]" style={{ width: `${(stats.xp_total % 1000) / 10}%` }} />
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {[
          { label: 'XP Total', value: stats.xp_total, icon: Zap, color: 'text-[#F5C400]' },
          { label: 'Missoes', value: stats.missions_completed, icon: Target, color: 'text-emerald-500' },
          { label: 'Recrutados', value: stats.volunteers_recruited, icon: Users, color: 'text-blue-500' },
          { label: 'Ranking Local', value: `#${stats.cityRanking}`, icon: Trophy, color: 'text-violet-500' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:p-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 md:text-sm">{stat.label}</span>
              <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.color}`} />
            </div>
            <span className="text-2xl font-bold text-zinc-900 md:text-3xl">{stat.value}</span>
          </motion.div>
        ))}
      </div>

      {trainingTracks.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6"
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Sua Formacao</h3>
                <p className="text-xs text-zinc-500">Continue evoluindo seu conhecimento</p>
              </div>
            </div>
            <Link to="/voluntario/formacao" className="inline-flex items-center gap-1 text-sm font-bold text-[#F5C400] hover:underline">
              Ver todas <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            {trainingTracks.filter((track) => track.percentage > 0 && track.percentage < 100).length > 0 ? (
              trainingTracks
                .filter((track) => track.percentage > 0 && track.percentage < 100)
                .slice(0, 2)
                .map((track) => (
                  <div key={track.id} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <h4 className="text-sm font-bold text-zinc-900">{track.title}</h4>
                      <span className="text-xs font-black text-[#F5C400]">{Math.round(track.percentage)}%</span>
                    </div>
                    <div className="mb-4 h-2 overflow-hidden rounded-full bg-zinc-200">
                      <div className="h-full bg-[#F5C400]" style={{ width: `${track.percentage}%` }} />
                    </div>
                    <Link
                      to={`/voluntario/formacao/trilha/${track.slug}`}
                      className="block w-full rounded-xl border border-zinc-200 bg-white py-2 text-center text-xs font-bold text-zinc-700 transition-colors hover:bg-zinc-100"
                    >
                      CONTINUAR TRILHA
                    </Link>
                  </div>
                ))
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center md:col-span-2 md:p-8">
                <p className="mb-4 text-sm text-zinc-500">Voce ainda nao comecou nenhuma trilha de formacao.</p>
                <Link
                  to="/voluntario/formacao"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#F5C400] px-6 py-2 text-sm font-bold text-zinc-900 transition-colors hover:bg-[#e0b300]"
                >
                  Comecar agora <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      ) : null}

      <section>
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h3 className="text-2xl font-bold tracking-tight text-zinc-900">Missoes Disponiveis</h3>
          <div className="mobile-chip-scroll flex w-full gap-2 overflow-x-auto pb-1 md:w-auto">
            {filterOptions.map((option) => (
              <button
                key={option}
                onClick={() => setFilter(option)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  filter === option
                    ? 'bg-zinc-900 text-white'
                    : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                {getFilterLabel(option)}
              </button>
            ))}
          </div>
        </div>

        {filteredMissions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white py-12 text-center">
            <Target className="mx-auto mb-4 h-12 w-12 text-zinc-300" />
            <p className="font-medium text-zinc-500">Nenhuma missao disponivel no momento.</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredMissions.map((mission, index) => (
              <motion.article
                key={mission.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.04 }}
                className={`flex cursor-pointer flex-col rounded-2xl border-l-4 border-r border-y border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${getUrgencyColor(mission.urgency).split(' ')[0]}`}
                onClick={() => setSelectedMission(mission)}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
                      {getMissionIcon(mission.type)}
                    </div>
                    <div>
                      <span className={`mb-1 inline-block rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${getUrgencyColor(mission.urgency)}`}>
                        {String(mission.urgency ?? '').toUpperCase() === 'URGENT'
                          ? 'URGENTE'
                          : String(mission.urgency ?? '').toUpperCase() === 'PRIORITY'
                            ? 'PRIORITARIA'
                            : 'CONTINUA'}
                      </span>
                      <h4 className="text-lg font-bold leading-tight text-zinc-900">{mission.title}</h4>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl font-bold text-[#F5C400]">+{mission.xp_reward}</span>
                    <span className="block text-[10px] font-bold uppercase text-zinc-400">XP</span>
                  </div>
                </div>

                <p className="mb-6 flex-1 text-sm text-zinc-600 line-clamp-2">{mission.description}</p>

                <div className="mt-auto flex flex-col gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500">
                    <Clock className="h-4 w-4" />
                    {mission.deadline ? format(new Date(mission.deadline), 'dd MMM, HH:mm', { locale: ptBR }) : 'Sem prazo'}
                  </div>
                  <button className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-zinc-800 sm:w-auto">
                    Aceitar Missao
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </section>

      <AnimatePresence>
        {selectedMission ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[90vh] sm:max-w-lg sm:rounded-3xl"
            >
              <div className="flex items-start justify-between border-b border-zinc-100 bg-zinc-50 p-4 sm:p-6">
                <div>
                  <span className={`mb-2 inline-block rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${getUrgencyColor(selectedMission.urgency)}`}>
                    {String(selectedMission.urgency ?? '').toUpperCase() === 'URGENT'
                      ? 'URGENTE'
                      : String(selectedMission.urgency ?? '').toUpperCase() === 'PRIORITY'
                        ? 'PRIORITARIA'
                        : 'CONTINUA'}
                  </span>
                  <h2 className="text-xl font-bold text-zinc-900 sm:text-2xl">{selectedMission.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedMission(null)}
                  className="rounded-full bg-white p-2 text-zinc-400 shadow-sm transition-colors hover:text-zinc-900"
                  aria-label="Fechar detalhes da missao"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <p className="mb-6 text-base leading-relaxed text-zinc-600 sm:text-lg">{selectedMission.description}</p>

                <div className="mb-6 flex items-center justify-between rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                  <div className="inline-flex items-center gap-3">
                    <Zap className="h-6 w-6 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Recompensa da Missao</span>
                  </div>
                  <span className="text-2xl font-bold text-yellow-600">+{selectedMission.xp_reward} XP</span>
                </div>

                <form onSubmit={handleSubmitEvidence} className="space-y-4">
                  <h3 className="font-bold text-zinc-900">Evidencia Necessaria</h3>

                  {selectedMission.evidence_type === 'TEXT' ? (
                    <textarea
                      required
                      placeholder="Descreva como voce concluiu a missao..."
                      className="min-h-[120px] w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-[#F5C400]"
                      value={evidenceContent}
                      onChange={(event) => setEvidenceContent(event.target.value)}
                    />
                  ) : null}

                  {selectedMission.evidence_type === 'LINK' ? (
                    <input
                      type="url"
                      required
                      placeholder="https://..."
                      className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-[#F5C400]"
                      value={evidenceContent}
                      onChange={(event) => setEvidenceContent(event.target.value)}
                    />
                  ) : null}

                  {selectedMission.evidence_type === 'PHOTO' ? (
                    <div className="cursor-pointer rounded-2xl border-2 border-dashed border-zinc-300 p-8 text-center transition-colors hover:bg-zinc-50">
                      <Upload className="mx-auto mb-2 h-8 w-8 text-zinc-400" />
                      <p className="text-sm font-medium text-zinc-600">Clique para fazer upload da foto</p>
                      <p className="mt-1 text-xs text-zinc-400">PNG, JPG ate 5MB</p>
                    </div>
                  ) : null}

                  {selectedMission.evidence_type === 'NONE' ? (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-center text-sm text-zinc-600">
                      Nenhuma evidencia necessaria. Basta confirmar a conclusao.
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-4 w-full rounded-xl bg-[#F5C400] px-6 py-3.5 font-bold text-zinc-900 shadow-sm transition-colors hover:bg-[#e0b300] disabled:opacity-50"
                  >
                    {isSubmitting ? 'Enviando...' : 'Enviar Evidencia e Concluir'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
