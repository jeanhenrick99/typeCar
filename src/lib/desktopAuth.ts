import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from './firebase';

/**
 * Login no app desktop (.exe): o Google não aceita entrar dentro do app,
 * então o login acontece no navegador do sistema, numa página servida pelo
 * próprio app (http://localhost). Essa página entrega o token ao servidor
 * local do app, e a janela do jogo entra com ele.
 */

const KEY = 'typecar:desktop';

/** O app desktop abre o jogo com ?app=desktop; guarda isso e limpa o endereço */
export function detectDesktop() {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('app') === 'desktop') {
      sessionStorage.setItem(KEY, '1');
      url.searchParams.delete('app');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  } catch {
    /* sem armazenamento: segue como site */
  }
}

export function isDesktop(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/** Abre o login no navegador e espera o token chegar (até 3 minutos) */
export async function desktopSignIn(): Promise<void> {
  if (!auth) throw new Error('offline');
  const nonce = crypto.randomUUID();
  window.open(`${window.location.origin}/desktop-login?nonce=${nonce}`, '_blank');
  const until = Date.now() + 180_000;
  while (Date.now() < until) {
    await new Promise((r) => setTimeout(r, 1000));
    const res = await fetch(`/__desktop/credential?nonce=${nonce}`).catch(() => null);
    if (res?.status === 200) {
      const { idToken, accessToken } = (await res.json()) as { idToken?: string; accessToken?: string };
      await signInWithCredential(auth, GoogleAuthProvider.credential(idToken ?? null, accessToken ?? null));
      return;
    }
  }
  throw Object.assign(new Error('Tempo esgotado'), { code: 'auth/timeout' });
}

/** Na página aberta no navegador: entrega o token ao app */
export async function sendCredentialToApp(nonce: string, idToken: string | undefined, accessToken: string | undefined) {
  const res = await fetch(`/__desktop/credential?nonce=${encodeURIComponent(nonce)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, accessToken }),
  });
  if (!res.ok) throw new Error('O app não recebeu o login');
}
