# TypeCar — Corrida de Digitação

Jogo web de digitação competitiva com temática de corrida arcade. Cada letra correta empurra seu carro; seu PPM vira velocidade.

## Rodando

```bash
npm install
npm run dev
```

Abra http://localhost:5173. Para gerar a versão de produção: `npm run build`.

## Como jogar

- **Enter** no menu ou **JOGAR AGORA** inicia a corrida (contagem 3, 2, 1, GO!).
- No menu, escolha o nível dos rivais e a duração média da corrida (30s, 1, 2 ou 3 min). O tamanho do texto é calculado pelo ritmo do rival mais rápido do nível escolhido.
- Digite o texto destacado. Letras corretas ficam verdes, a atual fica em destaque, erros ficam vermelhos.
- Um erro trava o carro até ser apagado com Backspace.
- Digitando sem errar você enche a barra de **nitro** (cerca de 5 palavras). Cheia, ela dispara sozinha e o nitro fica ligado até você errar: enquanto isso, cada letra certa vale 1,5× na pista. Um erro corta o nitro e zera a barra.
- A corrida termina quando você ou um rival cruza a linha de chegada.
- 4 pistas com cenário e clima próprios: Neon City (noite chuvosa), Sunset Coast (pôr do sol no mar), Solar Desert (deserto com poeira) e Arctic Ring (neve e aurora boreal). Escolha na Garagem.
- **Esc** sai da corrida, **Enter** na tela de resultado corre de novo.

## Progressão

- Cada corrida dá **XP**: participação, desempenho (PPM × precisão), posição, bônus sem erros e bônus da primeira corrida do dia.
- Subindo de nível você libera na Garagem pinturas extras, cores de **rodas**, **neon** embaixo do carro e cores da **chama do nitro**.
- Jogar dias seguidos mantém a **sequência** (a chama muda de cor com 3, 7, 14 e 30 dias) e libera itens especiais, como o nitro rosa (3 dias), o neon arco-íris (7) e o nitro arco-íris (14).
- Na tela de resultado, **Compartilhar** gera uma imagem com o carro, o PPM e a posição nos formatos Stories/TikTok (9:16) ou Feed (4:5), pronta para baixar ou enviar pelo celular.
- O progresso fica salvo no navegador.

## Curso de digitação

Na aba **Curso**, 10 lições ensinam a digitar com os dez dedos no teclado ABNT2: posição inicial (ASDF JKLÇ), fileiras de cima e de baixo, maiúsculas com Shift, acentos e textos completos. Durante os exercícios, o teclado virtual destaca a próxima tecla e as mãos mostram qual dedo usar. Cada lição dá até 3 estrelas (precisão e PPM) e libera a próxima. O progresso fica salvo no navegador.

## Arquitetura

```
src/
  game/              lógica pura do jogo, sem React
    TypingEngine.ts    validação de digitação, PPM, precisão, erros, combo
    RaceController.ts  fases (contagem/corrida/fim), IA dos rivais, posições, resultado
    RaceRenderer.ts    cena da corrida em Canvas 2D (câmera, parallax, partículas, faróis)
    carSprites.ts      sprites dos carros vistos de cima (pré-renderizados em cache)
  screens/           Menu, Corrida, Resultado, Garagem, Ranking
  components/        UI reutilizável (botões, HUD, velocímetro, carro em SVG...)
  data/              textos, carros, cores, pistas, dificuldades
  lib/               áudio (Web Audio sintetizado), Firebase, ranking, armazenamento
  state/             perfil do jogador (persistido em localStorage)
```

A cena da corrida usa um renderizador Canvas 2D próprio em vez do Phaser: o bundle fica bem menor (~110 kB gzip no total) e o jogo só precisa de uma câmera lateral com sprites.

## Carros

A arte dos carros são imagens com fundo transparente em `public/cars/`. Para adicionar um carro:

1. Salve a imagem de perfil (frente para a direita, fundo transparente) em `public/cars/<id>.webp`.
2. Em `src/game/carArt.ts`, cadastre o tamanho, o centro e o raio de cada roda (para girarem) e a cor original da pintura (para a troca de cor).
3. Adicione o `id` em `CarModelId` (`src/types.ts`) e o carro em `CAR_MODELS` (`src/data/cars.ts`).

## Ranking online (opcional)

Sem configuração, o jogo funciona offline: perfil e ranking ficam no `localStorage`.

Para ativar o ranking global e o login com Google usando Firebase:

1. Crie um projeto no [Console do Firebase](https://console.firebase.google.com) e registre um app web.
2. Crie um banco **Firestore** e cole o conteúdo de `firestore.rules` na aba **Regras**.
3. (Opcional) Em **Authentication > Método de login**, ative o **Google**.
4. Copie `.env.example` para `.env` e preencha com os valores do `firebaseConfig`.
5. Reinicie o `npm run dev`.

## Tecnologias

React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Canvas 2D, Web Audio API, Firebase.
