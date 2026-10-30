/** Trechos de corrida. Cada corrida sorteia um deles. */
export const RACE_TEXTS: string[] = [
  'O motor ruge na reta principal enquanto o piloto segura firme o volante. Cada curva exige foco total, e um pequeno erro pode custar a vitória.',
  'A chuva começou a cair no meio da prova. Os pneus perderam aderência, mas a equipe confiou no instinto do piloto e manteve a estratégia.',
  'Velocidade sem controle não serve para nada. Os grandes campeões sabem frear no ponto certo e acelerar no instante exato da saída.',
  'As luzes da cidade refletem no asfalto molhado. Na madrugada, a pista vira um rio de neon e só os mais rápidos chegam ao fim.',
  'Treinar todos os dias transforma movimentos difíceis em hábitos naturais. Com paciência, os dedos encontram as teclas sem precisar olhar.',
  'O box anunciou a última volta pelo rádio. Faltavam poucos metros e o rival estava colado no retrovisor, esperando qualquer deslize.',
  'Uma boa largada define o ritmo da corrida inteira. Quem reage primeiro ganha espaço, evita confusão e assume o controle da primeira curva.',
  'Engenheiros analisam dados de telemetria em tempo real. Temperatura, pressão e consumo ajudam a decidir quando parar e quando forçar.',
  'O segredo da digitação rápida não é pressa, é precisão. Errar menos significa corrigir menos, e cada correção custa tempo precioso.',
  'O carro azul passou pela chicane sem tocar na zebra. A torcida levantou nas arquibancadas e o narrador gritou o nome do novo líder.',
  'No deserto, o calor faz o ar tremer acima da estrada. A visão engana, mas o piloto experiente confia no traçado que decorou.',
  'Cada segundo conta quando a bandeira quadriculada se aproxima. Respire fundo, mantenha o ritmo e deixe os dedos fazerem o trabalho.',
  'A garagem estava em silêncio antes da prova. Mecânicos revisavam cada parafuso, porque na velocidade máxima nada pode ficar solto.',
  'O vento lateral empurrava o carro para fora da pista. Com correções suaves no volante, ele manteve a linha e ganhou duas posições.',
  'Tecnologia e talento andam juntos nas pistas modernas. O computador sugere o caminho, mas é a coragem humana que decide a ultrapassagem.',
  'A ponte iluminada marcava a metade do circuito urbano. Depois dela vinha a descida mais rápida, onde os freios trabalhavam no limite.',
  'Nenhuma vitória chega por acaso. Por trás de cada troféu existem horas de treino, noites sem dormir e muita vontade de melhorar.',
  'O semáforo apagou e os motores explodiram em som. Fumaça branca subiu dos pneus enquanto os carros disparavam rumo à primeira curva.',
];

function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Monta o texto da corrida com aproximadamente `targetChars` caracteres,
 * juntando trechos sorteados e cortando de preferência no fim de uma frase.
 */
export function buildRaceText(targetChars: number): string {
  const target = Math.max(60, Math.round(targetChars));
  let text = '';
  let pool: string[] = [];
  while (text.length < target * 1.3) {
    if (pool.length === 0) pool = shuffled(RACE_TEXTS);
    text += (text ? ' ' : '') + pool.pop()!;
  }

  // Fim de frase mais próximo do alvo, dentro de uma margem de 25%
  let best = -1;
  const re = /[.!?](?=\s|$)/g;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const end = m.index + 1;
    if (end >= target * 0.75 && end <= target * 1.25 && (best < 0 || Math.abs(end - target) < Math.abs(best - target))) best = end;
  }
  if (best > 0) return text.slice(0, best);

  // Sem frase adequada: corta no espaço mais próximo e fecha com ponto
  const cut = text.lastIndexOf(' ', target);
  return text.slice(0, cut > 0 ? cut : target).replace(/[,;:]$/, '') + '.';
}
