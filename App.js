import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Pressable,
  Platform,
  Animated,
  Alert,
  Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { achievements, COLORS, defaultRewards, proteins, randomMissions, WEEK, workoutPlan } from './src/data';
import { defaultState, loadState, persistState, resetState } from './src/storage';
import {
  applyXp,
  clamp,
  dateKey,
  dayTaskCount,
  monthCalendar,
  parseDateKey,
  rankFor,
  weekDates,
  weekKey,
  xpToLevel,
  yesterdayKey,
} from './src/utils';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const MEAL_IDS = ['breakfast', 'lunch', 'snack', 'pre', 'dinner', 'water'];
const DAY_QUALIFY_COUNT = 4;

function Stat({ label, value, accent = false }) {
  return (
    <View style={[styles.statCard, accent && styles.statCardAccent]}>
      <Text style={styles.mutedSmall}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function ProgressBar({ value, warning = false }) {
  const pct = clamp(Number(value) || 0, 0, 100);
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, warning && styles.progressFillWarning, { width: `${pct}%` }]} />
    </View>
  );
}

function SectionTitle({ eyebrow, title, right }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1, minWidth: 0 }}>
        {!!eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

function CheckRow({ checked, title, subtitle, reward, coins, onPress }) {
  return (
    <TouchableOpacity style={[styles.checkRow, checked && styles.checkRowDone]} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.checkBox, checked && styles.checkBoxDone]}>
        <Text style={styles.checkMark}>{checked ? '✓' : ''}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.checkTitle, checked && styles.doneText]}>{title}</Text>
        {!!subtitle && <Text style={styles.checkSubtitle}>{subtitle}</Text>}
      </View>
      {(reward || coins) ? (
        <View style={{ alignItems: 'flex-end' }}>
          {!!reward && <Text style={styles.reward}>+{reward} XP</Text>}
          {!!coins && <Text style={styles.coinReward}>+{coins} ◇</Text>}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function WeightChart({ history, startWeight }) {
  const points = useMemo(() => {
    const base = Array.isArray(history) ? history.slice(-12) : [];
    if (base.length === 0 && Number.isFinite(startWeight)) {
      return [{ date: dateKey(), weight: startWeight }];
    }
    return base;
  }, [history, startWeight]);

  const width = 320;
  const height = 170;
  const padX = 24;
  const padY = 22;
  const weights = points.map((p) => Number(p.weight)).filter(Number.isFinite);
  const min = weights.length ? Math.min(...weights) : 0;
  const max = weights.length ? Math.max(...weights) : 1;
  const range = Math.max(1, max - min);
  const getX = (i) => points.length <= 1 ? width / 2 : padX + (i * (width - padX * 2)) / (points.length - 1);
  const getY = (w) => padY + ((max - w) * (height - padY * 2)) / range;
  const poly = points.map((p, i) => `${getX(i)},${getY(Number(p.weight))}`).join(' ');

  return (
    <View style={styles.chartWrap}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} accessibilityLabel="Gráfico do histórico de peso">
        <Line x1={padX} x2={width - padX} y1={height - padY} y2={height - padY} stroke={COLORS.border} strokeWidth="1" />
        <Line x1={padX} x2={width - padX} y1={padY} y2={padY} stroke={COLORS.border} strokeWidth="1" />
        {points.length > 1 && <Polyline points={poly} fill="none" stroke={COLORS.accent} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
        {points.map((p, i) => (
          <React.Fragment key={`${p.date}-${i}`}>
            <Circle cx={getX(i)} cy={getY(Number(p.weight))} r="4" fill={COLORS.accent2} />
            {(i === 0 || i === points.length - 1) && (
              <SvgText x={getX(i)} y={Math.max(13, getY(Number(p.weight)) - 9)} fontSize="9" fill={COLORS.text} textAnchor="middle">
                {Number(p.weight).toFixed(1)}
              </SvgText>
            )}
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}

function EventOverlay({ event, anim }) {
  if (!event) return null;
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] });
  return (
    <View style={styles.eventLayer} pointerEvents="none">
      <Animated.View style={[styles.eventCard, { opacity: anim, transform: [{ scale }] }]}>
        <Text style={styles.eventType}>{event.type}</Text>
        <Text style={styles.eventTitle}>{event.title}</Text>
        {!!event.subtitle && <Text style={styles.eventSubtitle}>{event.subtitle}</Text>}
      </Animated.View>
    </View>
  );
}

export default function App() {
  const [state, setState] = useState(defaultState);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState('system');
  const [toast, setToast] = useState('SYSTEM ONLINE');
  const [event, setEvent] = useState(null);
  const [levelUp, setLevelUp] = useState(null);
  const [weightModal, setWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState('123');
  const [loadModal, setLoadModal] = useState(null);
  const [loadKg, setLoadKg] = useState('');
  const [loadReps, setLoadReps] = useState('');
  const [loadNote, setLoadNote] = useState('');
  const [rewardModal, setRewardModal] = useState(false);
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardCost, setRewardCost] = useState('100');
  const [nameInput, setNameInput] = useState('MATHEUS');
  const [onboardStart, setOnboardStart] = useState('123');
  const [onboardGoal, setOnboardGoal] = useState('88');
  const eventAnim = useRef(new Animated.Value(0)).current;
  const previousLevel = useRef(1);

  const now = new Date();
  const today = dateKey(now);
  const dayName = WEEK[now.getDay()];
  const workout = workoutPlan[dayName];
  const player = state.player;
  const dayCompleted = state.completed[today] || {};
  const currentWeekKey = weekKey(now);

  useEffect(() => {
    loadState().then((saved) => {
      const migrated = {
        ...saved,
        shopRewards: saved.shopRewards?.length ? saved.shopRewards : defaultRewards,
      };
      setState(migrated);
      setWeightInput(String(migrated.player.currentWeight));
      setNameInput(migrated.player.name || 'MATHEUS');
      setOnboardStart(String(migrated.player.startWeight || 123));
      setOnboardGoal(String(migrated.player.goalWeight || 88));
      previousLevel.current = migrated.player.level;
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) persistState(state);
  }, [state, loaded]);

  useEffect(() => {
    if (!loaded) return;
    if (player.level > previousLevel.current) {
      setLevelUp(player.level);
      previousLevel.current = player.level;
    } else if (player.level < previousLevel.current) {
      previousLevel.current = player.level;
    }
  }, [player.level, loaded]);

  useEffect(() => {
    if (!event) return;
    eventAnim.stopAnimation();
    eventAnim.setValue(0);
    Animated.sequence([
      Animated.spring(eventAnim, { toValue: 1, useNativeDriver: true, friction: 6, tension: 80 }),
      Animated.delay(1200),
      Animated.timing(eventAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setEvent(null));
  }, [event, eventAnim]);

  const showEvent = (type, title, subtitle) => setEvent({ type, title, subtitle });
  const weightProgressAmount = player.startWeight > player.goalWeight
    ? Math.max(0, player.startWeight - player.currentWeight)
    : Math.max(0, player.currentWeight - player.startWeight);

  const achievementStatus = useMemo(() => ({
    first_quest: state.stats.totalTasks >= 1,
    streak_7: player.streak >= 7,
    weight_5: weightProgressAmount >= 5,
    level_10: player.level >= 10,
    workouts_20: state.stats.workouts >= 20,
    boss_1: state.stats.bosses >= 1,
  }), [state.stats, player, weightProgressAmount]);

  useEffect(() => {
    if (!loaded) return;
    const newly = achievements.filter((a) => achievementStatus[a.id] && !state.unlockedAchievements[a.id]);
    if (!newly.length) return;
    const bonus = newly.reduce((sum, a) => sum + a.coins, 0);
    setState((prev) => ({
      ...prev,
      player: { ...prev.player, coins: prev.player.coins + bonus },
      unlockedAchievements: newly.reduce((acc, a) => ({ ...acc, [a.id]: { date: today } }), { ...prev.unlockedAchievements }),
    }));
    showEvent('ACHIEVEMENT UNLOCKED', newly[0].title, newly.length > 1 ? `+${bonus} moedas • ${newly.length} conquistas` : `+${bonus} moedas`);
  }, [achievementStatus, loaded, state.unlockedAchievements, today]);

  const awardPlayer = (prev, xp, coins = 0, stat = null) => {
    let nextPlayer = applyXp(prev.player, xp);
    nextPlayer = { ...nextPlayer, coins: Math.max(0, nextPlayer.coins + coins) };
    if (stat === 'strength') nextPlayer.strength += 1;
    if (stat === 'endurance') nextPlayer.endurance += 1;
    if (stat === 'discipline') nextPlayer.discipline += 1;
    return nextPlayer;
  };

  const applyDailyStreakIfNeeded = (next) => {
    const count = dayTaskCount(next.completed[today]);
    if (count < DAY_QUALIFY_COUNT || next.rewardedDays[today]) return next;
    const continues = next.lastCompletedDay === yesterdayKey();
    const sameDay = next.lastCompletedDay === today;
    const streak = sameDay ? next.player.streak : continues ? next.player.streak + 1 : 1;
    return {
      ...next,
      player: { ...next.player, streak, coins: next.player.coins + 10 },
      rewardedDays: { ...next.rewardedDays, [today]: true },
      lastCompletedDay: today,
    };
  };

  const toggleTask = (id, xp, stat, coins = 3, isWorkout = false) => {
    const isDone = !!dayCompleted[id];
    const alreadyRewarded = !!state.rewardedTasks[today]?.[id];
    setState((prev) => {
      let next = {
        ...prev,
        completed: {
          ...prev.completed,
          [today]: { ...(prev.completed[today] || {}), [id]: !isDone },
        },
      };
      if (!isDone && !alreadyRewarded) {
        next = {
          ...next,
          player: awardPlayer(next, xp, coins, stat),
          rewardedTasks: {
            ...next.rewardedTasks,
            [today]: { ...(next.rewardedTasks[today] || {}), [id]: true },
          },
          stats: {
            ...next.stats,
            totalTasks: next.stats.totalTasks + 1,
            workouts: next.stats.workouts + (isWorkout ? 1 : 0),
          },
        };
      }
      if (!isDone) next = applyDailyStreakIfNeeded(next);
      return next;
    });
    if (!isDone) {
      setToast(`QUEST COMPLETE • +${xp} XP • +${coins} ◇`);
      showEvent('QUEST COMPLETE', id === 'workout' ? workout.title : 'Objetivo concluído', `+${xp} XP • +${coins} moedas`);
    } else {
      setToast('QUEST REABERTA • recompensa mantida');
    }
  };

  const mealTasks = useMemo(() => [
    { id: 'breakfast', title: '08:00 • Café da manhã', subtitle: 'Ovos + pão + fruta', xp: 10, coins: 2 },
    { id: 'lunch', title: '12:00 • Almoço', subtitle: `Arroz + feijão + ${proteins[dayName]} + salada`, xp: 15, coins: 3 },
    { id: 'snack', title: '16:00 • Lanche', subtitle: 'Sanduíche ou iogurte + fruta/aveia', xp: 10, coins: 2 },
    { id: 'pre', title: '19:30 • Pré-treino', subtitle: dayName === 'domingo' ? 'Opcional' : 'Refeição planejada', xp: 10, coins: 2 },
    { id: 'dinner', title: '22:00 • Jantar', subtitle: 'Arroz + proteína + legumes/salada', xp: 15, coins: 3 },
    { id: 'water', title: 'Meta de água', subtitle: `${player.waterGoal} L ao longo do dia`, xp: 15, coins: 3 },
  ], [dayName, player.waterGoal]);

  const dailyDoneCount = dayTaskCount(dayCompleted);
  const xpMax = xpToLevel(player.level);
  const weightTotal = Math.abs(player.startWeight - player.goalWeight) || 1;
  const weightDone = Math.max(0, Math.min(weightTotal, weightProgressAmount));
  const weightPct = (weightDone / weightTotal) * 100;

  const ensureRandomQuest = () => {
    if (state.randomQuest[today]) return;
    const index = Math.floor(Math.random() * randomMissions.length);
    setState((prev) => ({
      ...prev,
      randomQuest: { ...prev.randomQuest, [today]: { ...randomMissions[index], done: false, rerollsUsed: 0 } },
    }));
  };

  useEffect(() => {
    if (loaded && player.onboarded) ensureRandomQuest();
  }, [loaded, today, player.onboarded]);

  const completeRandomQuest = () => {
    const q = state.randomQuest[today];
    if (!q || q.done) return;
    setState((prev) => ({
      ...prev,
      player: awardPlayer(prev, q.xp, q.coins || 5, q.stat || 'discipline'),
      randomQuest: { ...prev.randomQuest, [today]: { ...prev.randomQuest[today], done: true } },
      stats: { ...prev.stats, totalTasks: prev.stats.totalTasks + 1 },
    }));
    setToast(`SIDE QUEST • +${q.xp} XP • +${q.coins || 5} ◇`);
    showEvent('SIDE QUEST COMPLETE', q.title, `+${q.xp} XP • +${q.coins || 5} moedas`);
  };

  const rerollQuest = () => {
    const current = state.randomQuest[today];
    if (current?.done) return;
    if ((current?.rerollsUsed || 0) >= 1) {
      setToast('REROLL DIÁRIO JÁ UTILIZADO');
      return;
    }
    let pool = randomMissions.filter((m) => m.title !== current?.title);
    if (!pool.length) pool = randomMissions;
    const q = pool[Math.floor(Math.random() * pool.length)];
    setState((prev) => ({
      ...prev,
      randomQuest: { ...prev.randomQuest, [today]: { ...q, done: false, rerollsUsed: 1 } },
    }));
    setToast('NOVA SIDE QUEST GERADA');
  };

  const registerFailure = () => {
    setState((prev) => ({
      ...prev,
      player: { ...prev.player, xp: Math.max(0, prev.player.xp - 10) },
    }));
    setToast('PENALIDADE VIRTUAL • −10 XP');
  };

  const saveWeight = () => {
    const n = Number(String(weightInput).replace(',', '.'));
    if (!Number.isFinite(n) || n < 40 || n > 300) {
      setToast('PESO INVÁLIDO');
      return;
    }
    setState((prev) => ({
      ...prev,
      player: { ...prev.player, currentWeight: n },
      weightHistory: [...prev.weightHistory, { date: today, weight: n, timestamp: Date.now() }].slice(-90),
    }));
    setWeightModal(false);
    setToast('PESO REGISTRADO');
    showEvent('STATUS UPDATED', `${n.toFixed(1)} kg`, 'Registro salvo na jornada');
  };

  const openLoadModal = (exercise, plan) => {
    const history = state.exerciseHistory[exercise] || [];
    const last = history[history.length - 1];
    setLoadModal({ exercise, plan });
    setLoadKg(last?.kg ? String(last.kg) : '');
    setLoadReps(last?.reps ? String(last.reps) : '');
    setLoadNote('');
  };

  const saveExerciseLoad = () => {
    if (!loadModal) return;
    const kg = Number(String(loadKg).replace(',', '.'));
    const reps = Number(loadReps);
    if (!Number.isFinite(kg) || kg < 0 || kg > 1000 || !Number.isFinite(reps) || reps < 1 || reps > 100) {
      setToast('CARGA OU REPETIÇÕES INVÁLIDAS');
      return;
    }
    const entry = { date: today, timestamp: Date.now(), kg, reps, note: loadNote.trim() };
    setState((prev) => ({
      ...prev,
      exerciseHistory: {
        ...prev.exerciseHistory,
        [loadModal.exercise]: [...(prev.exerciseHistory[loadModal.exercise] || []), entry].slice(-30),
      },
    }));
    setLoadModal(null);
    setToast('CARGA REGISTRADA');
  };

  const weekDayKeys = weekDates(now);
  const bossProgress = useMemo(() => {
    let workouts = 0;
    let cardio = 0;
    let nutrition = 0;
    weekDayKeys.forEach((key) => {
      const d = parseDateKey(key);
      const plan = workoutPlan[WEEK[d.getDay()]];
      const done = state.completed[key] || {};
      if (plan.type === 'training' && done.workout) workouts += 1;
      if (done.cardio) cardio += 1;
      MEAL_IDS.forEach((id) => { if (done[id]) nutrition += 1; });
    });
    return { workouts, cardio, nutrition };
  }, [state.completed, currentWeekKey]);

  const bossReady = bossProgress.workouts >= 4 && bossProgress.cardio >= 3 && bossProgress.nutrition >= 24;
  const bossClaimed = !!state.claimedBosses[currentWeekKey];

  const claimBoss = () => {
    if (!bossReady || bossClaimed) return;
    setState((prev) => ({
      ...prev,
      player: awardPlayer(prev, 250, 100, 'discipline'),
      claimedBosses: { ...prev.claimedBosses, [currentWeekKey]: { date: today } },
      stats: { ...prev.stats, bosses: prev.stats.bosses + 1 },
    }));
    setToast('BOSS DERROTADO • +250 XP • +100 ◇');
    showEvent('BOSS DEFEATED', 'Soberano da Semana', '+250 XP • +100 moedas');
  };

  const buyReward = (reward) => {
    if (player.coins < reward.cost) {
      setToast('MOEDAS INSUFICIENTES');
      return;
    }
    Alert.alert('Resgatar recompensa', `${reward.title}\nCusto: ${reward.cost} moedas`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Resgatar',
        onPress: () => {
          setState((prev) => ({
            ...prev,
            player: { ...prev.player, coins: Math.max(0, prev.player.coins - reward.cost) },
            purchases: [...prev.purchases, { ...reward, date: today, timestamp: Date.now() }].slice(-50),
          }));
          setToast('RECOMPENSA RESGATADA');
          showEvent('REWARD CLAIMED', reward.title, `−${reward.cost} moedas`);
        },
      },
    ]);
  };

  const addCustomReward = () => {
    const title = rewardTitle.trim();
    const cost = Number(rewardCost);
    if (!title || !Number.isFinite(cost) || cost < 1 || cost > 99999) {
      setToast('RECOMPENSA INVÁLIDA');
      return;
    }
    setState((prev) => ({
      ...prev,
      shopRewards: [...prev.shopRewards, { id: `custom_${Date.now()}`, title, cost }],
    }));
    setRewardModal(false);
    setRewardTitle('');
    setRewardCost('100');
    setToast('RECOMPENSA CRIADA');
  };

  const enableNotifications = async () => {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('system', {
          name: 'SYSTEM: Ascension',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 180, 120, 180],
          lightColor: COLORS.accent,
        });
      }
      const current = await Notifications.getPermissionsAsync();
      let status = current.status;
      if (status !== 'granted') {
        const requested = await Notifications.requestPermissionsAsync();
        status = requested.status;
      }
      if (status !== 'granted') {
        setToast('PERMISSÃO DE NOTIFICAÇÃO NEGADA');
        return false;
      }
      await Notifications.cancelAllScheduledNotificationsAsync();
      const daily = Notifications.SchedulableTriggerInputTypes.DAILY;
      await Notifications.scheduleNotificationAsync({
        content: { title: 'SYSTEM • Novas missões disponíveis', body: 'Abra o Sistema e veja os objetivos de hoje.' },
        trigger: { type: daily, hour: 9, minute: 0, channelId: 'system' },
      });
      await Notifications.scheduleNotificationAsync({
        content: { title: 'SYSTEM • Hora de evoluir', body: 'Confira seu treino, cardio e side quest.' },
        trigger: { type: daily, hour: 20, minute: 15, channelId: 'system' },
      });
      await Notifications.scheduleNotificationAsync({
        content: { title: 'SYSTEM • Check-in final', body: 'Registre alimentação, água e progresso antes de encerrar o dia.' },
        trigger: { type: daily, hour: 22, minute: 30, channelId: 'system' },
      });
      setState((prev) => ({ ...prev, settings: { ...prev.settings, notificationsEnabled: true } }));
      setToast('NOTIFICAÇÕES ATIVADAS');
      return true;
    } catch (error) {
      setToast('NÃO FOI POSSÍVEL ATIVAR NOTIFICAÇÕES');
      return false;
    }
  };

  const disableNotifications = async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } finally {
      setState((prev) => ({ ...prev, settings: { ...prev.settings, notificationsEnabled: false } }));
      setToast('NOTIFICAÇÕES DESATIVADAS');
    }
  };

  const toggleNotifications = async (value) => {
    if (value) await enableNotifications();
    else await disableNotifications();
  };

  const finishOnboarding = () => {
    const start = Number(String(onboardStart).replace(',', '.'));
    const goal = Number(String(onboardGoal).replace(',', '.'));
    const name = nameInput.trim() || 'PLAYER';
    if (!Number.isFinite(start) || !Number.isFinite(goal) || start < 40 || start > 300 || goal < 40 || goal > 300 || start === goal) {
      setToast('CONFIRA OS PESOS INFORMADOS');
      return;
    }
    setState((prev) => ({
      ...prev,
      player: { ...prev.player, name: name.toUpperCase(), onboarded: true, startWeight: start, currentWeight: start, goalWeight: goal },
      weightHistory: prev.weightHistory.length ? prev.weightHistory : [{ date: today, weight: start, timestamp: Date.now() }],
      shopRewards: prev.shopRewards.length ? prev.shopRewards : defaultRewards,
    }));
    setToast('PLAYER REGISTRADO • SYSTEM ONLINE');
    showEvent('AWAKENING', name.toUpperCase(), 'Sua campanha começou');
  };

  const confirmReset = () => {
    Alert.alert('Resetar o Sistema?', 'Isso apaga XP, peso, histórico, cargas, conquistas e configurações deste aparelho.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar tudo',
        style: 'destructive',
        onPress: async () => {
          await disableNotifications();
          await resetState();
          setState({ ...defaultState, shopRewards: defaultRewards });
          setNameInput('MATHEUS');
          setOnboardStart('123');
          setOnboardGoal('88');
          setTab('system');
          setToast('SISTEMA RESETADO');
        },
      },
    ]);
  };

  const randomQuest = state.randomQuest[today];

  const HomeScreen = () => (
    <>
      <View style={styles.hero}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.eyebrow}>PLAYER STATUS</Text>
          <Text style={styles.playerName}>{player.name || 'PLAYER'}</Text>
          <Text style={styles.muted}>Classe: Evolucionário • Rank {rankFor(player.level)}</Text>
        </View>
        <View style={styles.levelBox}>
          <Text style={styles.levelNumber}>{player.level}</Text>
          <Text style={styles.levelLabel}>LEVEL</Text>
        </View>
        <View style={{ width: '100%', marginTop: 18 }}>
          <View style={styles.progressLabels}>
            <Text style={styles.small}>XP</Text>
            <Text style={styles.small}>{player.xp} / {xpMax}</Text>
          </View>
          <ProgressBar value={(player.xp / xpMax) * 100} />
        </View>
        <View style={styles.currencyRow}>
          <Text style={styles.currency}>◇ {player.coins} MOEDAS</Text>
          <Text style={styles.streak}>🔥 {player.streak} dias</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <Stat label="FORÇA" value={player.strength} />
        <Stat label="RESIST." value={player.endurance} />
        <Stat label="DISCIPL." value={player.discipline} />
        <Stat label="CHECKS" value={dailyDoneCount} accent={dailyDoneCount >= DAY_QUALIFY_COUNT} />
      </View>

      <View style={styles.panel}>
        <SectionTitle eyebrow="MISSÃO PRINCIPAL" title={workout.title} right={<Text style={styles.rankBadge}>RANK {rankFor(player.level)}</Text>} />
        <Text style={styles.muted}>{workout.cardio}</Text>
        <View style={{ height: 12 }} />
        <CheckRow
          checked={!!dayCompleted.workout}
          title={workout.type === 'recovery' ? 'Concluir recuperação de hoje' : `Concluir ${workout.title}`}
          subtitle={workout.exercises.slice(0, 3).map((x) => x[0]).join(' • ')}
          reward={60}
          coins={10}
          onPress={() => toggleTask('workout', 60, workout.type === 'training' ? 'strength' : 'discipline', 10, workout.type === 'training')}
        />
        <CheckRow
          checked={!!dayCompleted.cardio}
          title="Cardio / movimento"
          subtitle={workout.cardio}
          reward={25}
          coins={5}
          onPress={() => toggleTask('cardio', 25, 'endurance', 5)}
        />
      </View>

      <View style={styles.panel}>
        <SectionTitle eyebrow="SIDE QUEST" title={randomQuest?.title || 'Gerando missão...'} right={<Text style={styles.rerollBadge}>{randomQuest?.rerollsUsed ? '0' : '1'} REROLL</Text>} />
        <Text style={styles.description}>{randomQuest?.desc || 'O Sistema está selecionando uma missão segura.'}</Text>
        <View style={styles.rowButtons}>
          <TouchableOpacity style={[styles.primaryButton, randomQuest?.done && styles.disabledButton]} disabled={randomQuest?.done} onPress={completeRandomQuest}>
            <Text style={styles.primaryButtonText}>{randomQuest?.done ? 'CONCLUÍDA ✓' : `+${randomQuest?.xp || 0} XP • +${randomQuest?.coins || 0} ◇`}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.secondaryButton, (randomQuest?.done || randomQuest?.rerollsUsed) && styles.disabledButton]} disabled={randomQuest?.done || !!randomQuest?.rerollsUsed} onPress={rerollQuest}>
            <Text style={styles.secondaryButtonText}>↻ NOVA</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bossPanel}>
        <SectionTitle eyebrow="BOSS SEMANAL" title="Soberano da Semana" right={<Text style={styles.bossReward}>250 XP • 100 ◇</Text>} />
        <Text style={styles.description}>Derrote o Boss cumprindo a campanha da semana. O progresso reinicia a cada segunda-feira.</Text>
        <View style={styles.bossRequirement}>
          <Text style={styles.checkTitle}>Treinos</Text><Text style={styles.bossNumber}>{Math.min(bossProgress.workouts, 4)}/4</Text>
        </View>
        <ProgressBar value={(bossProgress.workouts / 4) * 100} />
        <View style={styles.bossRequirement}>
          <Text style={styles.checkTitle}>Cardio / movimento</Text><Text style={styles.bossNumber}>{Math.min(bossProgress.cardio, 3)}/3</Text>
        </View>
        <ProgressBar value={(bossProgress.cardio / 3) * 100} />
        <View style={styles.bossRequirement}>
          <Text style={styles.checkTitle}>Checks de alimentação/água</Text><Text style={styles.bossNumber}>{Math.min(bossProgress.nutrition, 24)}/24</Text>
        </View>
        <ProgressBar value={(bossProgress.nutrition / 24) * 100} />
        <TouchableOpacity style={[styles.bossButton, (!bossReady || bossClaimed) && styles.disabledButton]} disabled={!bossReady || bossClaimed} onPress={claimBoss}>
          <Text style={styles.bossButtonText}>{bossClaimed ? 'BOSS DERROTADO ✓' : bossReady ? 'DERROTAR BOSS' : 'REQUISITOS INCOMPLETOS'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.panel}>
        <SectionTitle eyebrow="JORNADA" title={`${player.currentWeight.toFixed(1)} kg → ${player.goalWeight.toFixed(0)} kg`} />
        <View style={styles.progressLabels}>
          <Text style={styles.small}>{weightDone.toFixed(1)} kg concluídos</Text>
          <Text style={styles.small}>{Math.round(weightPct)}%</Text>
        </View>
        <ProgressBar value={weightPct} />
        <TouchableOpacity style={styles.secondaryWide} onPress={() => { setWeightInput(String(player.currentWeight)); setWeightModal(true); }}>
          <Text style={styles.secondaryButtonText}>REGISTRAR PESO</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.panel, styles.penaltyPanel]}>
        <SectionTitle eyebrow="FALHA DE MISSÃO" title="Penalidade somente no jogo" />
        <Text style={styles.description}>Sem pular refeição e sem cardio punitivo. A falha desconta apenas 10 XP virtual.</Text>
        <TouchableOpacity style={styles.dangerButton} onPress={registerFailure}>
          <Text style={styles.dangerText}>REGISTRAR FALHA • −10 XP</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const WorkoutScreen = () => (
    <>
      <View style={styles.panel}>
        <SectionTitle eyebrow="TREINO DE HOJE" title={workout.title} />
        <Text style={styles.description}>Toque em cada exercício para registrar carga e repetições. O histórico fica salvo no aparelho.</Text>
        {workout.exercises.map(([name, reps], i) => {
          const history = state.exerciseHistory[name] || [];
          const last = history[history.length - 1];
          return (
            <TouchableOpacity key={`${name}-${i}`} style={styles.exerciseRow} onPress={() => openLoadModal(name, reps)} activeOpacity={0.72}>
              <Text style={styles.exerciseIndex}>{String(i + 1).padStart(2, '0')}</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.exerciseName}>{name}</Text>
                <Text style={styles.exerciseLast}>{last ? `Último: ${last.kg} kg × ${last.reps}` : 'Sem carga registrada'}</Text>
              </View>
              <Text style={styles.exerciseReps}>{reps}</Text>
            </TouchableOpacity>
          );
        })}
        <View style={styles.cardInset}>
          <Text style={styles.eyebrow}>CARDIO</Text>
          <Text style={styles.checkTitle}>{workout.cardio}</Text>
        </View>
      </View>

      <View style={styles.panel}>
        <SectionTitle eyebrow="SEMANA" title="Ciclo Upper / Lower" />
        {['segunda','terca','quarta','quinta','sexta','sabado','domingo'].map((d) => (
          <View key={d} style={[styles.weekRow, d === dayName && styles.weekRowActive]}>
            <Text style={[styles.weekDay, d === dayName && styles.activeText]}>{d.toUpperCase()}</Text>
            <Text style={styles.weekWorkout}>{workoutPlan[d].title}</Text>
          </View>
        ))}
      </View>

      <View style={styles.panel}>
        <SectionTitle eyebrow="HISTÓRICO DE CARGAS" title="Últimos registros" />
        {Object.keys(state.exerciseHistory).length === 0 ? (
          <Text style={styles.description}>Toque em um exercício para começar a registrar suas cargas.</Text>
        ) : (
          Object.entries(state.exerciseHistory).slice(-8).reverse().map(([exercise, entries]) => {
            const last = entries[entries.length - 1];
            return (
              <View key={exercise} style={styles.historyRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.checkTitle}>{exercise}</Text>
                  <Text style={styles.checkSubtitle}>{last?.date || ''}</Text>
                </View>
                <Text style={styles.historyValue}>{last ? `${last.kg} kg × ${last.reps}` : '—'}</Text>
              </View>
            );
          })
        )}
      </View>
    </>
  );

  const FoodScreen = () => (
    <>
      <View style={styles.panel}>
        <SectionTitle eyebrow="PROTOCOLO DE ALIMENTAÇÃO" title={proteins[dayName]} />
        <Text style={styles.description}>O objetivo é consistência. O Sistema nunca manda ficar sem comer nem usar exercício para compensar refeição.</Text>
        {mealTasks.map((m) => (
          <CheckRow
            key={m.id}
            checked={!!dayCompleted[m.id]}
            title={m.title}
            subtitle={m.subtitle}
            reward={m.xp}
            coins={m.coins}
            onPress={() => toggleTask(m.id, m.xp, 'discipline', m.coins)}
          />
        ))}
      </View>
      <View style={styles.panel}>
        <SectionTitle eyebrow="ROTA SEMANAL" title="Proteína principal" />
        {['segunda','terca','quarta','quinta','sexta','sabado','domingo'].map((d) => (
          <View key={d} style={[styles.weekRow, d === dayName && styles.weekRowActive]}>
            <Text style={[styles.weekDay, d === dayName && styles.activeText]}>{d.toUpperCase()}</Text>
            <Text style={styles.weekWorkout}>{proteins[d]}</Text>
          </View>
        ))}
      </View>
    </>
  );

  const CalendarPanel = () => {
    const cells = monthCalendar(now);
    return (
      <View style={styles.panel}>
        <SectionTitle eyebrow="CALENDÁRIO" title={`${MONTHS[now.getMonth()]} ${now.getFullYear()}`} right={<Text style={styles.streakBadge}>🔥 {player.streak}</Text>} />
        <View style={styles.calendarHeader}>
          {['SEG','TER','QUA','QUI','SEX','SÁB','DOM'].map((d) => <Text key={d} style={styles.calendarHeaderText}>{d}</Text>)}
        </View>
        <View style={styles.calendarGrid}>
          {cells.map((cell, i) => {
            if (!cell) return <View key={`empty-${i}`} style={styles.calendarCell} />;
            const qualified = !!state.rewardedDays[cell.key];
            const isToday = cell.key === today;
            const isFuture = cell.date > now;
            return (
              <View key={cell.key} style={[styles.calendarCell, isToday && styles.calendarToday, qualified && styles.calendarDone]}>
                <Text style={[styles.calendarDay, isFuture && styles.calendarFuture, qualified && styles.calendarDayDone]}>{cell.day}</Text>
                {qualified && <Text style={styles.calendarCheck}>✓</Text>}
              </View>
            );
          })}
        </View>
        <Text style={styles.calendarHint}>Um dia entra na sequência após {DAY_QUALIFY_COUNT} checks concluídos.</Text>
      </View>
    );
  };

  const ProgressScreen = () => {
    const milestones = [];
    const directionDown = player.startWeight > player.goalWeight;
    if (directionDown) {
      let w = Math.floor(player.startWeight / 5) * 5;
      if (w >= player.startWeight) w -= 5;
      while (w > player.goalWeight && milestones.length < 8) { milestones.push(w); w -= 5; }
    } else {
      let w = Math.ceil(player.startWeight / 5) * 5;
      if (w <= player.startWeight) w += 5;
      while (w < player.goalWeight && milestones.length < 8) { milestones.push(w); w += 5; }
    }
    milestones.push(player.goalWeight);
    return (
      <>
        <View style={styles.panel}>
          <SectionTitle eyebrow="EVOLUÇÃO" title="Jornada de peso" />
          <View style={styles.weightBigRow}>
            <View><Text style={styles.mutedSmall}>INÍCIO</Text><Text style={styles.weightBig}>{player.startWeight} kg</Text></View>
            <Text style={styles.arrow}>→</Text>
            <View><Text style={styles.mutedSmall}>ATUAL</Text><Text style={styles.weightBig}>{player.currentWeight.toFixed(1)} kg</Text></View>
            <Text style={styles.arrow}>→</Text>
            <View><Text style={styles.mutedSmall}>META</Text><Text style={styles.weightBig}>{player.goalWeight} kg</Text></View>
          </View>
          <ProgressBar value={weightPct} />
          <TouchableOpacity style={styles.primaryWide} onPress={() => { setWeightInput(String(player.currentWeight)); setWeightModal(true); }}>
            <Text style={styles.primaryButtonText}>ATUALIZAR PESO</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.panel}>
          <SectionTitle eyebrow="GRÁFICO" title="Histórico de peso" />
          <WeightChart history={state.weightHistory} startWeight={player.startWeight} />
          <Text style={styles.chartCaption}>Mostrando até os 12 registros mais recentes.</Text>
        </View>

        <View style={styles.panel}>
          <SectionTitle eyebrow="CHECKPOINTS" title="Marcos da campanha" />
          {milestones.map((m) => {
            const unlocked = directionDown ? player.currentWeight <= m : player.currentWeight >= m;
            return (
              <View key={m} style={styles.milestoneRow}>
                <View style={[styles.milestoneDot, unlocked && styles.milestoneDotDone]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.checkTitle}>{m} kg</Text>
                  <Text style={styles.checkSubtitle}>{unlocked ? 'Checkpoint desbloqueado' : 'Bloqueado'}</Text>
                </View>
                <Text style={unlocked ? styles.success : styles.mutedSmall}>{unlocked ? 'UNLOCKED' : 'LOCKED'}</Text>
              </View>
            );
          })}
        </View>

        <CalendarPanel />

        <View style={styles.panel}>
          <SectionTitle eyebrow="HISTÓRICO" title="Últimas pesagens" />
          {state.weightHistory.length === 0 ? (
            <Text style={styles.description}>Nenhum registro adicional ainda.</Text>
          ) : (
            [...state.weightHistory].reverse().slice(0, 10).map((r, i) => (
              <View key={`${r.date}-${r.timestamp || i}`} style={styles.historyRow}>
                <Text style={styles.weekDay}>{r.date}</Text>
                <Text style={styles.historyValue}>{Number(r.weight).toFixed(1)} kg</Text>
              </View>
            ))
          )}
        </View>
      </>
    );
  };

  const RewardsScreen = () => (
    <>
      <View style={styles.coinHero}>
        <Text style={styles.eyebrow}>INVENTÁRIO</Text>
        <Text style={styles.coinBig}>◇ {player.coins}</Text>
        <Text style={styles.muted}>Moedas obtidas por consistência, missões e conquistas.</Text>
      </View>

      <View style={styles.panel}>
        <SectionTitle eyebrow="LOJA" title="Recompensas pessoais" right={
          <TouchableOpacity style={styles.miniButton} onPress={() => setRewardModal(true)}><Text style={styles.miniButtonText}>+ CRIAR</Text></TouchableOpacity>
        } />
        {state.shopRewards.map((reward) => (
          <TouchableOpacity key={reward.id} style={styles.shopRow} onPress={() => buyReward(reward)} activeOpacity={0.72}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.checkTitle}>{reward.title}</Text>
              <Text style={styles.checkSubtitle}>Toque para resgatar</Text>
            </View>
            <Text style={[styles.shopCost, player.coins < reward.cost && styles.shopCostDisabled]}>{reward.cost} ◇</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.panel}>
        <SectionTitle eyebrow="CONQUISTAS" title={`${Object.keys(state.unlockedAchievements).length}/${achievements.length} desbloqueadas`} />
        {achievements.map((a) => {
          const unlocked = !!state.unlockedAchievements[a.id];
          return (
            <View key={a.id} style={[styles.achievementRow, unlocked && styles.achievementUnlocked]}>
              <View style={[styles.achievementIcon, unlocked && styles.achievementIconUnlocked]}><Text style={styles.achievementIconText}>{unlocked ? '◆' : '◇'}</Text></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.checkTitle}>{a.title}</Text>
                <Text style={styles.checkSubtitle}>{a.desc}</Text>
              </View>
              <Text style={unlocked ? styles.success : styles.mutedSmall}>{unlocked ? 'UNLOCKED' : `+${a.coins} ◇`}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.panel}>
        <SectionTitle eyebrow="REGISTRO" title="Últimos resgates" />
        {state.purchases.length === 0 ? <Text style={styles.description}>Nenhuma recompensa resgatada ainda.</Text> : [...state.purchases].reverse().slice(0, 8).map((p, i) => (
          <View key={`${p.timestamp || i}`} style={styles.historyRow}>
            <View style={{ flex: 1 }}><Text style={styles.checkTitle}>{p.title}</Text><Text style={styles.checkSubtitle}>{p.date}</Text></View>
            <Text style={styles.historyValue}>−{p.cost} ◇</Text>
          </View>
        ))}
      </View>
    </>
  );

  const ProfileScreen = () => (
    <>
      <View style={styles.panel}>
        <SectionTitle eyebrow="PLAYER" title={player.name} right={<Text style={styles.rankHuge}>{rankFor(player.level)}</Text>} />
        <View style={styles.profileGrid}>
          <Stat label="LEVEL" value={player.level} />
          <Stat label="STREAK" value={`${player.streak}d`} />
          <Stat label="TREINOS" value={state.stats.workouts} />
          <Stat label="BOSSES" value={state.stats.bosses} />
        </View>
      </View>

      <View style={styles.panel}>
        <SectionTitle eyebrow="NOTIFICAÇÕES" title="Lembretes do Sistema" />
        <View style={styles.settingRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.checkTitle}>Ativar lembretes locais</Text>
            <Text style={styles.checkSubtitle}>09:00 missões • 20:15 treino • 22:30 check-in</Text>
          </View>
          <Switch
            value={!!state.settings.notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: '#213247', true: COLORS.accent }}
            thumbColor={COLORS.text}
          />
        </View>
        <Text style={styles.description}>As notificações são agendadas no próprio celular. O app não precisa de servidor para esses lembretes.</Text>
      </View>

      <View style={styles.panel}>
        <SectionTitle eyebrow="SEGURANÇA DO SISTEMA" title="Regras de penalidade" />
        <Text style={styles.description}>Punições são virtuais: XP, moedas, sequência ou missões. Nunca use jejum forçado, cortar refeição, desidratação, exercício excessivo ou qualquer punição física.</Text>
      </View>

      <View style={[styles.panel, styles.penaltyPanel]}>
        <SectionTitle eyebrow="DADOS LOCAIS" title="Reset total" />
        <Text style={styles.description}>Apaga todos os dados do app salvos neste aparelho.</Text>
        <TouchableOpacity style={styles.dangerButton} onPress={confirmReset}><Text style={styles.dangerText}>RESETAR O SISTEMA</Text></TouchableOpacity>
      </View>
    </>
  );

  if (!loaded) {
    return (
      <SafeAreaView style={[styles.safe, styles.centerScreen]}>
        <StatusBar style="light" />
        <Text style={styles.systemSplash}>SYSTEM</Text>
        <Text style={styles.loadingText}>CARREGANDO STATUS...</Text>
      </SafeAreaView>
    );
  }

  if (!player.onboarded) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.onboardingWrap} keyboardShouldPersistTaps="handled">
          <Text style={styles.systemSplash}>SYSTEM</Text>
          <Text style={styles.awakening}>AWAKENING PROTOCOL</Text>
          <Text style={styles.onboardingTitle}>Registrar Player</Text>
          <Text style={styles.onboardingText}>Crie o personagem que vai representar sua rotina. Tudo será salvo localmente neste celular.</Text>

          <View style={styles.onboardingCard}>
            <Text style={styles.inputLabel}>NOME DO PLAYER</Text>
            <TextInput value={nameInput} onChangeText={setNameInput} style={styles.input} maxLength={24} placeholder="MATHEUS" placeholderTextColor={COLORS.muted} autoCapitalize="characters" />
            <View style={styles.twoInputs}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>PESO INICIAL</Text>
                <TextInput value={onboardStart} onChangeText={setOnboardStart} style={styles.input} keyboardType="decimal-pad" placeholder="123" placeholderTextColor={COLORS.muted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>META</Text>
                <TextInput value={onboardGoal} onChangeText={setOnboardGoal} style={styles.input} keyboardType="decimal-pad" placeholder="88" placeholderTextColor={COLORS.muted} />
              </View>
            </View>
            <TouchableOpacity style={styles.awakenButton} onPress={finishOnboarding}>
              <Text style={styles.awakenButtonText}>DESPERTAR</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.safeNote}>O Sistema usa missões e recompensas virtuais. Ele não aplica punições físicas nem manda pular refeições.</Text>
        </ScrollView>
        <EventOverlay event={event} anim={eventAnim} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.systemLabel}>SYSTEM</Text>
          <Text style={styles.toast} numberOfLines={1}>{toast}</Text>
        </View>
        <View style={styles.topCoins}><Text style={styles.topCoinsText}>◇ {player.coins}</Text></View>
        <View style={styles.topRank}><Text style={styles.topRankText}>{rankFor(player.level)}</Text></View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {tab === 'system' && <HomeScreen />}
        {tab === 'treino' && <WorkoutScreen />}
        {tab === 'alimentacao' && <FoodScreen />}
        {tab === 'progresso' && <ProgressScreen />}
        {tab === 'recompensas' && <RewardsScreen />}
        {tab === 'perfil' && <ProfileScreen />}
        <View style={{ height: 24 }} />
      </ScrollView>

      <View style={styles.nav}>
        {[
          ['system', '◈', 'Sistema'],
          ['treino', '⚔', 'Treino'],
          ['alimentacao', '◇', 'Dieta'],
          ['progresso', '↗', 'Evol.'],
          ['recompensas', '◆', 'Loja'],
          ['perfil', '☰', 'Perfil'],
        ].map(([id, icon, label]) => (
          <TouchableOpacity key={id} style={styles.navItem} onPress={() => setTab(id)} activeOpacity={0.7}>
            <Text style={[styles.navIcon, tab === id && styles.activeText]}>{icon}</Text>
            <Text style={[styles.navLabel, tab === id && styles.activeText]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Modal visible={weightModal} transparent animationType="fade" onRequestClose={() => setWeightModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setWeightModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.eyebrow}>REGISTRO DO SISTEMA</Text>
            <Text style={styles.sectionTitle}>Peso atual</Text>
            <TextInput
              value={weightInput}
              onChangeText={setWeightInput}
              keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
              style={styles.weightInput}
              placeholder="Ex.: 121.8"
              placeholderTextColor={COLORS.muted}
            />
            <View style={styles.rowButtons}>
              <TouchableOpacity style={styles.primaryButton} onPress={saveWeight}><Text style={styles.primaryButtonText}>SALVAR</Text></TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setWeightModal(false)}><Text style={styles.secondaryButtonText}>CANCELAR</Text></TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!loadModal} transparent animationType="fade" onRequestClose={() => setLoadModal(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setLoadModal(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.eyebrow}>REGISTRO DE CARGA</Text>
            <Text style={styles.sectionTitle}>{loadModal?.exercise || ''}</Text>
            <Text style={styles.description}>Plano: {loadModal?.plan || ''}</Text>
            <View style={styles.twoInputs}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>CARGA (KG)</Text>
                <TextInput value={loadKg} onChangeText={setLoadKg} style={styles.input} keyboardType="decimal-pad" placeholder="80" placeholderTextColor={COLORS.muted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>REPETIÇÕES</Text>
                <TextInput value={loadReps} onChangeText={setLoadReps} style={styles.input} keyboardType="number-pad" placeholder="8" placeholderTextColor={COLORS.muted} />
              </View>
            </View>
            <Text style={styles.inputLabel}>NOTA OPCIONAL</Text>
            <TextInput value={loadNote} onChangeText={setLoadNote} style={styles.input} maxLength={80} placeholder="Ex.: última série difícil" placeholderTextColor={COLORS.muted} />
            <View style={styles.rowButtons}>
              <TouchableOpacity style={styles.primaryButton} onPress={saveExerciseLoad}><Text style={styles.primaryButtonText}>SALVAR CARGA</Text></TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setLoadModal(null)}><Text style={styles.secondaryButtonText}>CANCELAR</Text></TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={rewardModal} transparent animationType="fade" onRequestClose={() => setRewardModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setRewardModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.eyebrow}>CRIAR RECOMPENSA</Text>
            <Text style={styles.sectionTitle}>Nova recompensa da loja</Text>
            <Text style={styles.inputLabel}>RECOMPENSA</Text>
            <TextInput value={rewardTitle} onChangeText={setRewardTitle} style={styles.input} maxLength={50} placeholder="Ex.: comprar um jogo em promoção" placeholderTextColor={COLORS.muted} />
            <Text style={styles.inputLabel}>CUSTO EM MOEDAS</Text>
            <TextInput value={rewardCost} onChangeText={setRewardCost} style={styles.input} keyboardType="number-pad" placeholder="100" placeholderTextColor={COLORS.muted} />
            <View style={styles.rowButtons}>
              <TouchableOpacity style={styles.primaryButton} onPress={addCustomReward}><Text style={styles.primaryButtonText}>CRIAR</Text></TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setRewardModal(false)}><Text style={styles.secondaryButtonText}>CANCELAR</Text></TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!levelUp} transparent animationType="fade" onRequestClose={() => setLevelUp(null)}>
        <View style={styles.levelModalBackdrop}>
          <View style={styles.levelModalCard}>
            <Text style={styles.levelModalEyebrow}>LEVEL UP</Text>
            <Text style={styles.levelModalNumber}>{levelUp}</Text>
            <Text style={styles.levelModalRank}>RANK {rankFor(levelUp || 1)}</Text>
            <Text style={styles.levelModalText}>Seu status foi atualizado.</Text>
            <TouchableOpacity style={styles.awakenButton} onPress={() => setLevelUp(null)}><Text style={styles.awakenButtonText}>CONTINUAR</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <EventOverlay event={event} anim={eventAnim} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  centerScreen: { alignItems: 'center', justifyContent: 'center' },
  topBar: { paddingHorizontal: 15, paddingTop: 9, paddingBottom: 9, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: '#0d2134', backgroundColor: '#050a11' },
  systemLabel: { color: COLORS.accent2, fontSize: 17, fontWeight: '900', letterSpacing: 5 },
  toast: { color: COLORS.muted, fontSize: 9, letterSpacing: 1.2, marginTop: 3 },
  topCoins: { minHeight: 40, paddingHorizontal: 10, borderRadius: 9, borderWidth: 1, borderColor: '#4a3f24', alignItems: 'center', justifyContent: 'center', backgroundColor: '#161309' },
  topCoinsText: { color: COLORS.warning, fontWeight: '900', fontSize: 11 },
  topRank: { width: 42, height: 42, borderRadius: 10, borderWidth: 1, borderColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', backgroundColor: '#081525' },
  topRankText: { color: COLORS.accent2, fontWeight: '900', fontSize: 21 },
  scroll: { flex: 1 },
  content: { padding: 13, gap: 12 },
  hero: { backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 18, flexDirection: 'row', flexWrap: 'wrap' },
  eyebrow: { color: COLORS.accent2, fontSize: 10, fontWeight: '800', letterSpacing: 2.1, marginBottom: 5 },
  playerName: { color: COLORS.text, fontSize: 25, fontWeight: '900', letterSpacing: 1.3 },
  muted: { color: COLORS.muted, fontSize: 13, marginTop: 3 },
  mutedSmall: { color: COLORS.muted, fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  levelBox: { alignItems: 'center', minWidth: 62 },
  levelNumber: { color: COLORS.text, fontSize: 42, lineHeight: 44, fontWeight: '900' },
  levelLabel: { color: COLORS.muted, fontSize: 9, letterSpacing: 2 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  small: { color: COLORS.muted, fontSize: 11, fontWeight: '700' },
  progressTrack: { height: 7, backgroundColor: '#101c2a', borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 99 },
  progressFillWarning: { backgroundColor: COLORS.warning },
  currencyRow: { width: '100%', marginTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#11263a', paddingTop: 12 },
  currency: { color: COLORS.warning, fontSize: 12, fontWeight: '900', letterSpacing: 0.7 },
  streak: { color: COLORS.text, fontSize: 12, fontWeight: '800' },
  statsGrid: { flexDirection: 'row', gap: 6 },
  statCard: { flex: 1, backgroundColor: COLORS.card, borderWidth: 1, borderColor: '#132a40', borderRadius: 12, paddingVertical: 11, paddingHorizontal: 5, alignItems: 'center', minWidth: 0 },
  statCardAccent: { borderColor: COLORS.success },
  statValue: { color: COLORS.text, fontSize: 19, fontWeight: '900', marginTop: 3 },
  panel: { backgroundColor: COLORS.panel, borderWidth: 1, borderColor: '#132a40', borderRadius: 16, padding: 15 },
  bossPanel: { backgroundColor: '#0d0b15', borderWidth: 1, borderColor: '#3d315a', borderRadius: 16, padding: 15 },
  penaltyPanel: { borderColor: '#42202a' },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 },
  sectionTitle: { color: COLORS.text, fontSize: 19, fontWeight: '800' },
  rankBadge: { color: COLORS.accent2, fontSize: 9, fontWeight: '900', borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 99 },
  rerollBadge: { color: COLORS.muted, fontSize: 8, fontWeight: '900', borderWidth: 1, borderColor: '#2b3f55', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 99 },
  bossReward: { color: COLORS.purple, fontSize: 9, fontWeight: '900' },
  description: { color: COLORS.muted, fontSize: 13, lineHeight: 19 },
  checkRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#102337', paddingVertical: 10 },
  checkRowDone: { opacity: 0.66 },
  checkBox: { width: 25, height: 25, borderRadius: 6, borderWidth: 1, borderColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  checkBoxDone: { backgroundColor: COLORS.accent },
  checkMark: { color: COLORS.bg, fontWeight: '900' },
  checkTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  checkSubtitle: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  doneText: { textDecorationLine: 'line-through' },
  reward: { color: COLORS.success, fontSize: 9, fontWeight: '800' },
  coinReward: { color: COLORS.warning, fontSize: 9, fontWeight: '900', marginTop: 2 },
  rowButtons: { flexDirection: 'row', gap: 8, marginTop: 14 },
  primaryButton: { flex: 1, minHeight: 46, backgroundColor: COLORS.accent, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 9 },
  primaryButtonText: { color: '#03101c', fontWeight: '900', fontSize: 11, letterSpacing: 0.5, textAlign: 'center' },
  secondaryButton: { minHeight: 46, paddingHorizontal: 14, borderRadius: 11, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: COLORS.accent2, fontWeight: '800', fontSize: 10 },
  disabledButton: { opacity: 0.42 },
  secondaryWide: { marginTop: 14, minHeight: 46, borderRadius: 11, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  primaryWide: { marginTop: 14, minHeight: 48, backgroundColor: COLORS.accent, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  dangerButton: { marginTop: 14, minHeight: 46, borderRadius: 11, borderWidth: 1, borderColor: '#6b2d3b', alignItems: 'center', justifyContent: 'center' },
  dangerText: { color: COLORS.danger, fontWeight: '800', fontSize: 11 },
  bossRequirement: { marginTop: 13, marginBottom: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bossNumber: { color: COLORS.purple, fontWeight: '900', fontSize: 12 },
  bossButton: { minHeight: 47, marginTop: 16, backgroundColor: COLORS.purple, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  bossButtonText: { color: '#10091d', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  exerciseRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#102337', gap: 6 },
  exerciseIndex: { width: 30, color: COLORS.accent2, fontSize: 10, fontWeight: '900' },
  exerciseName: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  exerciseLast: { color: COLORS.muted, fontSize: 10, marginTop: 3 },
  exerciseReps: { color: COLORS.muted, fontSize: 11, fontWeight: '700', maxWidth: 92, textAlign: 'right' },
  cardInset: { backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: '#16304a', padding: 13, marginTop: 12 },
  weekRow: { flexDirection: 'row', alignItems: 'center', minHeight: 46, borderTopWidth: 1, borderTopColor: '#102337' },
  weekRowActive: { backgroundColor: '#08182a', marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 8 },
  weekDay: { width: 88, color: COLORS.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  weekWorkout: { flex: 1, color: COLORS.text, fontSize: 13, fontWeight: '700' },
  activeText: { color: COLORS.accent2 },
  weightBigRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 16 },
  weightBig: { color: COLORS.text, fontSize: 18, fontWeight: '900', marginTop: 3 },
  arrow: { color: COLORS.accent, fontSize: 17 },
  milestoneRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: '#102337' },
  milestoneDot: { width: 13, height: 13, borderRadius: 99, borderWidth: 1, borderColor: COLORS.muted },
  milestoneDotDone: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  success: { color: COLORS.success, fontSize: 9, fontWeight: '900' },
  historyRow: { minHeight: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#102337' },
  historyValue: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  chartWrap: { width: '100%', borderRadius: 12, backgroundColor: COLORS.card, paddingVertical: 4, overflow: 'hidden' },
  chartCaption: { color: COLORS.muted, fontSize: 10, textAlign: 'center', marginTop: 7 },
  calendarHeader: { flexDirection: 'row', marginTop: 8 },
  calendarHeaderText: { flex: 1, textAlign: 'center', color: COLORS.muted, fontSize: 8, fontWeight: '900' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  calendarCell: { width: '14.2857%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8, marginVertical: 1 },
  calendarToday: { borderWidth: 1, borderColor: COLORS.accent },
  calendarDone: { backgroundColor: '#0d2b26' },
  calendarDay: { color: COLORS.text, fontSize: 11, fontWeight: '700' },
  calendarFuture: { color: '#42566a' },
  calendarDayDone: { color: COLORS.success },
  calendarCheck: { color: COLORS.success, fontSize: 8, marginTop: 1 },
  calendarHint: { color: COLORS.muted, fontSize: 10, marginTop: 8, textAlign: 'center' },
  streakBadge: { color: COLORS.warning, fontSize: 10, fontWeight: '900' },
  coinHero: { backgroundColor: '#151208', borderWidth: 1, borderColor: '#4f4323', borderRadius: 18, padding: 18 },
  coinBig: { color: COLORS.warning, fontSize: 34, fontWeight: '900', marginVertical: 4 },
  miniButton: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  miniButtonText: { color: COLORS.accent2, fontSize: 9, fontWeight: '900' },
  shopRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#102337' },
  shopCost: { color: COLORS.warning, fontSize: 13, fontWeight: '900' },
  shopCostDisabled: { color: '#6d6247' },
  achievementRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#102337', opacity: 0.55 },
  achievementUnlocked: { opacity: 1 },
  achievementIcon: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: '#40536a', alignItems: 'center', justifyContent: 'center' },
  achievementIconUnlocked: { borderColor: COLORS.warning, backgroundColor: '#181408' },
  achievementIconText: { color: COLORS.warning, fontSize: 18, fontWeight: '900' },
  profileGrid: { flexDirection: 'row', gap: 6, marginTop: 8 },
  rankHuge: { color: COLORS.accent2, fontSize: 36, lineHeight: 40, fontWeight: '900' },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, marginBottom: 6 },
  nav: { minHeight: 70, flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#102337', backgroundColor: '#070d15', paddingBottom: Platform.OS === 'android' ? 7 : 2 },
  navItem: { flex: 1, minHeight: 62, alignItems: 'center', justifyContent: 'center', gap: 3, minWidth: 0 },
  navIcon: { color: COLORS.muted, fontSize: 17, fontWeight: '900' },
  navLabel: { color: COLORS.muted, fontSize: 8, fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.78)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  modalCard: { width: '100%', maxWidth: 430, backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 18 },
  weightInput: { marginTop: 16, minHeight: 54, borderWidth: 1, borderColor: COLORS.border, borderRadius: 11, color: COLORS.text, fontSize: 22, fontWeight: '800', paddingHorizontal: 14, backgroundColor: COLORS.card },
  inputLabel: { color: COLORS.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1.1, marginTop: 14, marginBottom: 6 },
  input: { minHeight: 50, borderWidth: 1, borderColor: COLORS.border, borderRadius: 11, color: COLORS.text, fontSize: 16, fontWeight: '700', paddingHorizontal: 13, backgroundColor: COLORS.card },
  twoInputs: { flexDirection: 'row', gap: 10 },
  onboardingWrap: { flexGrow: 1, justifyContent: 'center', padding: 22, paddingVertical: 40 },
  systemSplash: { color: COLORS.accent2, fontSize: 28, fontWeight: '900', letterSpacing: 8, textAlign: 'center' },
  loadingText: { color: COLORS.muted, fontSize: 10, letterSpacing: 2, marginTop: 12 },
  awakening: { color: COLORS.accent, fontSize: 10, fontWeight: '900', letterSpacing: 2.5, textAlign: 'center', marginTop: 8 },
  onboardingTitle: { color: COLORS.text, fontSize: 30, fontWeight: '900', textAlign: 'center', marginTop: 28 },
  onboardingText: { color: COLORS.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8, marginBottom: 18 },
  onboardingCard: { backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 18 },
  awakenButton: { marginTop: 20, minHeight: 52, backgroundColor: COLORS.accent, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  awakenButtonText: { color: '#03101c', fontSize: 12, fontWeight: '900', letterSpacing: 1.4 },
  safeNote: { color: COLORS.muted, fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 16 },
  eventLayer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, zIndex: 99 },
  eventCard: { width: '100%', maxWidth: 390, backgroundColor: '#07131f', borderWidth: 1, borderColor: COLORS.accent, borderRadius: 14, padding: 22, alignItems: 'center' },
  eventType: { color: COLORS.accent2, fontSize: 10, fontWeight: '900', letterSpacing: 3 },
  eventTitle: { color: COLORS.text, fontSize: 24, fontWeight: '900', textAlign: 'center', marginTop: 8 },
  eventSubtitle: { color: COLORS.success, fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 7 },
  levelModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.9)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  levelModalCard: { width: '100%', maxWidth: 380, borderWidth: 1, borderColor: COLORS.accent, borderRadius: 20, padding: 26, backgroundColor: '#06111c', alignItems: 'center' },
  levelModalEyebrow: { color: COLORS.accent2, fontSize: 12, fontWeight: '900', letterSpacing: 4 },
  levelModalNumber: { color: COLORS.text, fontSize: 88, lineHeight: 96, fontWeight: '900', marginTop: 10 },
  levelModalRank: { color: COLORS.warning, fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  levelModalText: { color: COLORS.muted, fontSize: 13, marginTop: 10 },
});
