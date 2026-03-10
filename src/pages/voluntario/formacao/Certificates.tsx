import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../components/AuthContext.tsx';
import { motion } from 'motion/react';
import { ChevronLeft, Award, Download, Share2, Lock, CheckCircle2, Trophy } from 'lucide-react';

interface Certificate {
  id: string;
  volunteer_id: string;
  track_id: string;
  verification_code: string;
  issued_at: string;
  track_title: string;
  accent_color: string;
}

interface Track {
  id: string;
  title: string;
  slug: string;
  is_completed: boolean;
  accent_color: string;
}

export const Certificates: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      Promise.all([
        fetch(`/api/formacao/certificados?volunteerId=${user.id}`).then(res => res.json()),
        fetch(`/api/formacao/trilhas?volunteerId=${user.id}`).then(res => res.json())
      ]).then(([certsData, tracksData]) => {
        setCertificates(certsData);
        setTracks(tracksData);
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setLoading(false);
      });
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F5C400]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Breadcrumb & Back */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/voluntario/formacao')}
          className="p-2 rounded-full hover:bg-zinc-100 transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-zinc-600" />
        </button>
        <div className="flex items-center gap-2 text-sm font-bold text-zinc-400 uppercase tracking-widest">
          <Link to="/voluntario/formacao" className="hover:text-[#F5C400]">Formação</Link>
          <span>/</span>
          <span className="text-zinc-900">Meus Certificados</span>
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-black text-zinc-900 flex items-center gap-3">
          <Award className="w-10 h-10 text-[#F5C400]" />
          Meus Certificados
        </h1>
        <p className="text-zinc-500 mt-2">Sua coleção de conquistas e capacitações no movimento</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {certificates.map(cert => (
          <motion.div 
            key={cert.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-white rounded-3xl overflow-hidden border border-zinc-200 shadow-lg hover:shadow-xl transition-all"
          >
            <div className="h-3 w-full" style={{ backgroundColor: cert.accent_color }} />
            
            <div className="p-8 space-y-8">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-zinc-900 text-[#F5C400] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tighter">Certificado de Conclusão</h2>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Movimento Missão</p>
              </div>

              <div className="text-center space-y-1">
                <p className="text-xs text-zinc-500">Certificamos que</p>
                <p className="text-2xl font-black text-zinc-900">{user?.name}</p>
                <p className="text-xs text-zinc-500">concluiu com êxito a trilha de formação</p>
                <p className="text-lg font-black text-zinc-900">"{cert.track_title}"</p>
              </div>

              <div className="flex justify-between items-end pt-4 border-t border-zinc-100">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-zinc-400 uppercase">Emitido em</p>
                  <p className="text-xs font-bold text-zinc-700">{new Date(cert.issued_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[10px] font-black text-zinc-400 uppercase">Código de Verificação</p>
                  <p className="text-[10px] font-mono font-bold text-zinc-700">{cert.verification_code}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all">
                  <Download className="w-4 h-4" /> Baixar PDF
                </button>
                <button className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-all">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Locked Certificates */}
        {tracks.filter(t => !t.is_completed).map(track => (
          <div 
            key={track.id}
            className="relative bg-zinc-50 rounded-3xl overflow-hidden border-2 border-dashed border-zinc-200 p-8 flex flex-col items-center justify-center text-center space-y-4 opacity-70"
          >
            <div className="w-16 h-16 bg-zinc-100 text-zinc-300 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-zinc-400 uppercase tracking-tighter">Certificado Bloqueado</h3>
              <p className="text-xs text-zinc-400">Complete a trilha "{track.title}" para conquistar este certificado</p>
            </div>
            <Link 
              to={`/voluntario/formacao/trilha/${track.slug}`}
              className="text-[#F5C400] text-sm font-black hover:underline"
            >
              Começar trilha agora →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};
