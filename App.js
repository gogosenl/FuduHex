import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ImageBackground,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';
import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { FuduBannerAd, useFuduInterstitial } from './ads';

const COLUMN_RADIUS = 3;
const ROW_COUNT = 9;
// v4 forces one clean start for the multi-area tutorial without clearing preferences.
const SAVE_KEY = '@fudu_hex_progress_v4';
const ONE_TIME_RESET_KEY = '@fudu_hex_reset_multi_area_tutorial_v7';
const TUTORIAL_COMPLETE_KEY = '@fudu_hex_tutorial_complete_v3';
const SETTINGS_KEY = '@fudu_hex_settings_v1';
const LANGUAGE_SELECTED_KEY = '@fudu_hex_language_selected_v1';
const REVIEW_STATE_KEY = '@fudu_hex_review_state_v1';
const FIRST_REVIEW_LEVEL = 3;
const REVIEW_LEVEL_INTERVAL = 8;
const REVIEW_COOLDOWN_MS = 21 * 24 * 60 * 60 * 1000;
const COPY = {
  tr: {
    numberPuzzle: 'SAYI BULMACASI',
    homeSubtitle: 'Bağla, birleştir ve hedefe ulaş.',
    play: 'OYNA',
    continue: 'DEVAM ET',
    target: 'HEDEF',
    half: 'YARISI',
    actionHint: 'Aynı sayıları çizerek birleştir',
    level: 'BÖLÜM',
    score: 'PUAN',
    progressInfo: '★ hedefin yarısı  •  ✓ hedef tamam',
    restart: 'YENİDEN BAŞLAT',
    gameHint: 'İki başlangıç parçasından sonra aynı veya iki katı değerle devam et.',
    nextTarget: 'SIRADAKİ HEDEF',
    ready: 'HAZIR MISIN?',
    levelComplete: 'BÖLÜM TAMAMLANDI',
    nextBoardHint: 'Yeni parçalar seni bekliyor',
    completedTarget: 'TAMAMLANAN HEDEF',
    tutorialLabel: 'NASIL OYNANIR?',
    tutorialTitle: 'SAYILARI BİRLEŞTİR',
    tutorialInstruction: 'Her çerçevedeki parçaları sırayla birleştir ve dört örneği tamamla.',
    tutorialGoal: '4 ALIŞTIRMA',
    tutorialProgress: 'TAMAMLANAN',
    tutorialSuccess: 'HARİKA!',
    tutorialSuccessText: 'İlk sayı zincirini tamamladın.',
    startFirstLevel: 'BÖLÜM 1’E BAŞLA',
    settings: 'AYARLAR',
    music: 'MÜZİK',
    sound: 'SES EFEKTLERİ',
    language: 'DİL',
    turkish: 'TÜRKÇE',
    english: 'ENGLISH',
    close: 'KAPAT',
    on: 'AÇIK',
    off: 'KAPALI',
    dragHint: 'Aynı iki sayıyı birbirine sürükle',
    selected: (value) => `${value} seçildi — eşine sürükle`,
    total: (total, result) => `Toplam ${total} → ${result}`,
    merged: (value) => `Harika! Yeni parça: ${value}`,
    invalid: 'Komşu aynı sayıyı veya zincirin yeni değerini seçmelisin',
    shuffling: 'Hamle kalmadı — parçalar karıştırılıyor',
    shuffled: 'Yeni hamle hazır!',
  },
  en: {
    numberPuzzle: 'NUMBER PUZZLE',
    homeSubtitle: 'Connect, merge, and reach the goal.',
    play: 'PLAY',
    continue: 'CONTINUE',
    target: 'GOAL',
    half: 'HALF',
    actionHint: 'Draw through matching numbers to merge',
    level: 'LEVEL',
    score: 'SCORE',
    progressInfo: '★ halfway there  •  ✓ goal complete',
    restart: 'RESTART',
    gameHint: 'After two starting tiles, continue with the same or double value.',
    nextTarget: 'NEXT GOAL',
    ready: 'READY?',
    levelComplete: 'LEVEL COMPLETE',
    nextBoardHint: 'New tiles are waiting for you',
    completedTarget: 'GOAL COMPLETED',
    tutorialLabel: 'HOW TO PLAY',
    tutorialTitle: 'MERGE THE NUMBERS',
    tutorialInstruction: 'Connect the tiles in each frame and complete all four examples.',
    tutorialGoal: '4 EXERCISES',
    tutorialProgress: 'COMPLETED',
    tutorialSuccess: 'GREAT!',
    tutorialSuccessText: 'You completed your first number chain.',
    startFirstLevel: 'START LEVEL 1',
    settings: 'SETTINGS',
    music: 'MUSIC',
    sound: 'SOUND EFFECTS',
    language: 'LANGUAGE',
    turkish: 'TÜRKÇE',
    english: 'ENGLISH',
    close: 'CLOSE',
    on: 'ON',
    off: 'OFF',
    dragHint: 'Drag between two matching numbers',
    selected: (value) => `${value} selected — drag to its match`,
    total: (total, result) => `Total ${total} → ${result}`,
    merged: (value) => `Great! New tile: ${value}`,
    invalid: 'Choose a neighboring match or the chain’s next value',
    shuffling: 'No moves left — shuffling tiles',
    shuffled: 'A new move is ready!',
  },
};
const COLORS = {
  2: '#F6E3C2',
  4: '#FF8A66',
  8: '#FF951F',
  16: '#D94D68',
  32: '#258E91',
  64: '#6B4AA1',
  128: '#1F7180',
};

const TILE_STROKES = {
  2: '#D5B98D',
  4: '#D95C43',
  8: '#D46A00',
  16: '#A72F4A',
  32: '#17666A',
  64: '#493176',
  128: '#15515D',
};

const TILE_COLOR_CYCLE = [
  '#F6E3C2', '#FF8A66', '#FF951F', '#D94D68',
  '#258E91', '#6B4AA1', '#2878B8', '#E9AF32',
  '#62A94A', '#D85F9E', '#4955A8', '#C55A32',
  '#3CAFB0', '#873E83', '#91A93E', '#D88742',
];
const TILE_STROKE_CYCLE = [
  '#D5B98D', '#D95C43', '#D46A00', '#A72F4A',
  '#17666A', '#493176', '#195687', '#A86D13',
  '#427C31', '#9F3F72', '#343E7C', '#8E3F24',
  '#287D7E', '#602B5D', '#687B2B', '#9D5A29',
];
const getTileColor = (value) => COLORS[value] || TILE_COLOR_CYCLE[(Math.max(1, Math.log2(value)) - 1) % TILE_COLOR_CYCLE.length];
const getTileStroke = (value) => TILE_STROKES[value] || TILE_STROKE_CYCLE[(Math.max(1, Math.log2(value)) - 1) % TILE_STROKE_CYCLE.length];
const levelValues = (level) => {
  if (level <= 4) {
    return Array.from({ length: level + 2 }, (_, index) => 2 * Math.pow(2, index));
  }
  const lowestValue = Math.pow(2, level - 3);
  return Array.from({ length: 6 }, (_, index) => lowestValue * Math.pow(2, index));
};
const levelTarget = (level) => 128 * Math.pow(2, level - 1);
const formatNumber = (value) => {
  const million = 1024 * 1024;
  if (value >= million) return `${Math.round(value / million)}m`;
  if (value >= 4096) return `${Math.round(value / 1024)}b`;
  return String(value);
};

const formatNextTarget = (value) => {
  if (value < 65536) return String(value);
  return String(Math.round((value / 1024) * 1000));
};

const makeCells = (level = 1) => {
  const result = [];
  let id = 0;
  const values = levelValues(level);
  const starterIndexes = [
    0, 0, 1, 0, 0, 1, 0, 2, 0, 1, 3, 0, 1,
    2, 0, 4, 0, 1, 2, 0, 3, 1, 0, 4, 2, 5,
  ];
  const starter = starterIndexes
    .filter((index) => index < values.length)
    .map((index) => values[index]);
  for (let q = -COLUMN_RADIUS; q <= COLUMN_RADIUS; q += 1) {
    for (let row = 0; row < ROW_COUNT; row += 1) {
      const r = row - Math.floor(ROW_COUNT / 2) - Math.floor(q / 2);
      result.push({ id, q, r, value: starter[(id + q * q) % starter.length] });
      id += 1;
    }
  }
  return result;
};

const TUTORIAL_ZONES = [
  { id: 1, cellIds: [18, 27], values: [2, 2], target: 4 },
  { id: 2, cellIds: [11, 20, 29, 38, 47], values: [2, 2, 2, 2, 2], target: 16 },
  { id: 3, cellIds: [13, 22, 31, 40, 49], values: [2, 2, 4, 8, 16], target: 32 },
  { id: 4, cellIds: [16, 25, 34, 43, 42, 33, 24], values: [2, 2, 4, 4, 8, 8, 16], target: 64 },
];

const makeTutorialCells = () => {
  const tutorialValues = new Map();
  TUTORIAL_ZONES.forEach((zone) => {
    zone.cellIds.forEach((cellId, index) => tutorialValues.set(cellId, zone.values[index]));
  });
  return makeCells(1).map((cell) => ({
    ...cell,
    value: tutorialValues.get(cell.id) || null,
  }));
};

const areNeighbors = (a, b) => {
  const dq = Math.abs(a.q - b.q);
  const dr = Math.abs(a.r - b.r);
  const ds = Math.abs((-a.q - a.r) - (-b.q - b.r));
  return Math.max(dq, dr, ds) === 1;
};

const hexPoints = (cx, cy, size) =>
  Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i);
    return `${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`;
  }).join(' ');

const randomValue = (level) => {
  const values = levelValues(level);
  const roll = Math.random();
  const weightSets = {
    3: [0.68, 0.25, 0.07],
    4: [0.58, 0.25, 0.12, 0.05],
    5: [0.53, 0.24, 0.13, 0.07, 0.03],
    6: [0.50, 0.24, 0.13, 0.07, 0.04, 0.02],
  };
  const weights = weightSets[values.length];
  let threshold = 0;
  for (let index = 0; index < values.length; index += 1) {
    threshold += weights[index];
    if (roll < threshold) return values[index];
  }
  return values[values.length - 1];
};

const hasAvailableMove = (boardCells) => boardCells.some((cell, index) =>
  cell.value && boardCells.slice(index + 1).some((other) => other.value === cell.value && areNeighbors(cell, other))
);

const makePlayableShuffle = (boardCells) => {
  const originalValues = boardCells.map((cell) => cell.value);
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const values = [...originalValues];
    for (let index = values.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
    }
    const candidate = boardCells.map((cell, index) => ({ ...cell, value: values[index] }));
    if (hasAvailableMove(candidate)) return candidate;
  }

  const fallback = boardCells.map((cell) => ({ ...cell }));
  const first = fallback.find((cell) => cell.value);
  const neighbor = first && fallback.find((cell) => cell.id !== first.id && areNeighbors(first, cell));
  if (first && neighbor) neighbor.value = first.value;
  return fallback;
};

const roundedMergeValue = (values) => {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 1) return total;
  return Math.pow(2, Math.ceil(Math.log2(total)));
};

