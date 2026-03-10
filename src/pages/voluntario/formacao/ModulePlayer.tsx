import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../components/AuthContext.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, CheckCircle2, Play, Lock, BookOpen, Clock, Star, ArrowRight, Send, HelpCircle, AlertCircle, X, Check } from 'lucide-react';

interface Module {
  id: string;
  track_id: string;
  title: string;
  description: string;
  type: string;
  display_order: number;
  duration_min: number;
  xp_reward: number;
  content: any;
  is_active: boolean;
}

interface Track {
  id: string;
  title: string;
  slug: string;
  modules: { id: string; title: string; is_completed: boolean; display_order: number }[];
}

export const ModulePlayer: React.FC = () => {
  const { trilhaId, moduloId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [module, setModule] = useState<Module | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  
  // Quiz states
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [quizResults, setQuizResults] = useState<{ correct: number; total: number } | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<boolean[]>([]);

  // Practice states
  const [practiceText, setPracticeText] = useState('');
  const [practiceLink, setPracticeLink] = useState('');
  const [submissionType, setSubmissionType] = useState<'TEXT' | 'LINK'>('TEXT');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && moduloId && trilhaId) {
      setLoading(true);
      // Reset states
      setScrollProgress(0);
      setCompleted(false);
      setCurrentQuestionIdx(0);
      setSelectedOption(null);
      setIsAnswered(false);
      setQuizResults(null);
      setQuizAnswers([]);

      Promise.all([
        fetch(`/api/formacao/modulos/${moduloId}`).then(res => res.json()),
        fetch(`/api/formacao/trilhas/${trilhaId}?volunteerId=${user.id}`).then(res => res.json())
      ]).then(([modData, trackData]) => {
        setModule(modData);
        setTrack(trackData);
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setLoading(false);
      });
    }
  }, [user, moduloId, trilhaId]);

  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
        const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
        setScrollProgress(progress);
      }
    };

    const currentRef = contentRef.current;
    if (currentRef) {
      currentRef.addEventListener('scroll', handleScroll);
    }
    return () => currentRef?.removeEventListener('scroll', handleScroll);
  }, [loading]);

  const handleComplete = async (quizScore?: number) => {
    if (!user || !module) return;
    
    try {
      const res = await fetch('/api/formacao/progresso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          volunteerId: user.id,
          moduleId: module.id,
          quizScore,
          timeSpentMin: module.duration_min
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setCompleted(true);
        // Show success toast or something
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleQuizSubmit = () => {
    if (selectedOption === null || !module) return;
    
    const question = module.content.questoes[currentQuestionIdx];
    const isCorrect = selectedOption === question.correta;
    
    setQuizAnswers([...quizAnswers, isCorrect]);
    setIsAnswered(true);
  };

  const nextQuestion = () => {
    if (!module) return;
    
    if (currentQuestionIdx < module.content.questoes.length - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      const correctCount = quizAnswers.filter(a => a).length;
      const total = module.content.questoes.length;
      const score = (correctCount / total) * 100;
      setQuizResults({ correct: correctCount, total });
      
      if (score >= module.content.notaMinimaAprovacao) {
        handleComplete(score);
      }
    }
  };

  const handlePracticeSubmit = async () => {
    setIsSubmitting(true);
    // In a real app, we'd send the actual content. Here we just mark as complete.
    await handleComplete();
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F5C400]"></div>
      </div>
    );
  }

  if (!module || !track) return <div>Módulo não encontrado</div>;

  const nextModule = track.modules.find(m => m.display_order === module.display_order + 1);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] -m-4 md:-m-8 overflow-hidden bg-zinc-50">
      {/* Top Progress Bar */}
      <div className="h-1.5 w-full bg-zinc-200 z-50">
        <motion.div 
          className="h-full bg-[#F5C400]" 
          initial={{ width: 0 }}
          animate={{ width: `${scrollProgress}%` }}
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area */}
        <div ref={contentRef} className="flex-1 overflow-y-auto p-6 md:p-12">
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                <Link to={`/voluntario/formacao/trilha/${track.slug}`} className="hover:text-[#F5C400] flex items-center gap-1">
                  <ChevronLeft className="w-4 h-4" /> {track.title}
                </Link>
                <span>/</span>
                <span className="text-zinc-900">Módulo {module.display_order}</span>
              </div>
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-3xl font-black text-zinc-900">{module.title}</h1>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-zinc-200 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                    {module.type}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    <Clock className="w-3 h-3" /> {module.duration_min} min
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-600">
                    <Star className="w-3 h-3" /> {module.xp_reward} XP
                  </span>
                </div>
              </div>
            </div>

            {/* Content Switcher */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-zinc-100 min-h-[400px]">
              {module.type === 'LEITURA' && (
                <div className="space-y-10">
                  {module.content.secoes.map((secao: any, idx: number) => (
                    <div key={idx} className="space-y-3">
                      <h3 className="text-lg font-black text-[#F5C400] uppercase tracking-wide">{secao.subtitulo}</h3>
                      <p className="text-zinc-700 leading-relaxed text-lg">{secao.texto}</p>
                    </div>
                  ))}

                  <div className="pt-8 border-t border-zinc-100">
                    <div className="bg-zinc-900 rounded-2xl p-6 border-l-4 border-[#F5C400] text-white">
                      <div className="flex items-center gap-2 text-[#F5C400] text-xs font-black uppercase tracking-widest mb-3">
                        <HelpCircle className="w-4 h-4" /> Ponto principal desta aula
                      </div>
                      <p className="text-lg font-medium italic">"{module.content.pontoChave}"</p>
                    </div>
                  </div>

                  <div className="pt-12 flex justify-center">
                    {!completed ? (
                      <button 
                        disabled={scrollProgress < 80}
                        onClick={() => handleComplete()}
                        className={`px-12 py-4 rounded-2xl font-black transition-all ${
                          scrollProgress < 80 
                            ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' 
                            : 'bg-[#F5C400] text-zinc-900 hover:bg-[#e0b300] shadow-xl hover:scale-105'
                        }`}
                      >
                        {scrollProgress < 80 ? 'Role até o final para concluir' : `CONCLUÍ ESTA LEITURA — +${module.xp_reward} XP`}
                      </button>
                    ) : (
                      <div className="text-center space-y-4">
                        <div className="flex items-center justify-center gap-2 text-emerald-600 font-black text-xl">
                          <CheckCircle2 className="w-8 h-8" /> MÓDULO CONCLUÍDO!
                        </div>
                        {nextModule ? (
                          <button 
                            onClick={() => navigate(`/voluntario/formacao/trilha/${track.slug}/modulo/${nextModule.id}`)}
                            className="bg-zinc-900 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-zinc-800 transition-all"
                          >
                            PRÓXIMO MÓDULO <ArrowRight className="w-5 h-5" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => navigate(`/voluntario/formacao/trilha/${track.slug}`)}
                            className="bg-zinc-900 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-zinc-800 transition-all"
                          >
                            VOLTAR PARA A TRILHA
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {module.type === 'QUIZ' && (
                <div className="space-y-8">
                  {!quizResults ? (
                    <div className="space-y-8">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Questão {currentQuestionIdx + 1} de {module.content.questoes.length}</p>
                        <div className="flex gap-1">
                          {module.content.questoes.map((_: any, idx: number) => (
                            <div key={idx} className={`w-8 h-1.5 rounded-full ${idx === currentQuestionIdx ? 'bg-[#F5C400]' : idx < currentQuestionIdx ? 'bg-emerald-500' : 'bg-zinc-100'}`} />
                          ))}
                        </div>
                      </div>

                      <div className="text-center space-y-6">
                        <h2 className="text-2xl font-black text-zinc-900 leading-tight">
                          {module.content.questoes[currentQuestionIdx].pergunta}
                        </h2>
                        
                        <div className="grid grid-cols-1 gap-3">
                          {module.content.questoes[currentQuestionIdx].alternativas.map((alt: string, idx: number) => {
                            const isSelected = selectedOption === idx;
                            const isCorrect = idx === module.content.questoes[currentQuestionIdx].correta;
                            
                            let cardClass = "border-2 p-4 rounded-2xl text-left font-bold transition-all ";
                            if (isAnswered) {
                              if (isCorrect) cardClass += "border-emerald-500 bg-emerald-50 text-emerald-700 ";
                              else if (isSelected) cardClass += "border-red-500 bg-red-50 text-red-700 ";
                              else cardClass += "border-zinc-100 text-zinc-400 ";
                            } else {
                              if (isSelected) cardClass += "border-[#F5C400] bg-amber-50 text-zinc-900 ";
                              else cardClass += "border-zinc-100 hover:border-[#F5C400] text-zinc-600 ";
                            }

                            return (
                              <button 
                                key={idx}
                                disabled={isAnswered}
                                onClick={() => setSelectedOption(idx)}
                                className={cardClass}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 ${
                                    isSelected ? 'border-current' : 'border-zinc-200'
                                  }`}>
                                    {String.fromCharCode(65 + idx)}
                                  </div>
                                  {alt}
                                  {isAnswered && isCorrect && <Check className="w-5 h-5 ml-auto" />}
                                  {isAnswered && isSelected && !isCorrect && <X className="w-5 h-5 ml-auto" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {isAnswered && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-4 rounded-2xl border-l-4 ${
                            selectedOption === module.content.questoes[currentQuestionIdx].correta 
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-800' 
                              : 'bg-red-50 border-red-500 text-red-800'
                          }`}
                        >
                          <p className="text-sm font-bold mb-1">
                            {selectedOption === module.content.questoes[currentQuestionIdx].correta ? '✅ Correto!' : '❌ Ops, não foi dessa vez.'}
                          </p>
                          <p className="text-xs">{module.content.questoes[currentQuestionIdx].explicacao}</p>
                        </motion.div>
                      )}

                      <div className="flex justify-center">
                        {!isAnswered ? (
                          <button 
                            disabled={selectedOption === null}
                            onClick={handleQuizSubmit}
                            className={`px-12 py-4 rounded-2xl font-black transition-all ${
                              selectedOption === null 
                                ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' 
                                : 'bg-[#F5C400] text-zinc-900 hover:bg-[#e0b300] shadow-lg'
                            }`}
                          >
                            CONFIRMAR RESPOSTA
                          </button>
                        ) : (
                          <button 
                            onClick={nextQuestion}
                            className="bg-zinc-900 text-white px-12 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-zinc-800 transition-all"
                          >
                            {currentQuestionIdx < module.content.questoes.length - 1 ? 'PRÓXIMA QUESTÃO' : 'VER RESULTADO'} <ArrowRight className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-8 py-8">
                      <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto ${
                        (quizResults.correct / quizResults.total) * 100 >= module.content.notaMinimaAprovacao 
                          ? 'bg-emerald-100 text-emerald-600' 
                          : 'bg-red-100 text-red-600'
                      }`}>
                        { (quizResults.correct / quizResults.total) * 100 >= module.content.notaMinimaAprovacao ? <Trophy className="w-12 h-12" /> : <AlertCircle className="w-12 h-12" /> }
                      </div>

                      <div className="space-y-2">
                        <h2 className="text-3xl font-black text-zinc-900">
                          {(quizResults.correct / quizResults.total) * 100 >= module.content.notaMinimaAprovacao ? 'Aprovado!' : 'Quase lá!'}
                        </h2>
                        <p className="text-zinc-500">Você acertou <span className="font-bold text-zinc-900">{quizResults.correct} de {quizResults.total}</span> questões.</p>
                        <p className="text-4xl font-black text-[#F5C400]">{Math.round((quizResults.correct / quizResults.total) * 100)}%</p>
                      </div>

                      {(quizResults.correct / quizResults.total) * 100 >= module.content.notaMinimaAprovacao ? (
                        <div className="space-y-4">
                          <p className="text-emerald-600 font-bold">+{module.xp_reward} XP conquistados!</p>
                          {nextModule ? (
                            <button 
                              onClick={() => navigate(`/voluntario/formacao/trilha/${track.slug}/modulo/${nextModule.id}`)}
                              className="bg-zinc-900 text-white px-12 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-zinc-800 transition-all mx-auto"
                            >
                              PRÓXIMO MÓDULO <ArrowRight className="w-5 h-5" />
                            </button>
                          ) : (
                            <button 
                              onClick={() => navigate(`/voluntario/formacao/trilha/${track.slug}`)}
                              className="bg-zinc-900 text-white px-12 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-zinc-800 transition-all mx-auto"
                            >
                              VOLTAR PARA A TRILHA
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-red-500 text-sm">Você precisa de {module.content.notaMinimaAprovacao}% para passar.</p>
                          <button 
                            onClick={() => {
                              setQuizResults(null);
                              setCurrentQuestionIdx(0);
                              setSelectedOption(null);
                              setIsAnswered(false);
                              setQuizAnswers([]);
                            }}
                            className="bg-[#F5C400] text-zinc-900 px-12 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-[#e0b300] transition-all mx-auto"
                          >
                            TENTAR NOVAMENTE
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {module.type === 'PRATICA' && (
                <div className="space-y-8">
                  <div className="flex items-center gap-2 text-amber-600 font-black text-xs uppercase tracking-widest">
                    <Star className="w-4 h-4" /> Missão Prática
                  </div>

                  <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-6">
                    <h3 className="text-lg font-black text-amber-800 mb-2">O Desafio</h3>
                    <p className="text-amber-900 leading-relaxed">{module.content.desafio}</p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Critérios de Avaliação</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {module.content.criterios.map((crit: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-xs font-bold text-zinc-600">
                          <div className="w-5 h-5 rounded-full bg-white border border-zinc-200 flex items-center justify-center shrink-0">
                            {idx + 1}
                          </div>
                          {crit}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-zinc-900 rounded-2xl p-6 text-white">
                    <p className="text-xs font-black text-[#F5C400] uppercase tracking-widest mb-2">Dica do Instrutor</p>
                    <p className="text-sm italic text-zinc-300">"{module.content.dica}"</p>
                  </div>

                  {!completed ? (
                    <div className="space-y-6 pt-6 border-t border-zinc-100">
                      <div className="flex gap-4">
                        <button 
                          onClick={() => setSubmissionType('TEXT')}
                          className={`flex-1 py-3 rounded-xl font-bold transition-all ${submissionType === 'TEXT' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500'}`}
                        >
                          Enviar Texto
                        </button>
                        <button 
                          onClick={() => setSubmissionType('LINK')}
                          className={`flex-1 py-3 rounded-xl font-bold transition-all ${submissionType === 'LINK' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500'}`}
                        >
                          Enviar Link
                        </button>
                      </div>

                      {submissionType === 'TEXT' ? (
                        <div className="space-y-2">
                          <textarea 
                            value={practiceText}
                            onChange={(e) => setPracticeText(e.target.value)}
                            placeholder="Escreva sua resposta aqui..."
                            className="w-full h-48 p-4 rounded-2xl bg-zinc-50 border-2 border-zinc-100 focus:border-[#F5C400] outline-none transition-all resize-none"
                          />
                          <div className="flex justify-between text-[10px] font-bold text-zinc-400">
                            <span>Mínimo 100 palavras</span>
                            <span>{practiceText.length} caracteres</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input 
                            type="url"
                            value={practiceLink}
                            onChange={(e) => setPracticeLink(e.target.value)}
                            placeholder="https://link-do-seu-video-ou-post.com"
                            className="w-full p-4 rounded-2xl bg-zinc-50 border-2 border-zinc-100 focus:border-[#F5C400] outline-none transition-all"
                          />
                        </div>
                      )}

                      <button 
                        disabled={isSubmitting || (submissionType === 'TEXT' ? practiceText.length < 50 : !practiceLink)}
                        onClick={handlePracticeSubmit}
                        className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all ${
                          isSubmitting || (submissionType === 'TEXT' ? practiceText.length < 50 : !practiceLink)
                            ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' 
                            : 'bg-[#F5C400] text-zinc-900 hover:bg-[#e0b300] shadow-lg'
                        }`}
                      >
                        {isSubmitting ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-zinc-900"></div>
                        ) : (
                          <>
                            <Send className="w-5 h-5" /> ENVIAR PARA AVALIAÇÃO
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center space-y-6 py-8">
                      <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-10 h-10" />
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-2xl font-black text-zinc-900">Enviado com sucesso!</h2>
                        <p className="text-zinc-500">Sua missão prática foi enviada para avaliação do coordenador. Você receberá <span className="font-bold text-amber-600">+{module.xp_reward} XP</span> assim que for aprovada.</p>
                      </div>
                      <button 
                        onClick={() => navigate(`/voluntario/formacao/trilha/${track.slug}`)}
                        className="bg-zinc-900 text-white px-12 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-zinc-800 transition-all mx-auto"
                      >
                        VOLTAR PARA A TRILHA
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="hidden lg:flex flex-col w-80 bg-white border-l border-zinc-200 p-6 space-y-8">
          <div className="space-y-4">
            <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Sua Trilha</h4>
            <div className="space-y-2">
              <p className="font-bold text-zinc-900">{track.title}</p>
              <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#F5C400]" style={{ width: `${track.modules.filter(m => m.is_completed).length / track.modules.length * 100}%` }} />
              </div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase">
                {track.modules.filter(m => m.is_completed).length} de {track.modules.length} módulos concluídos
              </p>
            </div>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto">
            <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Módulos</h4>
            <div className="space-y-2">
              {track.modules.map((m, idx) => (
                <Link 
                  key={m.id}
                  to={`/voluntario/formacao/trilha/${track.slug}/modulo/${m.id}`}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all border ${
                    m.id === module.id 
                      ? 'bg-amber-50 border-[#F5C400] text-zinc-900' 
                      : m.is_completed 
                        ? 'bg-white border-zinc-100 text-emerald-600' 
                        : 'bg-white border-transparent text-zinc-400'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                    m.id === module.id 
                      ? 'bg-[#F5C400] text-zinc-900' 
                      : m.is_completed 
                        ? 'bg-emerald-100 text-emerald-600' 
                        : 'bg-zinc-100 text-zinc-400'
                  }`}>
                    {m.is_completed ? <Check className="w-3 h-3" /> : idx + 1}
                  </div>
                  <span className="text-xs font-bold truncate">{m.title}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Trophy = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);
