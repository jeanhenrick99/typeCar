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
- 5 palavras seguidas sem erro ativam o **nitro**.
- A corrida termina quando você ou um rival cruza a linha de chegada.
- 4 pistas com cenário e clima próprios: Neon City (noite chuvosa), Sunset Coast (pôr do sol no mar), Solar Desert (deserto com poeira) e Arctic Ring (neve e aurora boreal). Escolha na Garagem.
- **Esc** sai da corrida, **Enter** na tela de resultado corre de novo.

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
  lib/               áudio (Web Audio sintetizado), Supabase, ranking, armazenamento
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

Para ativar o ranking global e o login por e-mail com Supabase:

1. Crie um projeto no Supabase e rode `supabase/schema.sql` no SQL Editor.
2. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Reinicie o `npm run dev`.

## Tecnologias

React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Canvas 2D, Web Audio API, Supabase.
