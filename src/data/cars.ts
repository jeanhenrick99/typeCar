import type { CarModel, CarModelId } from '../types';

/** `signature` é a cor original da arte: escolhê-la mantém a pintura da imagem */
export const CAR_MODELS: CarModel[] = [
  {
    id: 'raptor',
    name: 'Raptor V12',
    signature: '#ffc400',
    tagline: 'Hipercarro V12 preto com filetes amarelos e faróis em Y. Muda a cor dos detalhes.',
    stats: { aceleracao: 10, velocidade: 9, controle: 7 },
  },
  {
    id: 'kaze',
    name: 'Kaze RS',
    signature: '#1f4bff',
    tagline: 'Lenda japonesa dos anos 90 com faixas brancas e aerofólio alto.',
    stats: { aceleracao: 7, velocidade: 8, controle: 10 },
  },
  {
    id: 'rosso',
    name: 'Rosso 90',
    signature: '#e0142d',
    tagline: 'Híbrido italiano de linhas suaves e capô em lâmina. Elegante e brutal.',
    stats: { aceleracao: 10, velocidade: 9, controle: 8 },
  },
  {
    id: 'blaze',
    name: 'Blaze 76',
    signature: '#ff7a00',
    tagline: 'Supercarro leve de pista, com aerofólio ativo e entradas de ar nas portas.',
    stats: { aceleracao: 9, velocidade: 10, controle: 8 },
  },
  {
    id: 'ronin',
    name: 'Ronin RZ',
    signature: '#e9eef7',
    tagline: 'Cupê widebody de motor dianteiro, capô de carbono e asa GT.',
    stats: { aceleracao: 8, velocidade: 8, controle: 9 },
  },
  {
    id: 'spectra',
    name: 'Spectra 72',
    signature: '#7a3cff',
    tagline: 'Cabine em gota, faróis escavados e entradas de ar nas portas.',
    stats: { aceleracao: 9, velocidade: 9, controle: 8 },
  },
];

export const CAR_COLORS: { id: string; name: string; hex: string }[] = [
  { id: 'blaze', name: 'Laranja Blaze', hex: '#ff6a00' },
  { id: 'volt', name: 'Azul Elétrico', hex: '#00b8ff' },
  { id: 'red', name: 'Vermelho Corsa', hex: '#ff1f3d' },
  { id: 'lime', name: 'Verde Ácido', hex: '#7dff3a' },
  { id: 'white', name: 'Branco Gelo', hex: '#e9eef7' },
  { id: 'purple', name: 'Roxo Neon', hex: '#a24bff' },
  { id: 'yellow', name: 'Amarelo Solar', hex: '#ffd000' },
  { id: 'black', name: 'Preto Fosco', hex: '#2a2f3a' },
];

export function getCarModel(id: CarModelId): CarModel {
  return CAR_MODELS.find((c) => c.id === id) ?? CAR_MODELS[0];
}
