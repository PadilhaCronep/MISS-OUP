import React, { useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { apiClient } from '../../../lib/api-client.ts';
import { useToast } from '../../ui/ToastProvider.tsx';
import { ErrorState } from '../../ui/ErrorState.tsx';

type Etapa = 1 | 2 | 3;

type PretendeVotar = 'SIM' | 'NAO' | 'TALVEZ' | 'NR';

type Sexo = 'M' | 'F' | 'NB' | 'NI';

interface QuestionarioForm {
  cidade: string;
  estado: string;
  idade: number | '';
  sexo: Sexo;
  escolaridade: string;
  acesso_internet: boolean;
  usa_redes_sociais: string[];
  joga_videogame: boolean;
  plataformas_jogo: string[];
  conhece_candidata: boolean;
  simpatia_candidata: number;
  pretende_votar: PretendeVotar;
  e_lider_comunidade: boolean;
  tipo_comunidade: string;
  preocupacao_principal: string;
}

interface ResumoQuestionario {
  total_respostas: number;
  idade_media: number | null;
  tem_internet: number;
  joga_games: number;
  conhece_candidata: number;
  simpatia_media: number | null;
  vai_votar: number;
  lideres_identificados: number;
  preoc_emprego: number;
  preoc_educacao: number;
  preoc_seguranca: number;
}

const REDES = ['Instagram', 'TikTok', 'YouTube', 'X', 'Facebook', 'WhatsApp'];
const PLATAFORMAS = ['Mobile', 'PC', 'PS5', 'Xbox', 'Nintendo'];

const initialForm: QuestionarioForm = {
  cidade: '',
  estado: 'SP',
  idade: '',
  sexo: 'NI',
  escolaridade: '',
  acesso_internet: true,
  usa_redes_sociais: [],
  joga_videogame: false,
  plataformas_jogo: [],
  conhece_candidata: false,
  simpatia_candidata: 0,
  pretende_votar: 'NR',
  e_lider_comunidade: false,
  tipo_comunidade: '',
  preocupacao_principal: '',
};

export const FormularioQuestionario: React.FC = () => {
  const toast = useToast();
  const [etapa, setEtapa] = useState<Etapa>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumo, setResumo] = useState<ResumoQuestionario | null>(null);
  const [form, setForm] = useState<QuestionarioForm>(initialForm);

  const podeAvancarEtapa1 = useMemo(() => {
    return form.cidade.trim().length >= 2 && form.estado.trim().length === 2;
  }, [form.cidade, form.estado]);

  const toggleArrayValue = (arr: string[], value: string): string[] => {
    if (arr.includes(value)) return arr.filter((item) => item !== value);
    return [...arr, value];
  };

  const carregarResumoCidade = async (cidade: string, estado: string): Promise<void> => {
    const result = await apiClient.get<{ resumo: ResumoQuestionario }>(
      `/api/inteligencia/questionario/resumo/${encodeURIComponent(cidade)}?estado=${estado}`,
    );

    if (result.error || !result.data) return;
    setResumo(result.data.resumo ?? null);
  };

  const enviar = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    const payload = {
      ...form,
      idade: form.idade === '' ? undefined : Number(form.idade),
      tipo_comunidade: form.tipo_comunidade || undefined,
      preocupacao_principal: form.preocupacao_principal || undefined,
      escolaridade: form.escolaridade || undefined,
    };

    const result = await apiClient.post<{ sucesso: boolean; mensagem: string }>('/api/inteligencia/questionario', payload);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    toast.success('Questionario salvo com sucesso.');
    await carregarResumoCidade(form.cidade, form.estado);
    setForm(initialForm);
    setEtapa(1);
    setLoading(false);
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-[#1A1A1A] p-5 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white">Questionario de Campo</h2>
        <p className="text-xs text-gray-400">Etapa {etapa} de 3</p>
      </div>

      {error ? <ErrorState mensagem={error} onRetry={() => void enviar()} compact /> : null}

      {etapa === 1 && (
        <div className="grid md:grid-cols-2 gap-3">
          <label className="text-sm text-gray-300">
            Cidade
            <input
              value={form.cidade}
              onChange={(event) => setForm((prev) => ({ ...prev, cidade: event.target.value }))}
              className="mt-1 w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-white"
            />
          </label>

          <label className="text-sm text-gray-300">
            Estado (UF)
            <input
              value={form.estado}
              maxLength={2}
              onChange={(event) => setForm((prev) => ({ ...prev, estado: event.target.value.toUpperCase() }))}
              className="mt-1 w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-white"
            />
          </label>

          <label className="text-sm text-gray-300">
            Idade
            <input
              type="number"
              value={form.idade}
              onChange={(event) => {
                const value = event.target.value;
                setForm((prev) => ({ ...prev, idade: value === '' ? '' : Number(value) }));
              }}
              className="mt-1 w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-white"
            />
          </label>

          <label className="text-sm text-gray-300">
            Sexo
            <select
              value={form.sexo}
              onChange={(event) => setForm((prev) => ({ ...prev, sexo: event.target.value as Sexo }))}
              className="mt-1 w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-white"
            >
              <option value="NI">Nao informar</option>
              <option value="F">Feminino</option>
              <option value="M">Masculino</option>
              <option value="NB">Nao-binario</option>
            </select>
          </label>

          <label className="text-sm text-gray-300 md:col-span-2">
            Escolaridade
            <input
              value={form.escolaridade}
              onChange={(event) => setForm((prev) => ({ ...prev, escolaridade: event.target.value }))}
              className="mt-1 w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-white"
            />
          </label>
        </div>
      )}

      {etapa === 2 && (
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={form.acesso_internet}
              onChange={(event) => setForm((prev) => ({ ...prev, acesso_internet: event.target.checked }))}
            />
            Possui acesso a internet
          </label>

          <div>
            <p className="text-sm text-gray-300 mb-2">Redes sociais usadas</p>
            <div className="flex flex-wrap gap-2">
              {REDES.map((rede) => (
                <button
                  key={rede}
                  onClick={() => setForm((prev) => ({ ...prev, usa_redes_sociais: toggleArrayValue(prev.usa_redes_sociais, rede) }))}
                  className={`px-3 py-1 rounded-full border text-xs ${
                    form.usa_redes_sociais.includes(rede)
                      ? 'bg-[#F5C400] text-black border-[#F5C400]'
                      : 'bg-black/30 text-gray-300 border-white/10'
                  }`}
                >
                  {rede}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={form.joga_videogame}
              onChange={(event) => setForm((prev) => ({ ...prev, joga_videogame: event.target.checked }))}
            />
            Joga videogame
          </label>

          {form.joga_videogame && (
            <div>
              <p className="text-sm text-gray-300 mb-2">Plataformas de jogo</p>
              <div className="flex flex-wrap gap-2">
                {PLATAFORMAS.map((plataforma) => (
                  <button
                    key={plataforma}
                    onClick={() => setForm((prev) => ({ ...prev, plataformas_jogo: toggleArrayValue(prev.plataformas_jogo, plataforma) }))}
                    className={`px-3 py-1 rounded-full border text-xs ${
                      form.plataformas_jogo.includes(plataforma)
                        ? 'bg-[#F5C400] text-black border-[#F5C400]'
                        : 'bg-black/30 text-gray-300 border-white/10'
                    }`}
                  >
                    {plataforma}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {etapa === 3 && (
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={form.conhece_candidata}
              onChange={(event) => setForm((prev) => ({ ...prev, conhece_candidata: event.target.checked }))}
            />
            Conhece a candidata
          </label>

          <label className="text-sm text-gray-300 block">
            Simpatia com candidata (0 a 5)
            <input
              type="range"
              min={0}
              max={5}
              step={1}
              value={form.simpatia_candidata}
              onChange={(event) => setForm((prev) => ({ ...prev, simpatia_candidata: Number(event.target.value) }))}
              className="mt-1 w-full"
            />
            <span className="text-xs text-[#F5C400]">{form.simpatia_candidata}</span>
          </label>

          <label className="text-sm text-gray-300 block">
            Intencao de voto
            <select
              value={form.pretende_votar}
              onChange={(event) => setForm((prev) => ({ ...prev, pretende_votar: event.target.value as PretendeVotar }))}
              className="mt-1 w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-white"
            >
              <option value="NR">Nao respondeu</option>
              <option value="SIM">Sim</option>
              <option value="TALVEZ">Talvez</option>
              <option value="NAO">Nao</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={form.e_lider_comunidade}
              onChange={(event) => setForm((prev) => ({ ...prev, e_lider_comunidade: event.target.checked }))}
            />
            E lider comunitario
          </label>

          <label className="text-sm text-gray-300 block">
            Tipo de comunidade
            <input
              value={form.tipo_comunidade}
              onChange={(event) => setForm((prev) => ({ ...prev, tipo_comunidade: event.target.value }))}
              className="mt-1 w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-white"
            />
          </label>

          <label className="text-sm text-gray-300 block">
            Preocupacao principal
            <input
              value={form.preocupacao_principal}
              onChange={(event) => setForm((prev) => ({ ...prev, preocupacao_principal: event.target.value }))}
              className="mt-1 w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-white"
            />
          </label>
        </div>
      )}

      <div className="flex justify-between items-center">
        <button
          onClick={() => setEtapa((prev) => (prev > 1 ? ((prev - 1) as Etapa) : prev))}
          disabled={etapa === 1 || loading}
          className="px-4 py-2 rounded-md border border-white/10 text-gray-300 disabled:opacity-50"
        >
          Voltar
        </button>

        {etapa < 3 ? (
          <button
            onClick={() => setEtapa((prev) => (prev < 3 ? ((prev + 1) as Etapa) : prev))}
            disabled={(etapa === 1 && !podeAvancarEtapa1) || loading}
            className="px-4 py-2 rounded-md bg-[#F5C400] text-black font-semibold disabled:opacity-50"
          >
            Avancar
          </button>
        ) : (
          <button
            onClick={() => void enviar()}
            disabled={loading}
            aria-busy={loading}
            className="px-4 py-2 rounded-md bg-[#F5C400] text-black font-semibold disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar questionario'}
          </button>
        )}
      </div>

      {resumo ? (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3">
          <p className="text-sm text-green-300 font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Resumo da cidade
          </p>
          <div className="mt-2 text-xs text-gray-300 grid md:grid-cols-3 gap-2">
            <p>Total respostas: {resumo.total_respostas ?? 0}</p>
            <p>Idade media: {resumo.idade_media ? resumo.idade_media.toFixed(1) : '-'}</p>
            <p>Conhece candidata: {resumo.conhece_candidata ?? 0}</p>
            <p>Tem internet: {resumo.tem_internet ?? 0}</p>
            <p>Joga games: {resumo.joga_games ?? 0}</p>
            <p>Pretende votar (SIM): {resumo.vai_votar ?? 0}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
};
