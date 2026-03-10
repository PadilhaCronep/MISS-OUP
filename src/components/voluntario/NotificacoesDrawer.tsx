import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, Check, ExternalLink, Clock, Target, Award, UserPlus, Star, Trophy } from 'lucide-react';
import { useAuth } from '../AuthContext.tsx';
import { useNotificacoes } from '../../hooks/useNotificacoes.ts';
import { ErrorState } from '../ui/ErrorState.tsx';

export const NotificacoesDrawer: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  const {
    notifications,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    load,
  } = useNotificacoes(user?.id ?? null, {
    enabled: isOpen,
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'TAREFA_ATRIBUIDA': return <Target className="w-5 h-5 text-blue-500" />;
      case 'TAREFA_PRAZO': return <Clock className="w-5 h-5 text-orange-500" />;
      case 'AVALIACAO_DISPONIVEL': return <Award className="w-5 h-5 text-purple-500" />;
      case 'CONVITE_SETOR': return <UserPlus className="w-5 h-5 text-green-500" />;
      case 'PROMOCAO_FUNCAO': return <Star className="w-5 h-5 text-yellow-500" />;
      case 'META_ATINGIDA': return <Trophy className="w-5 h-5 text-yellow-600" />;
      default: return <Bell className="w-5 h-5 text-zinc-400" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[70] flex flex-col"
          >
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-6 h-6 text-zinc-900" />
                <h2 className="text-xl font-bold text-zinc-900">Notificacoes</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void markAllAsRead()}
                  className="text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
                >
                  Marcar todas como lidas
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                  aria-label="Fechar notificacoes"
                >
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
                  <div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin mb-4" />
                  <p>Carregando notificacoes...</p>
                </div>
              ) : error ? (
                <ErrorState mensagem={error} onRetry={() => void load()} compact />
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-zinc-400 text-center px-8">
                  <Bell className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-zinc-500 font-medium">Tudo limpo por aqui!</p>
                  <p className="text-sm">Voce nao tem novas notificacoes no momento.</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    layout
                    className={`p-4 rounded-2xl border transition-all ${
                      notification.is_read ? 'bg-white border-zinc-100' : 'bg-zinc-50 border-zinc-200 shadow-sm'
                    }`}
                  >
                    <div className="flex gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        notification.is_read ? 'bg-zinc-100' : 'bg-white'
                      }`}>
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className={`text-sm font-bold truncate ${notification.is_read ? 'text-zinc-600' : 'text-zinc-900'}`}>
                            {notification.title}
                          </h3>
                          {!notification.is_read && (
                            <button
                              onClick={() => void markAsRead(notification.id)}
                              className="p-1 hover:bg-zinc-200 rounded-full transition-colors"
                              title="Marcar como lida"
                              aria-label="Marcar notificacao como lida"
                            >
                              <Check className="w-3 h-3 text-zinc-400" />
                            </button>
                          )}
                        </div>
                        <p className={`text-sm mt-1 ${notification.is_read ? 'text-zinc-400' : 'text-zinc-600'}`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
                            {new Date(notification.created_at).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {notification.action_link && (
                            <a
                              href={notification.action_link}
                              className="text-xs font-bold text-zinc-900 flex items-center gap-1 hover:underline"
                            >
                              Ver detalhes
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
