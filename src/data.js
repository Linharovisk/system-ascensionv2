export const COLORS = {
  bg: '#04070c',
  panel: '#09111c',
  card: '#0d1826',
  card2: '#101f31',
  border: '#183753',
  accent: '#5aa9ff',
  accent2: '#78dcff',
  text: '#f1f8ff',
  muted: '#829db7',
  success: '#78e7b8',
  danger: '#ff7f91',
  warning: '#ffd578',
  purple: '#b99cff',
};

export const WEEK = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

export const workoutPlan = {
  segunda: {
    title: 'Upper A',
    type: 'training',
    cardio: 'Esteira 20–25 min após a musculação',
    exercises: [
      ['Supino reto', '3×6–8'],
      ['Remada', '3×6–10'],
      ['Supino inclinado', '3×8–12'],
      ['Puxada alta', '3×8–12'],
      ['Elevação lateral', '3×12–20'],
      ['Tríceps corda', '2×10–15'],
      ['Rosca direta', '2×10–15'],
    ],
  },
  terca: {
    title: 'Lower A',
    type: 'training',
    cardio: 'Esteira leve 10–15 min opcional',
    exercises: [
      ['Agachamento / Hack', '3×6–10'],
      ['Stiff / RDL', '3×6–10'],
      ['Leg press', '3×10–15'],
      ['Flexora', '3×10–15'],
      ['Panturrilha', '3×10–15'],
      ['Abdominal', '3 séries'],
    ],
  },
  quarta: {
    title: 'Recuperação',
    type: 'recovery',
    cardio: 'Caminhada leve opcional',
    exercises: [['Recuperação', 'Sono + mobilidade leve']],
  },
  quinta: {
    title: 'Upper B',
    type: 'training',
    cardio: 'Esteira 20–25 min após a musculação',
    exercises: [
      ['Puxada / barra assistida', '3×6–10'],
      ['Supino máquina', '3×8–12'],
      ['Remada baixa', '3×8–12'],
      ['Desenvolvimento máquina', '2×8–12'],
      ['Crucifixo / crossover', '2×10–15'],
      ['Elevação lateral', '3×12–20'],
      ['Rosca', '2×10–15'],
      ['Tríceps', '2×10–15'],
    ],
  },
  sexta: {
    title: 'Lower B',
    type: 'training',
    cardio: 'Esteira leve 10–15 min opcional',
    exercises: [
      ['Hack / agachamento', '3×8–12'],
      ['Levantamento romeno', '3×8–12'],
      ['Extensora', '3×10–15'],
      ['Flexora', '3×10–15'],
      ['Unilateral', '2×8–12 por perna'],
      ['Panturrilha', '3×10–15'],
      ['Abdominal', '3 séries'],
    ],
  },
  sabado: {
    title: 'Recuperação',
    type: 'recovery',
    cardio: 'Caminhada leve opcional',
    exercises: [['Recuperação', 'Mobilidade + descanso']],
  },
  domingo: {
    title: 'Reset semanal',
    type: 'recovery',
    cardio: 'Descanso',
    exercises: [['Reset semanal', 'Preparar a próxima semana']],
  },
};

export const proteins = {
  segunda: 'Frango',
  terca: 'Frango',
  quarta: 'Carne bovina magra',
  quinta: 'Peixe',
  sexta: 'Frango',
  sabado: 'Fígado',
  domingo: 'Almoço livre consciente',
};

export const randomMissions = [
  { title: 'Passos da Dungeon', desc: 'Some 1.500 passos ao seu dia.', xp: 30, coins: 8, stat: 'endurance' },
  { title: 'Poção de Recuperação', desc: 'Beba mais 500 ml de água ao longo do dia.', xp: 20, coins: 5, stat: 'discipline' },
  { title: 'Mobilidade Oculta', desc: 'Faça 8 minutos de mobilidade ou alongamento.', xp: 20, coins: 5, stat: 'endurance' },
  { title: 'Caminhada do Caçador', desc: 'Faça 10 minutos extras de caminhada leve.', xp: 25, coins: 7, stat: 'endurance' },
  { title: 'Registro do Sistema', desc: 'Registre treino, alimentação e como você se sentiu.', xp: 20, coins: 5, stat: 'discipline' },
  { title: 'Sono do Guerreiro', desc: 'Comece sua preparação para dormir 30 minutos mais cedo.', xp: 25, coins: 7, stat: 'discipline' },
];

export const achievements = [
  { id: 'first_quest', title: 'Primeiro Passo', desc: 'Conclua sua primeira tarefa.', coins: 20 },
  { id: 'streak_7', title: 'Disciplina I', desc: 'Alcance 7 dias de sequência.', coins: 70 },
  { id: 'weight_5', title: 'Corpo em Evolução', desc: 'Reduza 5 kg desde o início.', coins: 80 },
  { id: 'level_10', title: 'Despertar II', desc: 'Chegue ao nível 10.', coins: 100 },
  { id: 'workouts_20', title: 'Caçador Persistente', desc: 'Conclua 20 treinos.', coins: 120 },
  { id: 'boss_1', title: 'Boss Slayer', desc: 'Derrote seu primeiro Boss semanal.', coins: 150 },
];

export const defaultRewards = [
  { id: 'game_60', title: '1 hora extra de jogo', cost: 60 },
  { id: 'movie_80', title: 'Noite de filme/série', cost: 80 },
  { id: 'hobby_120', title: 'Tempo livre para hobby', cost: 120 },
  { id: 'small_buy_180', title: 'Comprar algo pequeno planejado', cost: 180 },
];
