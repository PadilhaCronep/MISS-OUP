import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext.tsx';
import { motion } from 'motion/react';
import { Trophy, Lock } from 'lucide-react';

export const BadgesPage: React.FC = () => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<any[]>([]);
  const [userBadges, setUserBadges] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetch('/api/badges')
        .then(res => res.json())
        .then(data => setBadges(data.badges));
      
      fetch(`/api/users/${user.id}/badges`)
        .then(res => res.json())
        .then(data => setUserBadges(data.badges.map((b: any) => b.badge_id)));
    }
  }, [user]);

  const collections = ['DIGITAL', 'TERRITORIAL', 'RECRUITMENT', 'CONSTANCIA', 'LIDERANCA'];

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'COMUM': return 'border-zinc-200 bg-zinc-50';
      case 'RARO': return 'border-blue-200 bg-blue-50';
      case 'EPICO': return 'border-purple-200 bg-purple-50';
      case 'LENDARIO': return 'border-yellow-400 bg-yellow-50 shadow-[0_0_15px_rgba(245,196,0,0.3)]';
      default: return 'border-zinc-200 bg-zinc-50';
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-zinc-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#F5C400] opacity-10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10">
          <h2 className="text-3xl font-bold tracking-tight mb-2">Minhas Conquistas</h2>
          <p className="text-zinc-400">
            Você desbloqueou <span className="text-[#F5C400] font-bold">{userBadges.length}</span> de <span className="text-white font-bold">{badges.length}</span> badges disponíveis.
          </p>
        </div>
      </div>

      <div className="space-y-12">
        {collections.map(collection => {
          const collectionBadges = badges.filter(b => b.collection === collection);
          if (collectionBadges.length === 0) return null;

          const earnedInCollection = collectionBadges.filter(b => userBadges.includes(b.id)).length;

          return (
            <div key={collection}>
              <div className="flex items-center justify-between mb-6 border-b border-zinc-200 pb-2">
                <h3 className="text-xl font-bold text-zinc-900">{collection}</h3>
                <span className="text-sm font-medium text-zinc-500">{earnedInCollection} / {collectionBadges.length}</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {collectionBadges.map((badge, i) => {
                  const isEarned = userBadges.includes(badge.id);
                  return (
                    <motion.div
                      key={badge.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`relative p-6 rounded-2xl border-2 flex flex-col items-center text-center transition-all ${
                        isEarned ? getRarityColor(badge.rarity) : 'border-zinc-100 bg-zinc-50 opacity-60 grayscale'
                      }`}
                    >
                      {!isEarned && (
                        <div className="absolute top-3 right-3 text-zinc-400">
                          <Lock className="w-4 h-4" />
                        </div>
                      )}
                      <div className="text-4xl mb-4">{badge.icon_url}</div>
                      <h4 className="font-bold text-zinc-900 mb-1">{badge.name}</h4>
                      <p className="text-xs text-zinc-500">{badge.description}</p>
                      <span className="mt-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        {badge.rarity}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
