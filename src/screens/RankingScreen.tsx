import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { HeroBackground } from '../components/HeroBackground';
import { fetchScores } from '../lib/leaderboard';
import { isOnline } from '../lib/supabase';
import { DIFFICULTIES, getDifficulty } from '../data/difficulties';
import { getCarModel } from '../data/cars';
import { useProfile } from '../state/ProfileContext';
import type { DifficultyId, ScoreEntry } from '../types';

export function RankingScreen() {
  const { profile } = useProfile();
  const [scope, setScope] = useState<'global' | 'local'>(isOnline ? 'global' : 'local');
  const [diff, setDiff] = useState<DifficultyId | 'all'>('all');
  const [scores, setScores] = useState<ScoreEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setScores(null);
    setError(null);
    fetchScores(scope, diff)
      .then((s) => alive && setScores(s))
      .catch((e: Error) => alive && (setError(e.message), setScores([])));
    return () => {
      alive = false;
    };
  }, [scope, diff]);

  const s = profile.stats;
  const personal = [
    { label: 'Recorde PPM', value: s.bestWpm || '—' },
    { label: 'Melhor precisão', value: s.bestAccuracy ? `${s.bestAccuracy.toFixed(1)}%` : '—' },
    { label: 'Vitórias', value: s.wins },
    { label: 'Pódios', value: s.podiums },
    { label: 'Corridas', value: s.races },
    { label: 'Taxa de vitória', value: s.races ? `${Math.round((s.wins / s.races) * 100)}%` : '—' },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <HeroBackground intensity={0.5} />
      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-28 pt-24 sm:px-6 lg:pb-12">
        <motion.h1 initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="font-display text-3xl sm:text-5xl font-black italic">
          RANKING
        </motion.h1>
        <p className="mt-1 font-hud text-lg text-white/50">Os pilotos mais rápidos do teclado.</p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="cut-corner glass overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3">
              {(['global', 'local'] as const).map((sc) => (
                <button
                  key={sc}
                  disabled={sc === 'global' && !isOnline}
                  onClick={() => setScope(sc)}
                  className={`skew-panel px-4 py-1.5 font-display text-[11px] font-bold uppercase tracking-[0.18em] disabled:opacity-30 ${
                    scope === sc ? 'bg-blaze text-white' : 'bg-white/5 text-white/60 hover:text-white'
                  }`}
                  title={sc === 'global' && !isOnline ? 'Configure o Supabase para ativar o ranking global' : undefined}
                >
                  {sc === 'global' ? 'Global' : 'Neste dispositivo'}
                </button>
              ))}
              <span className="mx-1 h-5 w-px bg-white/10" />
              <select
                value={diff}
                onChange={(e) => setDiff(e.target.value as DifficultyId | 'all')}
                className="rounded-md border border-white/15 bg-asphalt-950 px-2 py-1.5 font-hud text-sm font-semibold outline-none focus:border-volt"
              >
                <option value="all">Todos os níveis</option>
                {DIFFICULTIES.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-asphalt-900/95">
                  <tr className="hud-label">
                    <th className="px-4 py-2 font-normal">#</th>
                    <th className="px-2 py-2 font-normal">Piloto</th>
                    <th className="px-2 py-2 text-right font-normal">PPM</th>
                    <th className="hidden px-2 py-2 text-right font-normal sm:table-cell">Precisão</th>
                    <th className="hidden px-2 py-2 text-right font-normal md:table-cell">Tempo</th>
                    <th className="hidden px-4 py-2 font-normal md:table-cell">Nível</th>
                  </tr>
                </thead>
                <tbody>
                  {scores === null && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center font-hud text-white/40">
                        Carregando...
                      </td>
                    </tr>
                  )}
                  {scores?.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center font-hud text-white/40">
                        {error ? `Não foi possível carregar: ${error}` : 'Nenhuma corrida registrada ainda. Complete uma prova para entrar no ranking!'}
                      </td>
                    </tr>
                  )}
                  {scores?.map((e, i) => {
                    const me = e.player === profile.nickname;
                    const medal = ['text-yellow-300', 'text-slate-300', 'text-amber-600'][i];
                    return (
                      <motion.tr
                        key={(e.id ?? '') + e.created_at + i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(i, 15) * 0.03 }}
                        className={`border-t border-white/5 font-hud ${me ? 'bg-volt/10' : ''}`}
                      >
                        <td className={`px-4 py-2.5 font-display text-lg font-black ${medal ?? 'text-white/40'}`}>{i + 1}</td>
                        <td className="px-2 py-2.5">
                          <span className="font-bold tracking-wide">{e.player}</span>
                          <span className="ml-2 text-xs text-white/40">{getCarModel(e.car).name}</span>
                        </td>
                        <td className="px-2 py-2.5 text-right font-display text-lg font-black text-volt">{e.wpm}</td>
                        <td className="hidden px-2 py-2.5 text-right sm:table-cell">{Number(e.accuracy).toFixed(1)}%</td>
                        <td className="hidden px-2 py-2.5 text-right font-mono text-sm md:table-cell">{(e.time_ms / 1000).toFixed(1)}s</td>
                        <td className="hidden px-4 py-2.5 text-sm text-white/60 md:table-cell">{getDifficulty(e.difficulty).name}</td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3">
            <div className="cut-corner glass px-5 py-4">
              <p className="hud-label">Piloto</p>
              <p className="font-display text-2xl font-black italic">{profile.nickname}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {personal.map((p) => (
                <div key={p.label} className="cut-corner glass px-4 py-3">
                  <p className="hud-label">{p.label}</p>
                  <p className="mt-1 font-display text-xl font-black">{p.value}</p>
                </div>
              ))}
            </div>
            {!isOnline && (
              <p className="font-hud text-sm text-white/40">
                Ranking global desativado. Defina <code className="text-white/60">VITE_SUPABASE_URL</code> e{' '}
                <code className="text-white/60">VITE_SUPABASE_ANON_KEY</code> para competir online.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
