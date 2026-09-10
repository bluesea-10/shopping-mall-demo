export const PRODUCT_CATEGORIES = [
  'FIRE',
  'WATER',
  'GRASS',
  'FLY',
  'ELEC',
  'LEGEND',
];

export const NAV_LINKS = [
  ...PRODUCT_CATEGORIES,
  'EVENT',
  'SHOPPING',
  'STORE',
];

const artwork = (id) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

export const HERO_IMAGE = '/images/pokemon-hero.png';

export const NOTICE_ITEMS = [
  {
    id: 1,
    title: '2026 SEASON ARRIVAL',
    desc: '하나씩 모으고 싶은 시즌 포켓몬을 만나보세요.',
    image: artwork(25),
  },
  {
    id: 2,
    title: 'STARTER PICKS',
    desc: 'FIRE · WATER · GRASS 스타터 컬렉션.',
    image: artwork(6),
  },
];

export const FOCUS_ITEMS = [
  {
    id: 1,
    title: 'FIRE TYPE',
    image: artwork(6),
  },
  {
    id: 2,
    title: 'WATER TYPE',
    image: artwork(9),
  },
  {
    id: 3,
    title: 'GRASS TYPE',
    image: artwork(3),
  },
  {
    id: 4,
    title: 'FLY TYPE',
    image: artwork(18),
  },
  {
    id: 5,
    title: 'ELEC TYPE',
    image: artwork(25),
  },
  {
    id: 6,
    title: 'LEGEND TYPE',
    image: artwork(150),
  },
];

export const FAMILY_BRANDS = [
  {
    id: 1,
    name: 'KANTO',
    desc: '클래식 포켓몬 라인',
    image: artwork(1),
  },
  {
    id: 2,
    name: 'JOHTO',
    desc: '골드·실버 컬렉션',
    image: artwork(152),
  },
  {
    id: 3,
    name: 'POKETMON LAND',
    desc: '프리미엄 포켓 숍',
    image: artwork(133),
  },
  {
    id: 4,
    name: 'HOENN',
    desc: '어드벤처 라인',
    image: artwork(252),
  },
];
