import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { canvasToBlob, CARD_SIZES, renderShareCard, SHARE_URL, type CardData, type CardFormat } from '../lib/shareCard';
import { GameButton } from './GameButton';
import { audio } from '../lib/audio';

interface Props {
  data: CardData;
  onClose: () => void;
}

/** Prévia do card de resultado com opções de compartilhar ou baixar */
export function ShareModal({ data, onClose }: Props) {
  const [format, setFormat] = useState<CardFormat>('story');
  const [card, setCard] = useState<{ url: string; blob: Blob } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let url = '';
    setCard(null);
    renderShareCard(data, format)
      .then(canvasToBlob)
      .then((blob) => {
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setCard({ url, blob });
      })
      .catch(() => alive && setMsg('Não foi possível gerar a imagem.'));
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [data, format]);

  // Esc fecha só o card; Enter não reinicia a corrida por trás
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.stopImmediatePropagation();
        if (e.key === 'Escape') onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const fileName = `typecar-${data.result.wpm}ppm.png`;
  const file = card ? new File([card.blob], fileName, { type: 'image/png' }) : null;
  const canShareFile = !!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

  const download = () => {
    if (!card) return;
    const a = document.createElement('a');
    a.href = card.url;
    a.download = fileName;
    a.click();
    setMsg('Imagem salva! Agora é só postar.');
  };

  const share = async () => {
    if (!file) return;
    try {
      await navigator.share({
        files: [file],
        title: 'TypeCar',
        text: `Fiz ${data.result.wpm} PPM no TypeCar! Consegue me vencer? ${SHARE_URL}`,
      });
    } catch {
      /* o jogador cancelou o compartilhamento */
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="cut-corner glass flex max-h-full w-full max-w-3xl flex-col gap-4 p-4 sm:flex-row sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div
            className="relative h-[min(62vh,640px)] max-w-full overflow-hidden rounded-md bg-asphalt-900 ring-1 ring-white/10 sm:h-[min(78vh,640px)]"
            style={{ aspectRatio: `${CARD_SIZES[format].w} / ${CARD_SIZES[format].h}` }}
          >
            {card ? (
              <img src={card.url} alt="Card do resultado" className="h-full w-full object-contain" />
            ) : (
              <div className="grid h-full w-full place-items-center font-hud text-white/40">Gerando imagem…</div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:w-64">
          <div>
            <p className="font-display text-lg font-black italic">COMPARTILHAR</p>
            <p className="font-hud text-sm text-white/50">Mostre seu resultado no TikTok, Instagram ou WhatsApp.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="hud-label">Formato</p>
            {(Object.keys(CARD_SIZES) as CardFormat[]).map((f) => (
              <button
                key={f}
                onClick={() => {
                  audio.click();
                  setFormat(f);
                }}
                className={`rounded-md px-3 py-2 text-left font-hud text-sm font-semibold transition ${
                  format === f ? 'bg-volt/15 text-volt ring-1 ring-volt' : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {CARD_SIZES[f].label}
              </button>
            ))}
          </div>
          <div className="mt-auto flex flex-col gap-2">
            {canShareFile && (
              <GameButton size="md" onClick={share} disabled={!card}>
                Compartilhar
              </GameButton>
            )}
            <GameButton size="md" variant={canShareFile ? 'secondary' : 'primary'} onClick={download} disabled={!card}>
              Baixar imagem
            </GameButton>
            <GameButton size="md" variant="ghost" onClick={onClose}>
              Fechar
            </GameButton>
            {msg && <p className="text-center font-hud text-sm text-emerald-300">{msg}</p>}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