export default function App() {
  const { width, height } = useWindowDimensions();
  const compactHeight = height < 760;
  const compactWidth = width < 360;
  const sidePadding = width < 350 ? 7 : 10;
  const boardWidth = Math.min(width - sidePadding * 2, 430);
  const availableBoardHeight = Math.max(278, height - (compactHeight ? 260 : 275));
  const hexSize = Math.min(boardWidth / 11.25, availableBoardHeight / (Math.sqrt(3) * 9.55));
  const boardHeight = hexSize * Math.sqrt(3) * 9.55;
  const centerX = boardWidth / 2;
  // Tek sayılı altıgen sütunları yarım satır aşağı uzar; ızgarayı yukarı
  // dengeleyerek en alttaki dört parçanın da tamamen görünmesini sağla.
  const centerY = boardHeight / 2 - hexSize * 0.37;
  const [level, setLevel] = useState(1);
  const [cells, setCells] = useState(() => makeCells(1));
  const [selected, setSelected] = useState([]);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState('Aynı iki sayıyı birbirine sürükle');
  const [isAnimating, setIsAnimating] = useState(false);
  const [levelComplete, setLevelComplete] = useState(false);
  const [saveLoaded, setSaveLoaded] = useState(false);
  const [savedProgress, setSavedProgress] = useState(null);
  const [screen, setScreen] = useState('home');
  const [homeLeaving, setHomeLeaving] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [language, setLanguage] = useState('tr');
  const [languageSelected, setLanguageSelected] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [introVisible, setIntroVisible] = useState(true);
  const [victoryActive, setVictoryActive] = useState(false);
  const [victoryCellId, setVictoryCellId] = useState(null);
  const [targetCoverVisible, setTargetCoverVisible] = useState(false);
  const [targetCover, setTargetCover] = useState(null);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  const [tutorialActive, setTutorialActive] = useState(false);
  const [tutorialSuccess, setTutorialSuccess] = useState(false);
  const [tutorialCompletedZones, setTutorialCompletedZones] = useState([]);
  const [boardOrigin, setBoardOrigin] = useState({ x: 0, y: 0 });
  const selectedRef = useRef([]);
  const cellsRef = useRef(cells);
  const dropValuesRef = useRef({});
  const liftValuesRef = useRef({});
  const mergeOffsetsRef = useRef({});
  const mergeFadeRef = useRef({});
  const dragPointRef = useRef(null);
  const touchStartPointRef = useRef(null);
  const boardTransitionRef = useRef(new Animated.Value(1));
  const completionTransitionRef = useRef(new Animated.Value(0));
  const introTransitionRef = useRef(new Animated.Value(0));
  const homeTransitionRef = useRef(new Animated.Value(0));
  const homeFloatRef = useRef(new Animated.Value(0));
  const victoryValuesRef = useRef({});
  const targetCoverTransitionRef = useRef(new Animated.Value(0));
  const goalPathProgressRef = useRef(new Animated.Value(0));
  const shuffleTransitionRef = useRef(new Animated.Value(0));
  const shownAdMilestonesRef = useRef({});
  const reviewTimerRef = useRef(null);
  const nextSelectPlayerRef = useRef(0);
  const musicPlayer = useAudioPlayer(require('./assets/audio/fudu-theme.wav'));
  const selectPlayerOne = useAudioPlayer(require('./assets/audio/previews/select-bubble.wav'));
  const selectPlayerTwo = useAudioPlayer(require('./assets/audio/previews/select-bubble.wav'));
  const selectPlayerThree = useAudioPlayer(require('./assets/audio/previews/select-bubble.wav'));
  const selectPlayerFour = useAudioPlayer(require('./assets/audio/previews/select-bubble.wav'));
  const mergePlayer = useAudioPlayer(require('./assets/audio/merge.wav'));
  const victoryPlayer = useAudioPlayer(require('./assets/audio/victory.wav'));
  const buttonPlayer = useAudioPlayer(require('./assets/audio/button.wav'));
  const showInterstitial = useFuduInterstitial();
  const text = COPY[language];

  const playSound = (player, volume = 0.5) => {
    if (!soundEnabled) return;
    player.volume = volume;
    player.seekTo(0).then(() => player.play()).catch(() => {});
  };

  const playSelectionSound = (volume = 0.3) => {
    if (!soundEnabled) return;
    const players = [selectPlayerOne, selectPlayerTwo, selectPlayerThree, selectPlayerFour];
    const startIndex = nextSelectPlayerRef.current;
    const playerOffset = players.findIndex((player, offset) => !players[(startIndex + offset) % players.length].playing);
    if (playerOffset < 0) return;
    const playerIndex = (startIndex + playerOffset) % players.length;
    const player = players[playerIndex];
    nextSelectPlayerRef.current = (playerIndex + 1) % players.length;
    player.volume = volume;
    player.seekTo(0).then(() => player.play()).catch(() => {});
  };

  const scheduleStoreReview = (completedLevel) => {
    if (Platform.OS !== 'ios' || completedLevel < FIRST_REVIEW_LEVEL) return;
    if (reviewTimerRef.current) clearTimeout(reviewTimerRef.current);

    reviewTimerRef.current = setTimeout(async () => {
      reviewTimerRef.current = null;
      try {
        const storedState = await AsyncStorage.getItem(REVIEW_STATE_KEY);
        const reviewState = storedState ? JSON.parse(storedState) : {};
        const lastLevel = Number.isFinite(reviewState.lastLevel) ? reviewState.lastLevel : 0;
        const lastRequestedAt = Number.isFinite(reviewState.lastRequestedAt) ? reviewState.lastRequestedAt : 0;
        const enoughLevelsPassed = lastLevel === 0 || completedLevel - lastLevel >= REVIEW_LEVEL_INTERVAL;
        const cooldownPassed = lastRequestedAt === 0 || Date.now() - lastRequestedAt >= REVIEW_COOLDOWN_MS;
        if (!enoughLevelsPassed || !cooldownPassed || !(await StoreReview.isAvailableAsync())) return;

        await AsyncStorage.setItem(REVIEW_STATE_KEY, JSON.stringify({
          lastLevel: completedLevel,
          lastRequestedAt: Date.now(),
        }));
        await StoreReview.requestReview();
      } catch {
        // Değerlendirme isteği oyunun akışını hiçbir zaman engellemez.
      }
    }, 2000);
  };

  useEffect(() => () => {
    if (reviewTimerRef.current) clearTimeout(reviewTimerRef.current);
  }, []);

  const positioned = useMemo(
    () =>
      cells.map((cell) => ({
        ...cell,
        x: centerX + hexSize * 1.5 * cell.q,
        y: centerY + hexSize * Math.sqrt(3) * (cell.r + cell.q / 2),
      })),
    [cells, centerX, centerY, hexSize]
  );
  cellsRef.current = positioned;
  const currentTarget = tutorialActive ? 64 : levelTarget(level);
  const halfTarget = currentTarget / 2;
  const highestTile = cells.reduce((highest, cell) => Math.max(highest, cell.value || 0), 0);
  const halfTargetReached = highestTile >= halfTarget;
  const fullTargetReached = highestTile >= currentTarget;

  useEffect(() => {
    if (!fullTargetReached) {
      goalPathProgressRef.current.stopAnimation();
      goalPathProgressRef.current.setValue(0);
      return undefined;
    }

    const progressAnimation = Animated.timing(goalPathProgressRef.current, {
      toValue: 1,
      duration: 520,
      useNativeDriver: false,
    });
    progressAnimation.start();
    return () => progressAnimation.stop();
  }, [fullTargetReached, level]);

  useEffect(() => {
    let active = true;
    const loadProgress = async () => {
      try {
        const [saved, storedSettings, resetCompleted, storedTutorialComplete, storedLanguageSelected] = await Promise.all([
          AsyncStorage.getItem(SAVE_KEY),
          AsyncStorage.getItem(SETTINGS_KEY),
          AsyncStorage.getItem(ONE_TIME_RESET_KEY),
          AsyncStorage.getItem(TUTORIAL_COMPLETE_KEY),
          AsyncStorage.getItem(LANGUAGE_SELECTED_KEY),
        ]);
        if (!active) return;
        const shouldResetExpoTest = __DEV__ && resetCompleted !== 'done';
        if (shouldResetExpoTest) {
          await AsyncStorage.multiRemove([
            '@fudu_hex_progress_v1',
            '@fudu_hex_progress_v2',
            '@fudu_hex_progress_v3',
            '@fudu_hex_progress_v4',
            '@fudu_hex_tutorial_complete_v1',
            '@fudu_hex_tutorial_complete_v2',
            '@fudu_hex_tutorial_complete_v3',
            REVIEW_STATE_KEY,
          ]);
          await AsyncStorage.setItem(ONE_TIME_RESET_KEY, 'done');
          if (!active) return;
          const freshCells = makeCells(1);
          selectedRef.current = [];
          cellsRef.current = freshCells;
          setLevel(1);
          setCells(freshCells);
          setScore(0);
          setSelected([]);
          setSavedProgress(null);
          setScreen('home');
          setLevelComplete(false);
          setVictoryActive(false);
          setVictoryCellId(null);
          setTargetCoverVisible(false);
          setTargetCover(null);
          setTutorialCompleted(false);
          setTutorialActive(false);
          setTutorialSuccess(false);
          setTutorialCompletedZones([]);
        } else if (saved) {
          const progress = JSON.parse(saved);
          const validCells = Array.isArray(progress.cells)
            && progress.cells.length === (COLUMN_RADIUS * 2 + 1) * ROW_COUNT
            && progress.cells.every((cell) => Number.isFinite(cell.value));
          if (validCells && Number.isInteger(progress.level) && progress.level > 0) {
            setSavedProgress({
              level: progress.level,
              score: Number.isFinite(progress.score) ? progress.score : 0,
              cells: progress.cells,
            });
          }
        }
        if (!shouldResetExpoTest) {
          setTutorialCompleted(storedTutorialComplete === 'done');
        }
        if (storedSettings) {
          const preferences = JSON.parse(storedSettings);
          setLanguage(preferences.language === 'en' ? 'en' : 'tr');
          setMusicEnabled(preferences.musicEnabled !== false);
          setSoundEnabled(preferences.soundEnabled !== false);
        }
        setLanguageSelected(storedLanguageSelected === 'done');
      } catch {
        // Bozuk veya eski kayıt oyunun açılmasını engellemez.
      } finally {
        if (active) setSaveLoaded(true);
      }
    };
    loadProgress();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: false,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!saveLoaded || !languageSelected) return;
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ language, musicEnabled, soundEnabled })).catch(() => {});
  }, [language, musicEnabled, soundEnabled, saveLoaded, languageSelected]);

  useEffect(() => {
    musicPlayer.loop = true;
    musicPlayer.volume = 0.16;
    if (saveLoaded && musicEnabled && !introVisible) {
      musicPlayer.play();
    } else {
      musicPlayer.pause();
    }
  }, [musicEnabled, saveLoaded, introVisible, musicPlayer]);

  useEffect(() => {
    setMessage(text.dragHint);
  }, [language]);

  useEffect(() => {
    if (!saveLoaded || screen !== 'game' || tutorialActive || isAnimating || levelComplete) return undefined;
    const saveTimer = setTimeout(() => {
      AsyncStorage.setItem(SAVE_KEY, JSON.stringify({ level, score, cells })).catch(() => {});
    }, 180);
    return () => clearTimeout(saveTimer);
  }, [cells, level, score, tutorialActive, isAnimating, levelComplete, saveLoaded, screen]);

  useEffect(() => {
    if (!saveLoaded || !languageSelected) return;
    Animated.sequence([
      Animated.timing(introTransitionRef.current, {
        toValue: 1,
        duration: 620,
        useNativeDriver: true,
      }),
      Animated.delay(850),
      Animated.timing(introTransitionRef.current, {
        toValue: 2,
        duration: 480,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIntroVisible(false);
      Animated.spring(homeTransitionRef.current, {
        toValue: 1,
        damping: 13,
        stiffness: 125,
        mass: 0.85,
        useNativeDriver: true,
      }).start();
    });
  }, [saveLoaded, languageSelected]);

  useEffect(() => {
    if (introVisible || screen !== 'home') return undefined;
    const floatingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(homeFloatRef.current, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(homeFloatRef.current, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: true,
        }),
      ])
    );
    floatingAnimation.start();
    return () => floatingAnimation.stop();
  }, [introVisible, screen]);

  useEffect(() => {
    if (!saveLoaded || screen !== 'game' || tutorialActive || isAnimating || levelComplete || selected.length || hasAvailableMove(cells)) {
      return undefined;
    }

    setIsAnimating(true);
    setMessage(text.shuffling);
    playSound(buttonPlayer, 0.24);
    const shuffledCells = makePlayableShuffle(cells);
    shuffleTransitionRef.current.setValue(0);

    Animated.timing(shuffleTransitionRef.current, {
      toValue: 1,
      duration: 190,
      useNativeDriver: true,
    }).start(() => {
      setCells(shuffledCells);
      requestAnimationFrame(() => {
        Animated.spring(shuffleTransitionRef.current, {
          toValue: 2,
          damping: 13,
          stiffness: 185,
          mass: 0.55,
          useNativeDriver: true,
        }).start(() => {
          shuffleTransitionRef.current.setValue(0);
          setMessage(text.shuffled);
          setIsAnimating(false);
        });
      });
    });
    return undefined;
  }, [cells, isAnimating, levelComplete, tutorialActive, saveLoaded, screen, selected.length, language]);

  const pickCell = (x, y) => {
    let nearest = null;
    let distance = Infinity;
    cellsRef.current.forEach((cell) => {
      const d = Math.hypot(cell.x - x, cell.y - y);
      if (d < distance) {
        nearest = cell;
        distance = d;
      }
    });
    return distance < hexSize * 0.88 ? nearest : null;
  };

  const updateSelection = (next) => {
    const previous = selectedRef.current;
    const changedIds = new Set([
      ...previous.filter((id) => !next.includes(id)),
      ...next.filter((id) => !previous.includes(id)),
    ]);
    changedIds.forEach((id) => {
      if (!liftValuesRef.current[id]) {
        liftValuesRef.current[id] = new Animated.Value(0);
      }
      Animated.spring(liftValuesRef.current[id], {
        toValue: next.includes(id) ? 1 : 0,
        damping: 16,
        stiffness: 220,
        mass: 0.55,
        useNativeDriver: true,
      }).start();
    });
    selectedRef.current = next;
    setSelected(next);
  };

  const beginDrag = (x, y) => {
    if (isAnimating) return;
    dragPointRef.current = { x, y };
    const cell = pickCell(x, y);
    const isCompletedTutorialCell = tutorialActive && TUTORIAL_ZONES.some((zone) =>
      tutorialCompletedZones.includes(zone.id) && zone.cellIds.includes(cell?.id)
    );
    if (isCompletedTutorialCell) return;
    if (cell?.value) {
      playSelectionSound(0.34);
      updateSelection([cell.id]);
      setMessage(text.selected(cell.value));
    }
  };

  const captureTouchStart = (event) => {
    if (screen !== 'game' || settingsVisible || tutorialSuccess || isAnimating || levelComplete || introVisible) return;
    const { locationX, locationY } = event.nativeEvent;
    if (!Number.isFinite(locationX) || !Number.isFinite(locationY)) return;
    touchStartPointRef.current = { x: locationX, y: locationY };
    // iOS'ta hızlı sürüklemede responder grant hareketten sonra gelebilir.
    // İlk parçayı gerçek dokunma anında seçerek bu gecikmeyi ortadan kaldır.
    if (selectedRef.current.length === 0) beginDrag(locationX, locationY);
  };

  const moveAcrossCell = (x, y) => {
    const cell = pickCell(x, y);
    const ids = selectedRef.current;
    if (!cell || ids.length === 0) return;
    if (tutorialActive && TUTORIAL_ZONES.some((zone) =>
      tutorialCompletedZones.includes(zone.id) && zone.cellIds.includes(cell.id)
    )) return;
    const first = cellsRef.current.find((item) => item.id === ids[0]);
    const selectedIndex = ids.indexOf(cell.id);

    if (selectedIndex >= 0) {
      // Zincir yalnızca son parçadan bir önceki parçaya geri sürüklenince kısalır.
      // Yol daha eski seçili bir parçanın üzerinden kesişirse seçim korunur.
      if (selectedIndex === ids.length - 2) {
        const shortened = ids.slice(0, selectedIndex + 1);
        updateSelection(shortened);
        const values = shortened.map((id) => cellsRef.current.find((item) => item.id === id).value);
        const total = values.reduce((sum, value) => sum + value, 0);
        const result = roundedMergeValue(values);
        setMessage(shortened.length === 1 ? text.selected(first.value) : text.total(total, result));
      }
      return;
    }

    const last = cellsRef.current.find((item) => item.id === ids[ids.length - 1]);
    const selectedValues = ids.map((id) => cellsRef.current.find((item) => item.id === id).value);
    const hasMovedUp = selectedValues.some((value) => value > first.value);
    const canMoveUp = hasMovedUp || selectedValues.length >= 2;
    const validValue = cell.value === last.value || (canMoveUp && cell.value === last.value * 2);

    if (areNeighbors(last, cell) && validValue) {
      playSelectionSound(0.28);
      const next = [...ids, cell.id];
      const nextValues = [...selectedValues, cell.value];
      const total = nextValues.reduce((sum, value) => sum + value, 0);
      const result = roundedMergeValue(nextValues);
      updateSelection(next);
      setMessage(text.total(total, result));
    }
  };

  const moveDrag = (x, y) => {
    if (isAnimating) return;
    const previous = dragPointRef.current || { x, y };
    const distance = Math.hypot(x - previous.x, y - previous.y);
    const stepSize = Math.max(4, hexSize * 0.24);
    const steps = Math.max(1, Math.ceil(distance / stepSize));

    for (let step = 1; step <= steps; step += 1) {
      const progress = step / steps;
      moveAcrossCell(
        previous.x + (x - previous.x) * progress,
        previous.y + (y - previous.y) * progress
      );
    }
    dragPointRef.current = { x, y };
  };

  const playVictoryCelebration = (winningId) => {
    playSound(victoryPlayer, 0.58);
    const winner = cellsRef.current.find((cell) => cell.id === winningId);
    if (!winner) {
      const revealFallbackCompletion = () => {
        setTargetCover({
          value: levelTarget(level),
          x: boardOrigin.x + boardWidth / 2,
          y: boardOrigin.y + boardHeight / 2,
        });
        targetCoverTransitionRef.current.setValue(1);
        setTargetCoverVisible(true);
        setLevelComplete(true);
        completionTransitionRef.current.setValue(1);
        scheduleStoreReview(level);
      };
      const milestoneKey = `${level}-complete`;
      if (!shownAdMilestonesRef.current[milestoneKey]) {
        shownAdMilestonesRef.current[milestoneKey] = true;
        const displayed = showInterstitial(() => {
          if (musicEnabled) musicPlayer.play();
          revealFallbackCompletion();
        });
        if (displayed && musicEnabled) musicPlayer.pause();
        if (!displayed) revealFallbackCompletion();
      } else {
        revealFallbackCompletion();
      }
      return;
    }

    const waveAnimations = cellsRef.current.map((cell) => {
      const value = new Animated.Value(0);
      victoryValuesRef.current[cell.id] = value;
      const dq = Math.abs(cell.q - winner.q);
      const dr = Math.abs(cell.r - winner.r);
      const ds = Math.abs((-cell.q - cell.r) - (-winner.q - winner.r));
      const distance = Math.max(dq, dr, ds);
      const isWinner = cell.id === winningId;

      return Animated.sequence([
        Animated.delay(isWinner ? 0 : 120 + distance * 52),
        Animated.spring(value, {
          toValue: 1,
          damping: isWinner ? 9 : 12,
          stiffness: isWinner ? 155 : 190,
          mass: 0.62,
          useNativeDriver: true,
        }),
        Animated.delay(isWinner ? 650 : 35),
        Animated.spring(value, {
          toValue: 0,
          damping: 14,
          stiffness: 190,
          mass: 0.55,
          useNativeDriver: true,
        }),
      ]);
    });

    setVictoryCellId(winningId);
    setVictoryActive(true);
    requestAnimationFrame(() => {
      Animated.parallel(waveAnimations).start(() => {
        setVictoryActive(false);
        setVictoryCellId(null);
        victoryValuesRef.current = {};
        const currentWinner = cellsRef.current.find((cell) => cell.id === winningId) || winner;
        const revealCompletion = () => {
          setTargetCover({
            value: currentWinner.value,
            x: boardOrigin.x + currentWinner.x,
            y: boardOrigin.y + currentWinner.y,
          });
          targetCoverTransitionRef.current.setValue(0);
          completionTransitionRef.current.setValue(0);
          setLevelComplete(true);
          setTargetCoverVisible(true);
          requestAnimationFrame(() => {
            Animated.timing(targetCoverTransitionRef.current, {
              toValue: 1,
              duration: 680,
              useNativeDriver: true,
            }).start(() => {
              Animated.spring(completionTransitionRef.current, {
                toValue: 1,
                damping: 13,
                stiffness: 150,
                mass: 0.72,
                useNativeDriver: true,
              }).start(({ finished }) => {
                if (finished) scheduleStoreReview(level);
              });
            });
          });
        };
        const milestoneKey = `${level}-complete`;
        if (!shownAdMilestonesRef.current[milestoneKey]) {
          shownAdMilestonesRef.current[milestoneKey] = true;
          const displayed = showInterstitial(() => {
            if (musicEnabled) musicPlayer.play();
            revealCompletion();
          });
          if (displayed && musicEnabled) musicPlayer.pause();
          if (!displayed) revealCompletion();
        } else {
          revealCompletion();
        }
      });
    });
  };

  const finishDrag = () => {
    dragPointRef.current = null;
    touchStartPointRef.current = null;
    const ids = selectedRef.current;
    if (tutorialActive) {
      if (ids.length >= 2) {
        const selectedValues = ids.map((id) => cellsRef.current.find((cell) => cell.id === id).value);
        const mergedValue = roundedMergeValue(selectedValues);
        const selectedIdSet = new Set(ids);
        const zone = TUTORIAL_ZONES.find((candidate) =>
          !tutorialCompletedZones.includes(candidate.id)
          && candidate.cellIds.length === ids.length
          && candidate.cellIds.every((id) => selectedIdSet.has(id))
          && mergedValue === candidate.target
        );
        if (zone) {
          playSound(mergePlayer, 0.48);
          const to = cellsRef.current.find((cell) => cell.id === ids[ids.length - 1]);
          setIsAnimating(true);
          const mergeAnimations = ids.slice(0, -1).map((id) => {
            const source = cellsRef.current.find((cell) => cell.id === id);
            const offset = new Animated.ValueXY({ x: 0, y: 0 });
            const fade = new Animated.Value(1);
            mergeOffsetsRef.current[id] = offset;
            mergeFadeRef.current[id] = fade;
            return Animated.parallel([
              Animated.timing(offset, {
                toValue: { x: to.x - source.x, y: to.y - source.y },
                duration: 190,
                useNativeDriver: true,
              }),
              Animated.timing(fade, {
                toValue: 0,
                delay: 118,
                duration: 72,
                useNativeDriver: true,
              }),
            ]);
          });
          Animated.stagger(34, mergeAnimations).start(() => {
            mergeOffsetsRef.current = {};
            mergeFadeRef.current = {};
            const completedCells = cells.map((cell) => ({
              ...cell,
              value: cell.id === to.id ? zone.target : selectedIdSet.has(cell.id) ? null : cell.value,
            }));
            const nextCompletedZones = [...tutorialCompletedZones, zone.id];
            cellsRef.current = completedCells;
            setCells(completedCells);
            setTutorialCompletedZones(nextCompletedZones);
            if (nextCompletedZones.length === TUTORIAL_ZONES.length) {
              setTutorialSuccess(true);
              completionTransitionRef.current.setValue(0);
              playSound(victoryPlayer, 0.54);
              Animated.spring(completionTransitionRef.current, {
                toValue: 1,
                damping: 13,
                stiffness: 150,
                mass: 0.7,
                useNativeDriver: true,
              }).start(() => setIsAnimating(false));
            } else {
              setIsAnimating(false);
            }
          });
          setMessage(text.merged(zone.target));
        } else {
          setMessage(text.tutorialInstruction);
        }
      } else if (ids.length) {
        setMessage(text.tutorialInstruction);
      }
      updateSelection([]);
      return;
    }
    if (ids.length >= 2) {
      playSound(mergePlayer, 0.48);
      const from = cellsRef.current.find((cell) => cell.id === ids[0]);
      const to = cellsRef.current.find((cell) => cell.id === ids[ids.length - 1]);
      const selectedValues = ids.map((id) => cellsRef.current.find((cell) => cell.id === id).value);
      const mergedValue = roundedMergeValue(selectedValues);
      const consumedIds = new Set(ids.slice(0, -1));
      const afterMerge = cellsRef.current.map(({ id, q, r, value }) =>
        consumedIds.has(id)
          ? { id, q, r, value: null }
          : id === to.id
            ? { id, q, r, value: mergedValue }
            : { id, q, r, value }
      );
      setIsAnimating(true);
      const mergeAnimations = ids.slice(0, -1).map((id) => {
        const source = cellsRef.current.find((cell) => cell.id === id);
        const offset = new Animated.ValueXY({ x: 0, y: 0 });
        const fade = new Animated.Value(1);
        mergeOffsetsRef.current[id] = offset;
        mergeFadeRef.current[id] = fade;
        return Animated.parallel([
          Animated.timing(offset, {
            toValue: { x: to.x - source.x, y: to.y - source.y },
            duration: 165,
            useNativeDriver: true,
          }),
          Animated.timing(fade, {
            toValue: 0,
            delay: 105,
            duration: 60,
            useNativeDriver: true,
          }),
        ]);
      });

      Animated.stagger(28, mergeAnimations).start(() => {
        mergeOffsetsRef.current = {};
        mergeFadeRef.current = {};
        const nextCells = afterMerge.map((cell) => ({ ...cell, value: null }));
        const dropAnimations = [];
        let newTileIndex = 0;
        let winningDestinationId = to.id;

        for (let q = -COLUMN_RADIUS; q <= COLUMN_RADIUS; q += 1) {
          const sourceColumn = afterMerge
            .filter((cell) => cell.q === q)
            .sort((a, b) => b.r - a.r);
          const pieces = sourceColumn.filter((cell) => cell.value !== null);

          sourceColumn.forEach((target, index) => {
            const targetIndex = nextCells.findIndex((cell) => cell.id === target.id);
            const source = pieces[index];
            const isNew = !source;
            nextCells[targetIndex].value = source ? source.value : randomValue(level);
            if (source?.id === to.id) winningDestinationId = target.id;
            const startOffset = source
              ? hexSize * Math.sqrt(3) * (source.r - target.r)
              : -boardHeight - target.r * hexSize;
            const animatedValue = new Animated.Value(startOffset);
            dropValuesRef.current[target.id] = animatedValue;
            if (Math.abs(startOffset) > 0.5) {
              dropAnimations.push(
                Animated.spring(animatedValue, {
                  toValue: 0,
                  delay: isNew ? newTileIndex++ * 50 : 0,
                  damping: 17,
                  stiffness: 150,
                  mass: 0.72,
                  useNativeDriver: true,
                })
              );
            }
          });
        }

        setCells(nextCells);
        requestAnimationFrame(() => {
          Animated.parallel(dropAnimations).start(() => {
            if (mergedValue >= levelTarget(level)) {
              playVictoryCelebration(winningDestinationId);
            } else {
              setIsAnimating(false);
            }
          });
        });
      });
      setScore((current) => current + mergedValue);
      setMessage(text.merged(mergedValue));
    } else if (ids.length) {
      setMessage(text.invalid);
    }
    updateSelection([]);
  };

  const continueToNextLevel = () => {
    if (!levelComplete) return;
    if (reviewTimerRef.current) {
      clearTimeout(reviewTimerRef.current);
      reviewTimerRef.current = null;
    }
    playSound(buttonPlayer, 0.42);
    Animated.timing(completionTransitionRef.current, {
      toValue: 2,
      duration: 210,
      useNativeDriver: true,
    }).start(() => {
      const nextLevel = level + 1;
      const incomingCells = makeCells(nextLevel);
      const incomingAnimations = [];
      dropValuesRef.current = {};
      liftValuesRef.current = {};
      mergeOffsetsRef.current = {};
      mergeFadeRef.current = {};

      incomingCells.forEach((cell) => {
        const row = cell.r + Math.floor(ROW_COUNT / 2) + Math.floor(cell.q / 2);
        const dropValue = new Animated.Value(-boardHeight - row * hexSize * 0.3);
        dropValuesRef.current[cell.id] = dropValue;
        incomingAnimations.push(
          Animated.spring(dropValue, {
            toValue: 0,
            delay: 180 + row * 48 + (cell.q + COLUMN_RADIUS) * 7,
            damping: 16,
            stiffness: 145,
            mass: 0.72,
            useNativeDriver: true,
          })
        );
      });

      goalPathProgressRef.current.stopAnimation();
      goalPathProgressRef.current.setValue(0);
      setCells(incomingCells);
      setLevel(nextLevel);
      setLevelComplete(false);
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(targetCoverTransitionRef.current, {
            toValue: 2,
            duration: 720,
            useNativeDriver: true,
          }),
          Animated.parallel(incomingAnimations),
        ]).start(() => {
          setTargetCoverVisible(false);
          setTargetCover(null);
          // Değeri burada sıfırlamak, React katmanı kaldırmadan önce eski hedefi
          // bir kareliğine yeniden gerçek boyutunda gösteriyordu. Bir sonraki
          // bölüm tamamlama animasyonu başlamadan önce değer zaten sıfırlanıyor.
          setIsAnimating(false);
        });
      });
    });
  };

  const enterGame = (mode) => {
    if (homeLeaving || (mode === 'continue' && !savedProgress)) return;
    playSound(buttonPlayer, 0.42);
    setHomeLeaving(true);

    Animated.timing(homeTransitionRef.current, {
      toValue: 2,
      duration: 360,
      useNativeDriver: true,
    }).start(() => {
      const isTutorial = mode === 'tutorial';
      const progress = isTutorial
        ? { level: 1, score: 0, cells: makeTutorialCells() }
        : mode === 'continue' && savedProgress
        ? savedProgress
        : { level: 1, score: 0, cells: makeCells(1) };
      const incomingCells = progress.cells.map((cell) => ({ ...cell }));
      const incomingAnimations = [];

      dropValuesRef.current = {};
      liftValuesRef.current = {};
      mergeOffsetsRef.current = {};
      mergeFadeRef.current = {};
      victoryValuesRef.current = {};
      incomingCells.forEach((cell) => {
        const row = cell.r + Math.floor(ROW_COUNT / 2) + Math.floor(cell.q / 2);
        const dropValue = new Animated.Value(-boardHeight - row * hexSize * 0.35);
        dropValuesRef.current[cell.id] = dropValue;
        incomingAnimations.push(
          Animated.spring(dropValue, {
            toValue: 0,
            delay: row * 38 + (cell.q + COLUMN_RADIUS) * 6,
            damping: 16,
            stiffness: 155,
            mass: 0.72,
            useNativeDriver: true,
          })
        );
      });

      if (mode === 'play' || isTutorial) AsyncStorage.removeItem(SAVE_KEY).catch(() => {});
      if (mode === 'play' || isTutorial) {
        shownAdMilestonesRef.current = {};
      } else {
        const savedHighest = incomingCells.reduce((highest, cell) => Math.max(highest, cell.value || 0), 0);
        if (savedHighest >= levelTarget(progress.level) / 2) {
        }
      }
      setLevel(progress.level);
      setScore(progress.score);
      setCells(incomingCells);
      setSavedProgress(mode === 'continue' ? savedProgress : null);
      setTutorialActive(isTutorial);
      setTutorialSuccess(false);
      setTutorialCompletedZones([]);
      updateSelection([]);
      setMessage(isTutorial ? text.tutorialInstruction : text.dragHint);
      setLevelComplete(false);
      setVictoryActive(false);
      setVictoryCellId(null);
      setTargetCoverVisible(false);
      setTargetCover(null);
      completionTransitionRef.current.setValue(0);
      targetCoverTransitionRef.current.setValue(0);
      boardTransitionRef.current.setValue(0);
      setIsAnimating(true);
      setScreen('game');

      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(boardTransitionRef.current, {
            toValue: 1,
            duration: 420,
            useNativeDriver: true,
          }),
          Animated.parallel(incomingAnimations),
        ]).start(() => {
          setIsAnimating(false);
          setHomeLeaving(false);
        });
      });
    });
  };

  const continueFromTutorial = () => {
    if (!tutorialActive || !tutorialSuccess || isAnimating) return;
    playSound(buttonPlayer, 0.42);
    setIsAnimating(true);
    AsyncStorage.setItem(TUTORIAL_COMPLETE_KEY, 'done').catch(() => {});

    Animated.parallel([
      Animated.timing(completionTransitionRef.current, {
        toValue: 2,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(boardTransitionRef.current, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start(() => {
      const incomingCells = makeCells(1);
      const incomingAnimations = [];
      dropValuesRef.current = {};
      liftValuesRef.current = {};
      mergeOffsetsRef.current = {};
      mergeFadeRef.current = {};
      incomingCells.forEach((cell) => {
        const row = cell.r + Math.floor(ROW_COUNT / 2) + Math.floor(cell.q / 2);
        const dropValue = new Animated.Value(-boardHeight - row * hexSize * 0.35);
        dropValuesRef.current[cell.id] = dropValue;
        incomingAnimations.push(
          Animated.spring(dropValue, {
            toValue: 0,
            delay: row * 38 + (cell.q + COLUMN_RADIUS) * 6,
            damping: 16,
            stiffness: 155,
            mass: 0.72,
            useNativeDriver: true,
          })
        );
      });

      goalPathProgressRef.current.stopAnimation();
      goalPathProgressRef.current.setValue(0);
      completionTransitionRef.current.setValue(0);
      boardTransitionRef.current.setValue(0);
      setTutorialCompleted(true);
      setTutorialActive(false);
      setTutorialSuccess(false);
      setTutorialCompletedZones([]);
      setLevel(1);
      setScore(0);
      setCells(incomingCells);
      setSavedProgress(null);
      updateSelection([]);
      setMessage(text.dragHint);

      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(boardTransitionRef.current, {
            toValue: 1,
            duration: 420,
            useNativeDriver: true,
          }),
          Animated.parallel(incomingAnimations),
        ]).start(() => setIsAnimating(false));
      });
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => screen === 'game' && !settingsVisible && !tutorialSuccess && !isAnimating && !levelComplete && !introVisible,
        onMoveShouldSetPanResponder: () => screen === 'game' && !settingsVisible && !tutorialSuccess && !isAnimating && !levelComplete && !introVisible,
        onPanResponderGrant: (event, gestureState) => {
          const { locationX, locationY, pageX, pageY } = event.nativeEvent;
          const capturedStart = touchStartPointRef.current;
          const startX = capturedStart?.x ?? (Number.isFinite(gestureState.x0) && Number.isFinite(pageX)
            ? locationX - (pageX - gestureState.x0)
            : locationX);
          const startY = capturedStart?.y ?? (Number.isFinite(gestureState.y0) && Number.isFinite(pageY)
            ? locationY - (pageY - gestureState.y0)
            : locationY);

          if (selectedRef.current.length === 0) beginDrag(startX, startY);
          else dragPointRef.current = { x: startX, y: startY };
          if (Math.hypot(locationX - startX, locationY - startY) > 1) {
            moveDrag(locationX, locationY);
          }
        },
        onPanResponderMove: (event) => moveDrag(event.nativeEvent.locationX, event.nativeEvent.locationY),
        onPanResponderRelease: finishDrag,
        onPanResponderTerminate: finishDrag,
      }),
    [hexSize, isAnimating, cells, levelComplete, tutorialActive, tutorialSuccess, introVisible, screen, settingsVisible, language, soundEnabled]
  );

  const reset = () => {
    setLevel(1);
    setCells(makeCells(1));
    setScore(0);
    updateSelection([]);
    dropValuesRef.current = {};
    liftValuesRef.current = {};
    mergeOffsetsRef.current = {};
    mergeFadeRef.current = {};
    victoryValuesRef.current = {};
    setIsAnimating(false);
    setLevelComplete(false);
    setVictoryActive(false);
    setVictoryCellId(null);
    setTargetCoverVisible(false);
    setTargetCover(null);
    boardTransitionRef.current.setValue(1);
    completionTransitionRef.current.setValue(0);
    targetCoverTransitionRef.current.setValue(0);
    setMessage(text.dragHint);
  };

  const selectedCells = selected.map((id) => positioned.find((cell) => cell.id === id));
  const victoryCell = positioned.find((cell) => cell.id === victoryCellId);
  const targetCoverWidth = hexSize * 2;
  const targetCoverHeight = hexSize * Math.sqrt(3);
  const targetCoverScale = Math.max(width, height) / (hexSize * 0.72) * 1.35;
  const homeLogoSize = Math.min(width * 0.44, height * 0.22, 172);
  const nextTargetDisplay = formatNextTarget(levelTarget(level + 1));
  const nextTargetFontSize = nextTargetDisplay.length <= 6 ? 34 : nextTargetDisplay.length <= 9 ? 28 : 22;
  const activeTutorialZone = TUTORIAL_ZONES.find((zone) => !tutorialCompletedZones.includes(zone.id)) || TUTORIAL_ZONES[TUTORIAL_ZONES.length - 1];

  return (
    <SafeAreaProvider>
      <ImageBackground
        source={require('./assets/fudu-berry-texture.png')}
        resizeMode="cover"
        style={styles.background}
        imageStyle={styles.backgroundImage}
      >
      <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
        <StatusBar style="light" />
        {screen === 'home' ? (
          <View style={[styles.homeScreen, { paddingHorizontal: Math.max(16, width * 0.06) }]}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.homeBackdrop,
                {
                  opacity: homeTransitionRef.current.interpolate({
                    inputRange: [0, 1, 2],
                    outputRange: [0, 1, 0],
                  }),
                },
              ]}
            >
              <Svg width={width} height={height}>
                <Circle cx={width * 0.5} cy={height * 0.27} r={width * 0.43} fill="#9B3950" opacity={0.32} />
                <Polygon points={hexPoints(width * 0.12, height * 0.21, 30)} fill="none" stroke="#FFB25F" strokeWidth={2} opacity={0.2} />
                <Polygon points={hexPoints(width * 0.9, height * 0.34, 23)} fill="none" stroke="#58C4AE" strokeWidth={2} opacity={0.22} />
                <Polygon points={hexPoints(width * 0.07, height * 0.66, 17)} fill="none" stroke="#FFE4BA" strokeWidth={2} opacity={0.12} />
                <Circle cx={width * 0.84} cy={height * 0.16} r={4} fill="#FFD35A" opacity={0.45} />
                <Circle cx={width * 0.16} cy={height * 0.48} r={3} fill="#58C4AE" opacity={0.45} />
              </Svg>
            </Animated.View>
            <Animated.View
              style={[
                styles.homeSettingsWrap,
                {
                  opacity: homeTransitionRef.current.interpolate({
                    inputRange: [0, 0.65, 1, 2],
                    outputRange: [0, 0, 1, 0],
                  }),
                },
              ]}
            >
              <TouchableOpacity
                style={styles.settingsIconButton}
                onPress={() => {
                  playSound(buttonPlayer, 0.34);
                  setSettingsVisible(true);
                }}
                activeOpacity={0.78}
                accessibilityLabel={text.settings}
              >
                <Text style={styles.settingsIcon}>⚙</Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              style={[
                styles.homeHero,
                {
                  opacity: homeTransitionRef.current.interpolate({
                    inputRange: [0, 0.22, 1, 2],
                    outputRange: [0, 0, 1, 0],
                  }),
                  transform: [
                    {
                      translateY: homeTransitionRef.current.interpolate({
                        inputRange: [0, 1, 2],
                        outputRange: [-28, 0, -36],
                      }),
                    },
                    {
                      scale: homeTransitionRef.current.interpolate({
                        inputRange: [0, 1, 2],
                        outputRange: [0.74, 1, 1.08],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.homeKicker}>{text.numberPuzzle}</Text>
              <Animated.View
                style={[
                  styles.homeIconFrame,
                  {
                    transform: [
                      {
                        translateY: homeFloatRef.current.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -6],
                        }),
                      },
                      {
                        scale: homeFloatRef.current.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.018],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Animated.Image
                  source={require('./assets/fudu-icon.png')}
                  resizeMode="cover"
                  style={[styles.homeIcon, { width: homeLogoSize, height: homeLogoSize }]}
                />
              </Animated.View>
              <View style={styles.homeTitleRow}>
                <Text style={[styles.homeTitle, { fontSize: width < 360 ? 38 : 46 }]}>FUDU</Text>
                <Text style={[styles.homeTitleHex, { fontSize: width < 360 ? 28 : 34 }]}>HEX</Text>
              </View>
              <Text style={styles.homeSubtitle}>{text.homeSubtitle}</Text>
            </Animated.View>

            <Animated.View
              style={[
                styles.homeActions,
                {
                  opacity: homeTransitionRef.current.interpolate({
                    inputRange: [0, 0.5, 1, 2],
                    outputRange: [0, 0, 1, 0],
                  }),
                  transform: [{
                    translateY: homeTransitionRef.current.interpolate({
                      inputRange: [0, 1, 2],
                      outputRange: [38, 0, 42],
                    }),
                  }],
                },
              ]}
            >
              <TouchableOpacity
                style={styles.homePlayButton}
                onPress={() => enterGame(savedProgress ? 'continue' : tutorialCompleted ? 'play' : 'tutorial')}
                disabled={homeLeaving}
                activeOpacity={0.82}
              >
                <View style={styles.homePlayIconBadge}><Text style={styles.homePlayIcon}>▶</Text></View>
                <View style={styles.homePlayLabel}>
                  <Text style={styles.homePlayText}>{savedProgress ? text.continue : text.play}</Text>
                  {savedProgress && (
                    <Text style={styles.homePlayMeta}>{text.target}  •  {formatNumber(levelTarget(savedProgress.level))}</Text>
                  )}
                </View>
              </TouchableOpacity>
              <Text style={styles.homeActionHint}>{text.actionHint}</Text>
            </Animated.View>
            <Animated.View
              style={[
                styles.homeProducer,
                compactHeight && styles.homeProducerCompact,
                {
                  opacity: homeTransitionRef.current.interpolate({
                    inputRange: [0, 0.72, 1, 2],
                    outputRange: [0, 0, 1, 0],
                  }),
                },
              ]}
            >
              <Animated.Image
                source={require('./assets/gorsen-games-logo.png')}
                resizeMode="cover"
                style={[styles.homeProducerLogo, compactHeight && styles.homeProducerLogoCompact]}
              />
              <Text style={styles.homeProducerName}>GÖRSEN GAMES</Text>
            </Animated.View>
          </View>
        ) : (
      <View style={[styles.container, compactHeight && styles.containerCompact, { paddingHorizontal: sidePadding }]}> 
        <View style={[styles.confetti, styles.confettiOne]} />
        <View style={[styles.confetti, styles.confettiTwo]} />
        <View style={[styles.confetti, styles.confettiThree]} />
        <View style={[styles.header, compactHeight && styles.headerCompact, compactWidth && styles.headerNarrow]}>
          <View style={[styles.logoCard, compactWidth && styles.logoCardNarrow]}>
            <Text style={[styles.title, compactWidth && styles.titleNarrow]}>FUDU</Text>
            <Text style={[styles.logoHex, compactWidth && styles.logoHexNarrow]}>HEX</Text>
          </View>
          <View style={[styles.scoreCard, styles.scoreCardWithSettings, compactWidth && styles.scoreCardNarrow]}>
            <Text style={styles.scoreLabel}>
              {tutorialActive ? text.tutorialLabel : `${text.level} ${level}  •  ${text.score}`}
            </Text>
            <Text style={styles.score}>{tutorialActive ? `${tutorialCompletedZones.length}/4` : formatNumber(score)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.settingsIconButton, styles.gameSettingsButton]}
            onPress={() => {
              playSound(buttonPlayer, 0.34);
              setSettingsVisible(true);
            }}
            activeOpacity={0.78}
            accessibilityLabel={text.settings}
          >
            <Text style={styles.settingsIcon}>⚙</Text>
          </TouchableOpacity>
        </View>

        <Animated.View
          key={`board-level-${level}`}
          style={[
            styles.boardShell,
            {
              width: boardWidth,
              height: boardHeight,
              opacity: boardTransitionRef.current,
              transform: [
                {
                  translateY: boardTransitionRef.current.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
                {
                  scale: shuffleTransitionRef.current.interpolate({
                    inputRange: [0, 1, 2],
                    outputRange: [1, 0.965, 1],
                  }),
                },
                {
                  rotateZ: shuffleTransitionRef.current.interpolate({
                    inputRange: [0, 0.5, 1, 1.5, 2],
                    outputRange: ['0deg', '-1.1deg', '1.1deg', '-0.5deg', '0deg'],
                  }),
                },
              ],
            },
          ]}
          onLayout={(event) => {
            const { x, y } = event.nativeEvent.layout;
            setBoardOrigin((current) => current.x === x && current.y === y ? current : { x, y });
          }}
          onTouchStart={captureTouchStart}
          {...panResponder.panHandlers}
        >
          <Svg width={boardWidth} height={boardHeight} style={StyleSheet.absoluteFill}>
            {positioned.map((cell) => {
              return (
                <Polygon
                  key={`${level}-${cell.id}`}
                  points={hexPoints(cell.x, cell.y, hexSize * 0.82)}
                  fill="#B97862"
                  stroke="#DCA58A"
                  strokeWidth={2.5}
                />
              );
            })}
          </Svg>
          {tutorialActive && TUTORIAL_ZONES.map((zone) => {
            const zoneCells = zone.cellIds
              .map((id) => positioned.find((cell) => cell.id === id))
              .filter(Boolean);
            const minX = Math.min(...zoneCells.map((cell) => cell.x));
            const maxX = Math.max(...zoneCells.map((cell) => cell.x));
            const minY = Math.min(...zoneCells.map((cell) => cell.y));
            const maxY = Math.max(...zoneCells.map((cell) => cell.y));
            const completed = tutorialCompletedZones.includes(zone.id);
            const zoneWidth = maxX - minX + hexSize * 1.84;
            const labelWidth = Math.min(boardWidth - 18, Math.max(zoneWidth - 10, compactWidth ? 122 : 138));
            return (
              <View
                pointerEvents="none"
                key={`tutorial-zone-${zone.id}`}
                style={[
                  styles.tutorialZone,
                  completed && styles.tutorialZoneCompleted,
                  {
                    left: minX - hexSize * 0.92,
                    top: minY - hexSize * 0.92,
                    width: zoneWidth,
                    height: maxY - minY + hexSize * 1.84,
                  },
                ]}
              >
                <View style={[
                  styles.tutorialZoneLabel,
                  {
                    left: (zoneWidth - labelWidth) / 2,
                    right: undefined,
                    width: labelWidth,
                  },
                  completed && styles.tutorialZoneLabelCompleted,
                ]}>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.tutorialZoneLabelText}>
                    {completed ? '✓' : zone.id}  •  {text.target} {zone.target}
                  </Text>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.tutorialZonePath}>
                    {zone.values.join('  ›  ')}
                  </Text>
                </View>
              </View>
            );
          })}
          <Svg pointerEvents="none" width={boardWidth} height={boardHeight} style={StyleSheet.absoluteFill}>
            {selectedCells.slice(1).map((cell, index) => {
              const previous = selectedCells[index];
              const dx = cell.x - previous.x;
              const dy = cell.y - previous.y;
              const distance = Math.hypot(dx, dy) || 1;
              const edgeInset = hexSize * 0.58;
              const ux = dx / distance;
              const uy = dy / distance;
              const lineProps = {
                x1: previous.x + ux * edgeInset,
                y1: previous.y + uy * edgeInset,
                x2: cell.x - ux * edgeInset,
                y2: cell.y - uy * edgeInset,
              };
              return (
                <React.Fragment key={`${previous.id}-${cell.id}`}>
                  <Line {...lineProps} stroke="#7B263A" strokeWidth={11} strokeLinecap="round" />
                  <Line {...lineProps} stroke="#FFF1D1" strokeWidth={6} strokeLinecap="round" />
                </React.Fragment>
              );
            })}
          </Svg>
          {positioned.map((cell) => {
            if (!cell.value) return null;
            const dropValue = dropValuesRef.current[cell.id] || new Animated.Value(0);
            dropValuesRef.current[cell.id] = dropValue;
            const liftValue = liftValuesRef.current[cell.id] || new Animated.Value(0);
            liftValuesRef.current[cell.id] = liftValue;
            const mergeOffset = mergeOffsetsRef.current[cell.id] || new Animated.ValueXY({ x: 0, y: 0 });
            mergeOffsetsRef.current[cell.id] = mergeOffset;
            const mergeFade = mergeFadeRef.current[cell.id] || new Animated.Value(1);
            mergeFadeRef.current[cell.id] = mergeFade;
            const victoryValue = victoryValuesRef.current[cell.id] || new Animated.Value(0);
            victoryValuesRef.current[cell.id] = victoryValue;
            const active = selected.includes(cell.id);
            const isVictoryTarget = victoryActive && cell.id === victoryCellId;
            const tileWidth = hexSize * 2;
            const tileHeight = hexSize * Math.sqrt(3);
            const numberLabel = formatNumber(cell.value);
            const digitCount = numberLabel.length;
            const numberScale = digitCount <= 2 ? 0.5 : digitCount === 3 ? 0.4 : digitCount === 4 ? 0.33 : 0.27;
            const showMilestoneMarker = !targetCoverVisible;
            const isHalfTarget = showMilestoneMarker && cell.value === levelTarget(level) / 2;
            const isGoalTarget = showMilestoneMarker && cell.value === levelTarget(level);
            return (
              <Animated.View
                pointerEvents="none"
                key={`${level}-${cell.id}`}
                style={[
                  styles.tile,
                  {
                    left: cell.x - tileWidth / 2,
                    top: cell.y - tileHeight / 2,
                    width: tileWidth,
                    height: tileHeight,
                    zIndex: isVictoryTarget ? 25 : active ? 10 : 1,
                    elevation: isVictoryTarget ? 14 : active ? 8 : 0,
                    opacity: victoryActive && !isVictoryTarget ? 0.64 : mergeFade,
                    transform: [
                      { translateY: dropValue },
                      { translateX: mergeOffset.x },
                      { translateY: mergeOffset.y },
                      {
                        translateY: victoryValue.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, isVictoryTarget ? -hexSize * 0.34 : -hexSize * 0.11],
                        }),
                      },
                      {
                        translateY: liftValue.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -hexSize * 0.16],
                        }),
                      },
                      {
                        scale: liftValue.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.06],
                        }),
                      },
                      {
                        scale: victoryValue.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, isVictoryTarget ? 1.2 : 1.055],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Svg width={tileWidth} height={tileHeight}>
                  <Polygon
                    points={hexPoints(tileWidth / 2, tileHeight / 2 + hexSize * 0.08, hexSize * 0.75)}
                    fill={getTileStroke(cell.value)}
                  />
                  <Polygon
                    points={hexPoints(tileWidth / 2, tileHeight / 2, hexSize * 0.75)}
                    fill={getTileColor(cell.value)}
                    stroke={isVictoryTarget || isGoalTarget ? '#FFD35A' : active ? '#FFF4D6' : isHalfTarget ? '#FFD35A' : getTileStroke(cell.value)}
                    strokeWidth={isVictoryTarget ? 5.5 : isGoalTarget ? 4.5 : active ? 4.5 : isHalfTarget ? 3.8 : 2.5}
                  />
                  <SvgText
                    x={tileWidth / 2}
                    y={tileHeight / 2 + hexSize * numberScale * 0.34}
                    textAnchor="middle"
                    fontSize={hexSize * numberScale}
                    fontWeight="900"
                    fill={cell.value === 2 ? '#72462D' : '#FFF7E8'}
                  >
                    {numberLabel}
                  </SvgText>
                  {(isHalfTarget || isGoalTarget) && (
                    <>
                      <Circle
                        cx={tileWidth * 0.72}
                        cy={tileHeight * 0.24}
                        r={hexSize * 0.17}
                        fill={isGoalTarget ? '#55B6A5' : '#FFD35A'}
                        stroke="#FFF3C4"
                        strokeWidth={1.2}
                      />
                      <SvgText
                        x={tileWidth * 0.72}
                        y={tileHeight * 0.24 + hexSize * 0.09}
                        textAnchor="middle"
                        fontSize={hexSize * 0.2}
                        fontWeight="900"
                        fill="#7B2034"
                      >
                        {isGoalTarget ? '✓' : '★'}
                      </SvgText>
                    </>
                  )}
                </Svg>
              </Animated.View>
            );
          })}
          {victoryActive && victoryCell && (
            <Svg pointerEvents="none" width={boardWidth} height={boardHeight} style={StyleSheet.absoluteFill}>
              {Array.from({ length: 8 }, (_, index) => {
                const angle = (Math.PI * 2 * index) / 8;
                const inner = hexSize * 0.72;
                const outer = hexSize * 1.08;
                return (
                  <React.Fragment key={`victory-particle-${index}`}>
                    <Line
                      x1={victoryCell.x + Math.cos(angle) * inner}
                      y1={victoryCell.y + Math.sin(angle) * inner}
                      x2={victoryCell.x + Math.cos(angle) * outer}
                      y2={victoryCell.y + Math.sin(angle) * outer}
                      stroke="#FFD35A"
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                    <Circle
                      cx={victoryCell.x + Math.cos(angle) * outer}
                      cy={victoryCell.y + Math.sin(angle) * outer}
                      r={index % 2 === 0 ? 3.2 : 2.3}
                      fill={index % 2 === 0 ? '#FFF3C4' : '#FF8A1F'}
                    />
                  </React.Fragment>
                );
              })}
            </Svg>
          )}
        </Animated.View>

        {tutorialActive && (
          <View style={[styles.tutorialProgressCard, compactHeight && styles.infoCardCompact]}>
            <Text style={styles.tutorialProgressLabel}>{text.tutorialProgress}</Text>
            <Text style={styles.tutorialProgressValue}>{tutorialCompletedZones.length} / {TUTORIAL_ZONES.length}</Text>
            <View style={styles.tutorialProgressDots}>
              {TUTORIAL_ZONES.map((zone) => (
                <View
                  key={`tutorial-progress-${zone.id}`}
                  style={[
                    styles.tutorialProgressDot,
                    tutorialCompletedZones.includes(zone.id) && styles.tutorialProgressDotActive,
                  ]}
                />
              ))}
            </View>
          </View>
        )}
        {!tutorialActive && (
        <View style={[styles.infoCard, compactHeight && styles.infoCardCompact]}>
          <View style={styles.milestonePoint}>
            <View style={[styles.milestoneBadge, halfTargetReached && styles.milestoneBadgeHalfActive]}>
              <Text style={[styles.milestoneBadgeText, halfTargetReached && styles.milestoneBadgeTextActive]}>★</Text>
            </View>
            <Text style={[styles.milestoneValue, halfTargetReached && styles.milestoneValueActive]}>{formatNumber(halfTarget)}</Text>
            <Text style={styles.milestoneLabel}>{text.half}</Text>
          </View>
          <View style={styles.goalRoad}>
            <View style={styles.goalRoadRail} />
            <Animated.View
              style={[
                styles.goalRoadFill,
                fullTargetReached && styles.goalRoadFillComplete,
                {
                  opacity: halfTargetReached ? 1 : 0,
                  width: goalPathProgressRef.current.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['4%', '100%'],
                  }),
                },
              ]}
            />
            <Text style={styles.goalRoadMarks}>›  ›  ›</Text>
            {halfTargetReached && (
              <Animated.View
                style={[
                  styles.goalRoadRunner,
                  fullTargetReached && styles.goalRoadRunnerComplete,
                  {
                    left: goalPathProgressRef.current.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '94%'],
                    }),
                  },
                ]}
              />
            )}
          </View>
          <View style={styles.milestonePoint}>
            <View style={[styles.milestoneBadge, fullTargetReached && styles.milestoneBadgeGoalActive]}>
              <Text style={[styles.milestoneBadgeText, fullTargetReached && styles.milestoneBadgeTextActive]}>✓</Text>
            </View>
            <Text style={[styles.milestoneValue, fullTargetReached && styles.milestoneValueActive]}>{formatNumber(currentTarget)}</Text>
            <Text style={styles.milestoneLabel}>{text.target}</Text>
          </View>
        </View>
        )}

        {tutorialActive ? (
          <View style={[styles.tutorialGoalCard, compactHeight && styles.bannerSlotCompact]}>
            <View style={styles.tutorialGoalCardHeading}>
              <Text style={styles.tutorialGoalCardStep}>{activeTutorialZone.id} / {TUTORIAL_ZONES.length}</Text>
              <Text style={styles.tutorialGoalCardLabel}>{text.target} {activeTutorialZone.target}</Text>
            </View>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={styles.tutorialGoalCardPath}>
              {activeTutorialZone.values.join('  ›  ')}
            </Text>
            <Text style={styles.tutorialGoalCardHint}>{text.tutorialInstruction}</Text>
          </View>
        ) : (
          <View style={[styles.bannerSlot, compactHeight && styles.bannerSlotCompact]}>
            <FuduBannerAd language={language} />
          </View>
        )}
        <Text style={[styles.hint, compactHeight && styles.hintCompact]}>
          {tutorialActive ? text.tutorialTitle : text.gameHint}
        </Text>
        {tutorialActive && tutorialSuccess && (
          <View style={styles.tutorialSuccessLayer} pointerEvents="auto">
            <Animated.View
              style={[
                styles.tutorialSuccessCard,
                {
                  opacity: completionTransitionRef.current.interpolate({
                    inputRange: [0, 1, 2],
                    outputRange: [0, 1, 0],
                  }),
                  transform: [{
                    scale: completionTransitionRef.current.interpolate({
                      inputRange: [0, 1, 2],
                      outputRange: [0.76, 1, 1.08],
                    }),
                  }],
                },
              ]}
            >
              <View style={styles.tutorialSuccessBadge}><Text style={styles.tutorialSuccessBadgeText}>✓</Text></View>
              <Text style={styles.tutorialSuccessTitle}>{text.tutorialSuccess}</Text>
              <Text style={styles.tutorialSuccessNumber}>32</Text>
              <Text style={styles.tutorialSuccessText}>{text.tutorialSuccessText}</Text>
              <TouchableOpacity style={styles.continueButton} onPress={continueFromTutorial} activeOpacity={0.82}>
                <Text style={styles.continueButtonText}>{text.startFirstLevel}  ›</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
        {targetCoverVisible && targetCover && (
          <View style={styles.targetCoverLayer} pointerEvents="auto">
            <Animated.View
              style={[
                styles.targetCoverHex,
                {
                  left: targetCover.x - targetCoverWidth / 2,
                  top: targetCover.y - targetCoverHeight / 2,
                  width: targetCoverWidth,
                  height: targetCoverHeight,
                  opacity: targetCoverTransitionRef.current.interpolate({
                    inputRange: [0, 1, 1.88, 2],
                    outputRange: [1, 1, 1, 0],
                  }),
                  transform: [{
                    scale: targetCoverTransitionRef.current.interpolate({
                      inputRange: [0, 1, 2],
                      outputRange: [1, targetCoverScale, 0.04],
                    }),
                  }],
                },
              ]}
            >
              <Svg width={targetCoverWidth} height={targetCoverHeight}>
                <Polygon
                  points={hexPoints(targetCoverWidth / 2, targetCoverHeight / 2, hexSize * 0.76)}
                  fill={getTileColor(targetCover.value)}
                  stroke="#FFD35A"
                  strokeWidth={4.5}
                />
              </Svg>
            </Animated.View>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.targetCoverLabel,
                {
                  left: targetCover.x - targetCoverWidth / 2,
                  top: targetCover.y - targetCoverHeight / 2,
                  width: targetCoverWidth,
                  height: targetCoverHeight,
                  opacity: targetCoverTransitionRef.current.interpolate({
                    inputRange: [0, 0.55, 1, 2],
                    outputRange: [1, 0.45, 0, 0],
                  }),
                  transform: [{
                    scale: targetCoverTransitionRef.current.interpolate({
                      inputRange: [0, 1, 2],
                      outputRange: [1, targetCoverScale, 0.04],
                    }),
                  }],
                },
              ]}
            >
              <Text style={styles.targetCoverNumber}>{formatNumber(targetCover.value)}</Text>
              <View style={styles.targetCoverBadge}><Text style={styles.targetCoverBadgeText}>✓</Text></View>
            </Animated.View>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.completionDecor,
                {
                  opacity: completionTransitionRef.current.interpolate({
                    inputRange: [0, 0.72, 1, 2],
                    outputRange: [0, 0, 0.72, 0],
                  }),
                  transform: [{
                    scale: completionTransitionRef.current.interpolate({
                      inputRange: [0, 1, 2],
                      outputRange: [0.65, 1, 1.18],
                    }),
                  }],
                },
              ]}
            >
              <Text style={[styles.completionSpark, styles.completionSparkOne]}>✦</Text>
              <Text style={[styles.completionSpark, styles.completionSparkTwo]}>✦</Text>
              <Text style={[styles.completionSpark, styles.completionSparkThree]}>◆</Text>
              <View style={[styles.completionRing, styles.completionRingOne]} />
              <View style={[styles.completionRing, styles.completionRingTwo]} />
            </Animated.View>
            <Animated.View
              style={[
                styles.coverContent,
                {
                  opacity: completionTransitionRef.current.interpolate({
                    inputRange: [0, 1, 2],
                    outputRange: [0, 1, 0],
                  }),
                  transform: [{
                    scale: completionTransitionRef.current.interpolate({
                      inputRange: [0, 1, 2],
                      outputRange: [0.85, 1, 0.94],
                    }),
                  }, {
                    translateY: completionTransitionRef.current.interpolate({
                      inputRange: [0, 1, 2],
                      outputRange: [24, 0, -16],
                    }),
                  }],
                },
              ]}
            >
              <View style={styles.completionBadge}>
                <View style={styles.completionBadgeCheck}><Text style={styles.completionBadgeCheckText}>✓</Text></View>
                <Text style={styles.completionBadgeText}>{text.levelComplete}  •  {text.level} {level}</Text>
              </View>
              <Text style={styles.completedTargetLabel}>{text.completedTarget}</Text>
              <View style={styles.completedTargetPill}>
                <Text style={styles.completedTargetCheck}>✓</Text>
                <Text style={styles.completedTargetValue}>{formatNumber(currentTarget)}</Text>
              </View>
              <View style={styles.completionDividerRow}>
                <View style={styles.completionDividerLine} />
                <Text style={styles.completionDividerStar}>✦</Text>
                <View style={styles.completionDividerLine} />
              </View>
              <Text style={styles.levelCompleteSmall}>{text.nextTarget}</Text>
              <View style={styles.nextTargetPanel}>
                <View style={styles.nextTargetHex}><Text style={styles.nextTargetHexText}>◆</Text></View>
                <Text style={[styles.levelCompleteTitle, { fontSize: nextTargetFontSize }]}>{nextTargetDisplay}</Text>
              </View>
              <Text style={styles.levelCompleteText}>{text.ready}</Text>
              <Text style={styles.levelCompleteHint}>{text.nextBoardHint}</Text>
              <TouchableOpacity style={styles.continueButton} onPress={continueToNextLevel} activeOpacity={0.82}>
                <Text style={styles.continueButtonText}>{text.continue}  ›</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
      </View>
        )}
    </SafeAreaView>
    <Modal
      visible={settingsVisible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => setSettingsVisible(false)}
    >
      <View style={styles.settingsBackdrop}>
        <View style={[styles.settingsPanel, { width: Math.min(width - 34, 390) }]}>
          <View style={styles.settingsHeader}>
            <View>
              <Text style={styles.settingsEyebrow}>FUDU HEX</Text>
              <Text style={styles.settingsTitle}>{text.settings}</Text>
            </View>
            <TouchableOpacity
              style={styles.settingsCloseIcon}
              onPress={() => {
                playSound(buttonPlayer, 0.3);
                setSettingsVisible(false);
              }}
              activeOpacity={0.76}
            >
              <Text style={styles.settingsCloseIconText}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLabelGroup}>
              <Text style={styles.settingSymbol}>♫</Text>
              <View>
                <Text style={styles.settingName}>{text.music}</Text>
                <Text style={styles.settingState}>{musicEnabled ? text.on : text.off}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.settingToggle, musicEnabled && styles.settingToggleActive]}
              onPress={() => {
                playSound(buttonPlayer, 0.3);
                setMusicEnabled((current) => !current);
              }}
              activeOpacity={0.82}
            >
              <View style={[styles.settingToggleKnob, musicEnabled && styles.settingToggleKnobActive]} />
            </TouchableOpacity>
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingRow}>
            <View style={styles.settingLabelGroup}>
              <Text style={styles.settingSymbol}>♪</Text>
              <View>
                <Text style={styles.settingName}>{text.sound}</Text>
                <Text style={styles.settingState}>{soundEnabled ? text.on : text.off}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.settingToggle, soundEnabled && styles.settingToggleActive]}
              onPress={() => {
                playSound(buttonPlayer, 0.3);
                setSoundEnabled((current) => !current);
              }}
              activeOpacity={0.82}
            >
              <View style={[styles.settingToggleKnob, soundEnabled && styles.settingToggleKnobActive]} />
            </TouchableOpacity>
          </View>

          <View style={styles.settingLanguageBlock}>
            <Text style={styles.settingLanguageTitle}>{text.language}</Text>
            <View style={styles.languageTabs}>
              {['tr', 'en'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.languageTab, language === option && styles.languageTabActive]}
                  onPress={() => {
                    playSound(buttonPlayer, 0.28);
                    setLanguage(option);
                  }}
                  activeOpacity={0.82}
                >
                  <Text style={[styles.languageTabText, language === option && styles.languageTabTextActive]}>
                    {option === 'tr' ? text.turkish : text.english}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.settingsDoneButton}
            onPress={() => {
              playSound(buttonPlayer, 0.34);
              setSettingsVisible(false);
            }}
            activeOpacity={0.82}
          >
            <Text style={styles.settingsDoneText}>{text.close}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    {introVisible && (
      <View style={styles.introOverlay} pointerEvents="auto">
        <Animated.Image
          source={require('./assets/fudu-splash.png')}
          resizeMode="cover"
          style={[
            styles.introImage,
            {
              opacity: introTransitionRef.current.interpolate({
                inputRange: [0, 0.22, 1, 2],
                outputRange: [0, 1, 1, 0],
              }),
              transform: [
                {
                  scale: introTransitionRef.current.interpolate({
                    inputRange: [0, 1, 2],
                    outputRange: [1.08, 1, 0.96],
                  }),
                },
                {
                  translateY: introTransitionRef.current.interpolate({
                    inputRange: [0, 1, 2],
                    outputRange: [18, 0, -18],
                  }),
                },
              ],
            },
          ]}
        />
      </View>
    )}
    {saveLoaded && !languageSelected && (
      <View style={styles.languageWelcomeOverlay} pointerEvents="auto">
        <View style={[styles.languageWelcomeCard, { width: Math.min(width - 34, 390) }]}>
          <View style={styles.languageWelcomeMark}>
            <Text style={styles.languageWelcomeMarkText}>F</Text>
          </View>
          <Text style={styles.languageWelcomeBrand}>FUDU HEX</Text>
          <Text style={styles.languageWelcomeTitle}>Dilini seç</Text>
          <Text style={styles.languageWelcomeSubtitle}>Choose your language</Text>
          <View style={styles.languageWelcomeButtons}>
            <TouchableOpacity
              style={styles.languageWelcomeButton}
              activeOpacity={0.82}
              onPress={() => {
                setLanguage('tr');
                AsyncStorage.setItem(LANGUAGE_SELECTED_KEY, 'done').catch(() => {});
                setLanguageSelected(true);
              }}
            >
              <Text style={styles.languageWelcomeFlag}>TR</Text>
              <View style={styles.languageWelcomeButtonCopy}>
                <Text style={styles.languageWelcomeButtonTitle}>TÜRKÇE</Text>
                <Text style={styles.languageWelcomeButtonHint}>Türkçe devam et</Text>
              </View>
              <Text style={styles.languageWelcomeArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.languageWelcomeButton, styles.languageWelcomeButtonEnglish]}
              activeOpacity={0.82}
              onPress={() => {
                setLanguage('en');
                AsyncStorage.setItem(LANGUAGE_SELECTED_KEY, 'done').catch(() => {});
                setLanguageSelected(true);
              }}
            >
              <Text style={[styles.languageWelcomeFlag, styles.languageWelcomeFlagEnglish]}>EN</Text>
              <View style={styles.languageWelcomeButtonCopy}>
                <Text style={styles.languageWelcomeButtonTitle}>ENGLISH</Text>
                <Text style={styles.languageWelcomeButtonHint}>Continue in English</Text>
              </View>
              <Text style={styles.languageWelcomeArrow}>›</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.languageWelcomeFootnote}>Daha sonra Ayarlar’dan değiştirebilirsin.{`\n`}You can change this later in Settings.</Text>
        </View>
      </View>
    )}
      </ImageBackground>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#761C38' },
  backgroundImage: { opacity: 0.95 },
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  languageWelcomeOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100, elevation: 100, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 17, backgroundColor: '#270713F2' },
  languageWelcomeCard: { paddingHorizontal: 22, paddingTop: 24, paddingBottom: 20, alignItems: 'center', borderRadius: 28, backgroundColor: '#57152FFB', borderWidth: 2, borderColor: '#D78670', shadowColor: '#17030A', shadowOpacity: 0.85, shadowRadius: 20, shadowOffset: { width: 0, height: 12 }, elevation: 101 },
  languageWelcomeMark: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F57A24', borderWidth: 2, borderColor: '#FFC47C', transform: [{ rotate: '30deg' }], shadowColor: '#22050D', shadowOpacity: 0.55, shadowRadius: 7, shadowOffset: { width: 0, height: 5 }, elevation: 8 },
  languageWelcomeMarkText: { color: '#FFF1D2', fontSize: 34, fontWeight: '900', transform: [{ rotate: '-30deg' }], textShadowColor: '#A9371B', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 1 },
  languageWelcomeBrand: { color: '#58CDB7', fontSize: 9, fontWeight: '900', letterSpacing: 3.1, marginTop: 16 },
  languageWelcomeTitle: { color: '#FFF0CF', fontSize: 25, fontWeight: '900', letterSpacing: 0.6, marginTop: 5 },
  languageWelcomeSubtitle: { color: '#E6A694', fontSize: 12, fontWeight: '700', marginTop: 2 },
  languageWelcomeButtons: { width: '100%', marginTop: 20 },
  languageWelcomeButton: { width: '100%', minHeight: 62, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderRadius: 18, backgroundColor: '#F36C27', borderWidth: 1.5, borderColor: '#FFB16A', borderBottomWidth: 5, borderBottomColor: '#A92F1B' },
  languageWelcomeButtonEnglish: { marginTop: 11, backgroundColor: '#238E86', borderColor: '#6BD7C2', borderBottomColor: '#155C59' },
  languageWelcomeFlag: { width: 38, height: 38, borderRadius: 12, color: '#FFF4DC', fontSize: 12, fontWeight: '900', lineHeight: 38, textAlign: 'center', backgroundColor: '#B83B25', borderWidth: 1, borderColor: '#FFAA70', overflow: 'hidden' },
  languageWelcomeFlagEnglish: { backgroundColor: '#176B68', borderColor: '#72D8C5' },
  languageWelcomeButtonCopy: { flex: 1, marginLeft: 12 },
  languageWelcomeButtonTitle: { color: '#FFF8E9', fontSize: 14, fontWeight: '900', letterSpacing: 1.2 },
  languageWelcomeButtonHint: { color: '#FFE0BC', fontSize: 9, fontWeight: '700', marginTop: 2 },
  languageWelcomeArrow: { color: '#FFF3D6', fontSize: 28, fontWeight: '900', marginLeft: 8, marginTop: -2 },
  languageWelcomeFootnote: { color: '#D89589', fontSize: 9, fontWeight: '700', lineHeight: 14, textAlign: 'center', marginTop: 16 },
  container: { flex: 1, alignItems: 'center', paddingTop: 8, paddingHorizontal: 10, paddingBottom: 5 },
  containerCompact: { paddingTop: 3, paddingBottom: 2 },
  homeScreen: { flex: 1, width: '100%', alignSelf: 'center', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden', paddingTop: 8, paddingBottom: 8 },
  homeBackdrop: { ...StyleSheet.absoluteFillObject, alignItems: 'center' },
  homeSettingsWrap: { position: 'absolute', top: 8, right: 1, zIndex: 20, elevation: 20 },
  settingsIconButton: { width: 39, height: 39, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#51162EDD', borderWidth: 1.5, borderColor: '#A84E62', shadowColor: '#280610', shadowOpacity: 0.46, shadowRadius: 5, shadowOffset: { width: 0, height: 4 }, elevation: 7 },
  settingsIcon: { color: '#FFE5BD', fontSize: 20, fontWeight: '900', lineHeight: 23 },
  homeHero: { flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: 430, paddingTop: 4 },
  homeKicker: { color: '#E9A68F', fontSize: 9, fontWeight: '900', letterSpacing: 3.1, marginBottom: 13 },
  homeIconFrame: { padding: 4, borderRadius: 40, backgroundColor: '#5A142ECC', borderWidth: 1.5, borderColor: '#C56869', shadowColor: '#250611', shadowOpacity: 0.7, shadowRadius: 18, shadowOffset: { width: 0, height: 12 }, elevation: 16 },
  homeIcon: { borderRadius: 35 },
  homeTitleRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 14 },
  homeTitle: { color: '#FFF0CF', fontWeight: '900', letterSpacing: 1.4, textShadowColor: '#4B1024', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 3 },
  homeTitleHex: { color: '#5DD1B9', fontWeight: '900', marginLeft: 9, letterSpacing: 1.2, textShadowColor: '#164F4C', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 2 },
  homeSubtitle: { color: '#EFBDAA', fontSize: 12, fontWeight: '700', letterSpacing: 0.2, marginTop: 2 },
  homeActions: { width: '100%', maxWidth: 430, paddingBottom: 10 },
  homePlayButton: { minHeight: 64, borderRadius: 19, backgroundColor: '#F56B28', borderWidth: 1.5, borderColor: '#FFB16A', borderBottomWidth: 6, borderBottomColor: '#A92F1B', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#280710', shadowOpacity: 0.62, shadowRadius: 10, shadowOffset: { width: 0, height: 7 }, elevation: 12 },
  homePlayIconBadge: { position: 'absolute', left: 18, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D94D22', borderWidth: 1, borderColor: '#FF9E61' },
  homePlayIcon: { color: '#FFF5E5', fontSize: 13, marginLeft: 2, textShadowColor: '#8C2517', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  homePlayLabel: { alignItems: 'center', justifyContent: 'center' },
  homePlayText: { color: '#FFF7E9', fontSize: 18, fontWeight: '900', letterSpacing: 2.1, textShadowColor: '#9C2A18', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 1 },
  homePlayMeta: { color: '#FFE1AD', fontSize: 9, fontWeight: '900', letterSpacing: 1.35, marginTop: 2 },
  homeActionHint: { color: '#D99C91', fontSize: 9, fontWeight: '700', textAlign: 'center', marginTop: 10, letterSpacing: 0.35 },
  homeProducer: { minHeight: 32, marginTop: 1, paddingHorizontal: 5, paddingVertical: 2, flexDirection: 'row', alignItems: 'center', opacity: 0.9 },
  homeProducerCompact: { minHeight: 27, marginTop: 0 },
  homeProducerLogo: { width: 25, height: 25, marginRight: 8, borderRadius: 7 },
  homeProducerLogoCompact: { width: 22, height: 22, borderRadius: 6 },
  homeProducerName: { color: '#E9B6A3', fontSize: 9, fontWeight: '900', letterSpacing: 1.8 },
  header: { width: '100%', maxWidth: 430, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 6, marginBottom: 8 },
  headerCompact: { marginBottom: 4 },
  headerNarrow: { paddingHorizontal: 2 },
  logoCard: { backgroundColor: '#5B1731', borderRadius: 16, borderWidth: 2, borderColor: '#9D4A59', paddingHorizontal: 15, paddingVertical: 4, flexDirection: 'row', alignItems: 'baseline', shadowColor: '#2D0718', shadowOpacity: 0.5, shadowRadius: 5, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  logoCardNarrow: { paddingHorizontal: 10, borderRadius: 14 },
  title: { color: '#FFD68B', fontWeight: '900', fontSize: 25, letterSpacing: 0.5, textShadowColor: '#8D341E', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 1 },
  titleNarrow: { fontSize: 21 },
  logoHex: { color: '#56B6A7', fontWeight: '900', fontSize: 19, marginLeft: 6, letterSpacing: 0.8, textShadowColor: '#164F4C', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 1 },
  logoHexNarrow: { fontSize: 16, marginLeft: 4 },
  scoreCard: { backgroundColor: '#FFE4BA', borderRadius: 20, borderWidth: 2, borderColor: '#FFF0D3', paddingHorizontal: 13, paddingVertical: 7, minWidth: 146, alignItems: 'center', shadowColor: '#401122', shadowOpacity: 0.45, shadowRadius: 5, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  scoreCardWithSettings: { minWidth: 118, marginRight: 46, paddingHorizontal: 8 },
  scoreCardNarrow: { minWidth: 103, marginRight: 42, paddingHorizontal: 5 },
  gameSettingsButton: { position: 'absolute', right: 4, top: 1 },
  scoreLabel: { color: '#7B2034', fontSize: 8, fontWeight: '900', letterSpacing: 0.45 },
  score: { color: '#721C30', fontSize: 21, fontWeight: '900' },
  boardShell: { backgroundColor: '#A95F50', borderRadius: 24, borderWidth: 3, borderColor: '#D79373', overflow: 'hidden', shadowColor: '#300814', shadowOpacity: 0.55, shadowRadius: 8, shadowOffset: { width: 0, height: 6 }, elevation: 9 },
  tile: { position: 'absolute' },
  tutorialGuide: { position: 'absolute', left: 18, right: 18, top: 16, zIndex: 20, paddingHorizontal: 13, paddingVertical: 10, alignItems: 'center', backgroundColor: '#4A1329E8', borderRadius: 16, borderWidth: 1.5, borderColor: '#E6A276' },
  tutorialGuideTitle: { color: '#FFF0C9', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  tutorialGuidePath: { color: '#63D2BD', fontSize: 14, fontWeight: '900', marginTop: 4, letterSpacing: 0.5 },
  tutorialGuideText: { color: '#EFBDAA', fontSize: 9, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  tutorialZone: { position: 'absolute', zIndex: 5, borderRadius: 18, borderWidth: 1.5, borderColor: '#E5A27A', backgroundColor: '#5B203033' },
  tutorialZoneCompleted: { borderColor: '#63D2BD', backgroundColor: '#2D7D7140' },
  tutorialZoneLabel: { position: 'absolute', left: 5, right: 5, bottom: -22, height: 22, paddingHorizontal: 7, borderRadius: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: '#3E1023FA', borderWidth: 1, borderColor: '#D68A6E', zIndex: 8, elevation: 8 },
  tutorialZoneLabelCompleted: { backgroundColor: '#246D65ED', borderColor: '#8CE8D4' },
  tutorialZoneLabelText: { color: '#FFD574', fontSize: 7, fontWeight: '900', letterSpacing: 0.35, marginRight: 7 },
  tutorialZonePath: { flex: 1, color: '#FFF0C9', fontSize: 7, fontWeight: '900', textAlign: 'right', letterSpacing: 0.15 },
  levelOverlay: { position: 'absolute', left: '15%', right: '15%', top: '39%', paddingVertical: 18, alignItems: 'center', backgroundColor: '#5B1731F2', borderRadius: 22, borderWidth: 3, borderColor: '#FFD38C', shadowColor: '#2D0718', shadowOpacity: 0.7, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 30, zIndex: 30 },
  levelCompleteSmall: { color: '#63CBB7', fontSize: 10, fontWeight: '900', letterSpacing: 2.6, marginBottom: 8 },
  levelCompleteTitle: { color: '#FFF0C9', fontSize: 34, fontWeight: '900', letterSpacing: 0.5, textShadowColor: '#4A1024', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 2 },
  levelCompleteText: { color: '#FFF3D9', fontSize: 15, fontWeight: '900', letterSpacing: 1.8, marginTop: 13 },
  levelCompleteHint: { color: '#DEA08E', fontSize: 10, fontWeight: '700', marginTop: 3 },
  targetCoverLayer: { ...StyleSheet.absoluteFillObject, zIndex: 50, elevation: 50, overflow: 'hidden' },
  targetCoverHex: { position: 'absolute', zIndex: 51 },
  targetCoverLabel: { position: 'absolute', zIndex: 52, alignItems: 'center', justifyContent: 'center' },
  targetCoverNumber: { color: '#FFF7E8', fontSize: 17, fontWeight: '900' },
  targetCoverBadge: { position: 'absolute', top: 2, right: 5, width: 13, height: 13, borderRadius: 7, backgroundColor: '#55B6A5', borderWidth: 1.2, borderColor: '#FFF3C4', alignItems: 'center', justifyContent: 'center' },
  targetCoverBadgeText: { color: '#7B2034', fontSize: 8, fontWeight: '900', lineHeight: 9 },
  completionDecor: { ...StyleSheet.absoluteFillObject, zIndex: 56 },
  completionSpark: { position: 'absolute', color: '#FFF0A7', fontSize: 25, fontWeight: '900', textShadowColor: '#6D1B31', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 2 },
  completionSparkOne: { top: '19%', left: '10%', transform: [{ rotate: '-14deg' }] },
  completionSparkTwo: { top: '25%', right: '10%', fontSize: 19, color: '#63D2BD', transform: [{ rotate: '17deg' }] },
  completionSparkThree: { bottom: '24%', left: '13%', fontSize: 13, color: '#FF9868', transform: [{ rotate: '28deg' }] },
  completionRing: { position: 'absolute', width: 18, height: 18, borderRadius: 9, borderWidth: 3, borderColor: '#FFD36B' },
  completionRingOne: { top: '18%', right: '20%' },
  completionRingTwo: { bottom: '21%', right: '13%', width: 12, height: 12, borderRadius: 6, borderColor: '#63D2BD' },
  coverContent: { position: 'absolute', left: '9%', right: '9%', top: '24%', zIndex: 60, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 22, alignItems: 'center', backgroundColor: '#54152FF5', borderRadius: 28, borderWidth: 2.5, borderColor: '#FFD38C', shadowColor: '#2D0718', shadowOpacity: 0.78, shadowRadius: 16, shadowOffset: { width: 0, height: 9 }, elevation: 60 },
  completionBadge: { minHeight: 30, paddingHorizontal: 13, paddingVertical: 5, borderRadius: 15, flexDirection: 'row', alignItems: 'center', backgroundColor: '#35101F', borderWidth: 1, borderColor: '#8E3D51' },
  completionBadgeCheck: { width: 18, height: 18, marginRight: 7, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#55B6A5', borderWidth: 1, borderColor: '#CFFFF3' },
  completionBadgeCheckText: { color: '#55152E', fontSize: 10, fontWeight: '900', lineHeight: 11 },
  completionBadgeText: { color: '#FFE1AC', fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  completedTargetLabel: { color: '#DFA68E', fontSize: 8, fontWeight: '900', letterSpacing: 1.7, marginTop: 13 },
  completedTargetPill: { minWidth: 110, minHeight: 39, marginTop: 6, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#24101B', borderRadius: 15, borderWidth: 1.5, borderColor: '#55B6A5' },
  completedTargetCheck: { color: '#63D2BD', fontSize: 17, fontWeight: '900', marginRight: 8 },
  completedTargetValue: { color: '#FFF0C9', fontSize: 20, fontWeight: '900' },
  completionDividerRow: { width: '78%', flexDirection: 'row', alignItems: 'center', marginVertical: 13 },
  completionDividerLine: { flex: 1, height: 1, backgroundColor: '#914152' },
  completionDividerStar: { color: '#FFD36B', fontSize: 10, marginHorizontal: 9 },
  nextTargetPanel: { width: '100%', minHeight: 72, paddingLeft: 54, paddingRight: 12, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3B1022', borderWidth: 1.5, borderColor: '#8F4052', shadowColor: '#250611', shadowOpacity: 0.48, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  nextTargetHex: { position: 'absolute', left: 14, width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#227F7A', borderWidth: 2, borderColor: '#63D2BD', transform: [{ rotate: '30deg' }] },
  nextTargetHexText: { color: '#D9FFF5', fontSize: 15, fontWeight: '900', transform: [{ rotate: '-30deg' }] },
  continueButton: { width: '100%', marginTop: 17, height: 48, paddingHorizontal: 22, borderRadius: 16, backgroundColor: '#FF681E', borderWidth: 2, borderColor: '#FFB25F', borderBottomWidth: 6, borderBottomColor: '#B73519', alignItems: 'center', justifyContent: 'center', shadowColor: '#27060E', shadowOpacity: 0.5, shadowRadius: 6, shadowOffset: { width: 0, height: 5 }, elevation: 8 },
  continueButtonText: { color: '#FFF3D9', fontSize: 13, fontWeight: '900', letterSpacing: 1.4 },
  infoCard: { width: '100%', maxWidth: 430, minHeight: 58, marginTop: 8, paddingHorizontal: 14, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#51162E', borderRadius: 17, borderWidth: 2, borderColor: '#873A51', shadowColor: '#2D0718', shadowOpacity: 0.4, shadowRadius: 4, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  infoCardCompact: { minHeight: 50, marginTop: 4, paddingVertical: 3 },
  tutorialProgressCard: { width: '100%', maxWidth: 430, minHeight: 58, marginTop: 8, paddingHorizontal: 16, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#51162E', borderRadius: 17, borderWidth: 2, borderColor: '#D99672', shadowColor: '#2D0718', shadowOpacity: 0.4, shadowRadius: 4, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  tutorialProgressLabel: { color: '#EFBDAA', fontSize: 8, fontWeight: '900', letterSpacing: 1.4, marginRight: 9 },
  tutorialProgressValue: { color: '#FFF0C9', fontSize: 18, fontWeight: '900', marginRight: 12 },
  tutorialProgressDots: { flexDirection: 'row', alignItems: 'center' },
  tutorialProgressDot: { width: 11, height: 11, marginHorizontal: 3, borderRadius: 6, backgroundColor: '#35101F', borderWidth: 1.5, borderColor: '#8D4052' },
  tutorialProgressDotActive: { backgroundColor: '#55B6A5', borderColor: '#CFFFF3' },
  milestonePoint: { width: 58, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  milestoneBadge: { width: 21, height: 21, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#35101F', borderWidth: 2, borderColor: '#7B3047' },
  milestoneBadgeHalfActive: { backgroundColor: '#FFD35A', borderColor: '#FFF0AD', shadowColor: '#FFD35A', shadowOpacity: 0.62, shadowRadius: 5, elevation: 4 },
  milestoneBadgeGoalActive: { backgroundColor: '#55B6A5', borderColor: '#BCE9D7', shadowColor: '#55B6A5', shadowOpacity: 0.68, shadowRadius: 6, elevation: 5 },
  milestoneBadgeText: { color: '#9D5666', fontSize: 11, fontWeight: '900', lineHeight: 13 },
  milestoneBadgeTextActive: { color: '#6D1B31' },
  milestoneValue: { color: '#B6757B', fontSize: 12, fontWeight: '900', lineHeight: 14, marginTop: 1 },
  milestoneValueActive: { color: '#FFF0CF' },
  milestoneLabel: { color: '#D9877E', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  goalRoad: { flex: 1, maxWidth: 220, height: 28, marginHorizontal: 2, justifyContent: 'center' },
  goalRoadRail: { position: 'absolute', left: 0, right: 0, top: 11, height: 6, borderRadius: 3, backgroundColor: '#35101F', borderWidth: 1, borderColor: '#763047' },
  goalRoadFill: { position: 'absolute', left: 0, top: 11, height: 6, borderRadius: 3, backgroundColor: '#FFD35A' },
  goalRoadFillComplete: { backgroundColor: '#55B6A5' },
  goalRoadMarks: { color: '#B87377', fontSize: 12, fontWeight: '900', textAlign: 'center', letterSpacing: 7, marginLeft: 7, marginTop: -1, opacity: 0.65 },
  goalRoadRunner: { position: 'absolute', top: 8, width: 12, height: 12, marginLeft: -2, borderRadius: 6, backgroundColor: '#FFD35A', borderWidth: 2, borderColor: '#FFF2B8', shadowColor: '#FFD35A', shadowOpacity: 0.8, shadowRadius: 4, elevation: 5 },
  goalRoadRunnerComplete: { backgroundColor: '#55B6A5', borderColor: '#D5FFF2', shadowColor: '#55B6A5' },
  bannerSlot: { width: '100%', maxWidth: 430, minHeight: 50, marginTop: 'auto', alignItems: 'center', justifyContent: 'center' },
  bannerSlotCompact: { minHeight: 48 },
  tutorialGoalCard: { width: '100%', maxWidth: 430, minHeight: 67, marginTop: 'auto', paddingHorizontal: 14, paddingVertical: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#3D1022', borderRadius: 13, borderWidth: 1.5, borderColor: '#E6A276' },
  tutorialGoalCardHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  tutorialGoalCardStep: { minWidth: 30, marginRight: 8, paddingHorizontal: 6, paddingVertical: 3, overflow: 'hidden', borderRadius: 8, color: '#DFFFF7', fontSize: 8, fontWeight: '900', textAlign: 'center', backgroundColor: '#237D75' },
  tutorialGoalCardLabel: { color: '#FFD35A', fontSize: 12, fontWeight: '900', letterSpacing: 1.4 },
  tutorialGoalCardPath: { width: '100%', color: '#FFF0CF', fontSize: 11, fontWeight: '900', textAlign: 'center', letterSpacing: 0.5, marginTop: 3 },
  tutorialGoalCardHint: { color: '#EFBDAA', fontSize: 7, fontWeight: '700', textAlign: 'center', marginTop: 3 },
  tutorialSuccessLayer: { ...StyleSheet.absoluteFillObject, zIndex: 70, elevation: 70, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 25, backgroundColor: '#2A0818D9' },
  tutorialSuccessCard: { width: '100%', maxWidth: 360, paddingHorizontal: 22, paddingTop: 25, paddingBottom: 22, alignItems: 'center', backgroundColor: '#54152FF8', borderRadius: 28, borderWidth: 2.5, borderColor: '#FFD38C', shadowColor: '#1D030C', shadowOpacity: 0.85, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 72 },
  tutorialSuccessBadge: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#55B6A5', borderWidth: 2.5, borderColor: '#D5FFF2' },
  tutorialSuccessBadgeText: { color: '#54152F', fontSize: 25, fontWeight: '900', lineHeight: 28 },
  tutorialSuccessTitle: { color: '#FFF0C9', fontSize: 24, fontWeight: '900', letterSpacing: 2, marginTop: 12 },
  tutorialSuccessNumber: { color: '#63D2BD', fontSize: 48, fontWeight: '900', marginTop: 5, textShadowColor: '#133F3C', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 2 },
  tutorialSuccessText: { color: '#EFBDAA', fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 3 },
  hint: { color: '#F7C9B1', fontSize: 11, fontWeight: '700', textAlign: 'center', marginTop: 5 },
  hintCompact: { fontSize: 9, marginTop: 2 },
  confetti: { position: 'absolute', width: 8, height: 8, borderRadius: 4, opacity: 0.9 },
  confettiOne: { backgroundColor: '#FF8A1F', top: 18, left: 7, transform: [{ rotate: '25deg' }] },
  confettiTwo: { backgroundColor: '#52B8A8', top: 72, right: 3, width: 7, height: 7 },
  confettiThree: { backgroundColor: '#FFCA58', bottom: 78, left: 2, width: 6, height: 6 },
  settingsBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 17, backgroundColor: '#260813D9' },
  settingsPanel: { padding: 20, borderRadius: 26, backgroundColor: '#5A1730', borderWidth: 2, borderColor: '#A84E62', shadowColor: '#150309', shadowOpacity: 0.8, shadowRadius: 18, shadowOffset: { width: 0, height: 11 }, elevation: 30 },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 17 },
  settingsEyebrow: { color: '#56C8B2', fontSize: 8, fontWeight: '900', letterSpacing: 2.5 },
  settingsTitle: { color: '#FFF0CF', fontSize: 25, fontWeight: '900', letterSpacing: 1, marginTop: 1 },
  settingsCloseIcon: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#431023', borderWidth: 1, borderColor: '#83384D' },
  settingsCloseIconText: { color: '#EFBDAA', fontSize: 27, fontWeight: '700', lineHeight: 29 },
  settingRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingLabelGroup: { flexDirection: 'row', alignItems: 'center' },
  settingSymbol: { width: 35, color: '#FFD176', fontSize: 23, fontWeight: '900' },
  settingName: { color: '#FFF0D5', fontSize: 13, fontWeight: '900', letterSpacing: 0.7 },
  settingState: { color: '#D38C82', fontSize: 8, fontWeight: '900', letterSpacing: 1.2, marginTop: 2 },
  settingToggle: { width: 53, height: 30, borderRadius: 15, padding: 3, justifyContent: 'center', backgroundColor: '#35101F', borderWidth: 1, borderColor: '#7B3047' },
  settingToggleActive: { backgroundColor: '#238E86', borderColor: '#62D1BC' },
  settingToggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#B57A78', shadowColor: '#19030A', shadowOpacity: 0.42, shadowRadius: 2, shadowOffset: { width: 0, height: 2 } },
  settingToggleKnobActive: { alignSelf: 'flex-end', backgroundColor: '#FFF0CF' },
  settingDivider: { height: 1, backgroundColor: '#81354B', opacity: 0.75 },
  settingLanguageBlock: { marginTop: 16 },
  settingLanguageTitle: { color: '#E6A593', fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 9 },
  languageTabs: { height: 45, padding: 3, borderRadius: 15, flexDirection: 'row', backgroundColor: '#3C1022', borderWidth: 1, borderColor: '#7B3047' },
  languageTab: { flex: 1, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  languageTabActive: { backgroundColor: '#FFE3B7', shadowColor: '#21040C', shadowOpacity: 0.36, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  languageTabText: { color: '#C9827D', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  languageTabTextActive: { color: '#701B31' },
  settingsDoneButton: { height: 46, marginTop: 18, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F56B28', borderWidth: 1.5, borderColor: '#FFAA65', borderBottomWidth: 5, borderBottomColor: '#A92F1B' },
  settingsDoneText: { color: '#FFF7E9', fontSize: 12, fontWeight: '900', letterSpacing: 1.8 },
  introOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100, elevation: 100, backgroundColor: '#761C38', overflow: 'hidden' },
  introImage: { width: '100%', height: '100%' },
});
