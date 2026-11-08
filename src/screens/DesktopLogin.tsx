import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { sendCredentialToApp } from '../lib/desktopAuth';
import { Logo } from '../components/Logo';
import { GameButton } from '../components/GameButton';

/**
 * Página aberta no navegador do sistema pelo app desktop: faz o login com
 * Google aqui (onde o Google aceita) e entrega o token ao app.
 */
export function DesktopLogin() {
  const nonce = new URLSearchParams(window.location.search).get('nonce') ?? '';
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const login = async () => {
    if (!auth || !nonce) return;
    setState('busy');
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const cred = GoogleAuthProvider.credentialFromResult(result);
      await sendCredentialToApp(nonce, cred?.idToken, cred?.accessToken);
      // o login fica só no app; o navegador não precisa continuar conectado
      await signOut(auth);
      setState('done');
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      if (code === 'auth/popup-closed-by-user') return setState('idle');
      setMsg(code || (e as Error).message);
      setState('error');
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-asphalt-950 p-6 text-center">
      <div className="cut-corner glass flex max-w-md flex-col items-center gap-5 px-8 py-10">
        <Logo />
        {state === 'done' ? (
          <>
            <p className="font-display text-xl font-black italic text-emerald-300">PRONTO!</p>
            <p className="font-hud text-white/70">Você já está conectado no app TypeCar. Pode fechar esta aba e voltar ao jogo.</p>
          </>
        ) : (
          <>
            <p className="font-hud text-lg text-white/75">Entre com sua conta Google para conectar o app TypeCar do seu computador.</p>
            <GameButton onClick={login} disabled={state === 'busy' || !nonce}>
              {state === 'busy' ? 'Conectando…' : 'Entrar com Google'}
            </GameButton>
            {!nonce && <p className="font-hud text-sm text-amber-300">Abra esta página pelo botão de login do app.</p>}
            {state === 'error' && <p className="font-hud text-sm text-amber-300">Não foi possível conectar: {msg}</p>}
          </>
        )}
      </div>
    </div>
  );
}
