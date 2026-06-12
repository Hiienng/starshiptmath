import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { setMuted } from '../utils/soundManager';

const LanguageContext = createContext();

export const LANGUAGES = {
  en:    'en',
  es:    'es',
  ptBR:  'pt-BR',
  fil:   'fil',
  hi:    'hi',
  id:    'id',
};

export const LANGUAGE_LABELS = {
  en:   'English',
  es:   'Español',
  ptBR: 'Português (BR)',
  fil:  'Filipino',
  hi:   'हिन्दी',
  id:   'Indonesia',
};

// Map device locale (e.g. "pt-BR", "en-US", "fil-PH") to one of LANGUAGES.
const detectLocale = () => {
  try {
    const locales = Localization.getLocales?.() ?? [];
    const tag = (locales[0]?.languageTag ?? 'en').toLowerCase();
    const lang = tag.split('-')[0];
    if (tag.startsWith('pt')) return LANGUAGES.ptBR;        // any Portuguese → BR
    if (lang === 'es') return LANGUAGES.es;
    if (lang === 'fil' || lang === 'tl') return LANGUAGES.fil;
    if (lang === 'hi') return LANGUAGES.hi;
    if (lang === 'id' || lang === 'ms') return LANGUAGES.id; // Malay falls back to Indonesian
    return LANGUAGES.en;                                     // EN covers US/UK/PH-EN/EU defaults
  } catch {
    return LANGUAGES.en;
  }
};

// English is the source of truth — it has every key.
// Other languages translate the main UI strings; missing keys fall back to English.
export const TRANSLATIONS = {
  en: {
    appName: 'STARSHIP',
    appNameAccent: 'MATH',
    subtitle: 'QUICK REACTION MATH',
    subtitleLine1: 'Quick reaction math challenges',
    subtitleLine2: 'Train your brain. Reach the stars!',
    selectChallenge: 'SELECT CHALLENGE',
    tip: '',
    poweredBy: 'Powered by Fin Data Solution',
    questions: 'Q',
    perQuestion: 'per Q',
    operations: 'ops',
    points: 'pts',
    language: 'Language',

    easy: 'Venus',
    medium: 'Jupiter',
    hard: 'Mars',
    expert: 'Saturn',
    universe: 'Black Hole',
    easyTag: 'Adventure quiz',
    mediumTag: 'Operator challenge',
    hardTag: 'Path finder',
    easyDesc: 'Adventure quiz · 30 stages of decimals & arithmetic',
    mediumDesc: 'Catch the right operator tiles falling from space',
    hardDesc: 'Solve and trace the path 1 → N',
    expertDesc: '_',
    universeDesc: '_',

    question: 'Q',
    score: 'Score',
    correct: 'Correct!',
    incorrect: 'Wrong!',
    timeUp: 'Time up!',

    completed: 'COMPLETED!',
    excellent: 'Excellent!',
    great: 'Great!',
    good: 'Good job!',
    keepPracticing: 'Keep practicing!',
    totalScore: 'Total Score',
    accuracy: 'Accuracy',
    correctAnswers: 'Correct',
    avgTime: 'Avg Time',
    newRecord: 'NEW RECORD!',
    details: 'Details',
    hideDetails: 'Hide details',
    playAgain: 'Play Again',
    home: 'Home',
    seconds: 'sec',

    settings: 'Settings',
    soundEffects: 'Sound Effects',
    chooseLanguage: 'Choose Language',
    on: 'ON',
    off: 'OFF',

    ageGateTitle: 'Welcome!',
    ageGateSubtitle: 'How old are you?',
    ageGateKid: 'Under 13',
    ageGateKidSub: 'Kid',
    ageGateTeen: '13 – 17',
    ageGateTeenSub: 'Teen',
    ageGateAdult: '18 and older',
    ageGateAdultSub: 'Adult',
    ageGateNote: 'Your choice helps us keep the experience age-appropriate.',
  },

  es: {
    appName: 'STARSHIP',
    appNameAccent: 'MATH',
    subtitle: 'MATEMÁTICAS RÁPIDAS',
    selectChallenge: 'ELIGE UN DESAFÍO',
    tip: '',
    poweredBy: 'Impulsado por Fin Data Solution',
    questions: 'P',
    perQuestion: 'por P',
    operations: 'ops',
    points: 'pts',
    language: 'Idioma',

    easy: 'Venus',
    medium: 'Júpiter',
    hard: 'Marte',
    expert: 'Saturno',
    universe: 'Agujero Negro',
    easyDesc: 'Aventura · 30 etapas de decimales y aritmética',
    mediumDesc: 'Atrapa los operadores correctos que caen del espacio',
    hardDesc: 'Une los puntos · traza el camino del 1 al N',
    expertDesc: '_',
    universeDesc: '_',

    question: 'P',
    score: 'Puntos',
    correct: '¡Correcto!',
    incorrect: '¡Incorrecto!',
    timeUp: '¡Tiempo!',

    completed: '¡COMPLETADO!',
    excellent: '¡Excelente!',
    great: '¡Genial!',
    good: '¡Bien hecho!',
    keepPracticing: '¡Sigue practicando!',
    totalScore: 'Puntuación',
    accuracy: 'Precisión',
    correctAnswers: 'Correctas',
    avgTime: 'Tiempo medio',
    newRecord: '¡NUEVO RÉCORD!',
    details: 'Detalles',
    hideDetails: 'Ocultar detalles',
    playAgain: 'Jugar de nuevo',
    home: 'Inicio',
    seconds: 's',

    settings: 'Ajustes',
    soundEffects: 'Efectos de sonido',
    chooseLanguage: 'Elige el idioma',
    on: 'SÍ',
    off: 'NO',

    ageGateTitle: '¡Bienvenido!',
    ageGateSubtitle: '¿Cuántos años tienes?',
    ageGateKid: 'Menos de 13',
    ageGateKidSub: 'Niño',
    ageGateTeen: '13 – 17',
    ageGateTeenSub: 'Adolescente',
    ageGateAdult: '18 o más',
    ageGateAdultSub: 'Adulto',
    ageGateNote: 'Tu elección nos ayuda a adaptar la experiencia a tu edad.',
  },

  'pt-BR': {
    appName: 'STARSHIP',
    appNameAccent: 'MATH',
    subtitle: 'MATEMÁTICA RÁPIDA',
    selectChallenge: 'ESCOLHA O DESAFIO',
    tip: '',
    poweredBy: 'Powered by Fin Data Solution',
    questions: 'Q',
    perQuestion: 'por Q',
    operations: 'ops',
    points: 'pts',
    language: 'Idioma',

    easy: 'Vênus',
    medium: 'Júpiter',
    hard: 'Marte',
    expert: 'Saturno',
    universe: 'Buraco Negro',
    easyDesc: 'Aventura · 30 fases de decimais e aritmética',
    mediumDesc: 'Pegue os operadores certos caindo do espaço',
    hardDesc: 'Ligue os pontos · trace o caminho de 1 a N',
    expertDesc: '_',
    universeDesc: '_',

    question: 'Q',
    score: 'Pontos',
    correct: 'Certo!',
    incorrect: 'Errado!',
    timeUp: 'Tempo esgotado!',

    completed: 'CONCLUÍDO!',
    excellent: 'Excelente!',
    great: 'Ótimo!',
    good: 'Muito bem!',
    keepPracticing: 'Continue praticando!',
    totalScore: 'Pontuação',
    accuracy: 'Precisão',
    correctAnswers: 'Acertos',
    avgTime: 'Tempo médio',
    newRecord: 'NOVO RECORDE!',
    details: 'Detalhes',
    hideDetails: 'Ocultar detalhes',
    playAgain: 'Jogar de novo',
    home: 'Início',
    seconds: 's',

    settings: 'Configurações',
    soundEffects: 'Efeitos sonoros',
    chooseLanguage: 'Escolha o idioma',
    on: 'SIM',
    off: 'NÃO',

    ageGateTitle: 'Bem-vindo!',
    ageGateSubtitle: 'Quantos anos você tem?',
    ageGateKid: 'Menos de 13',
    ageGateKidSub: 'Criança',
    ageGateTeen: '13 – 17',
    ageGateTeenSub: 'Adolescente',
    ageGateAdult: '18 ou mais',
    ageGateAdultSub: 'Adulto',
    ageGateNote: 'Sua escolha nos ajuda a adequar a experiência à sua idade.',
  },

  fil: {
    appName: 'STARSHIP',
    appNameAccent: 'MATH',
    subtitle: 'MABILIS NA MATH',
    selectChallenge: 'PUMILI NG HAMON',
    tip: '',
    poweredBy: 'Powered by Fin Data Solution',
    questions: 'T',
    perQuestion: 'kada T',
    operations: 'ops',
    points: 'puntos',
    language: 'Wika',

    easy: 'Venus',
    medium: 'Jupiter',
    hard: 'Mars',
    expert: 'Saturn',
    universe: 'Black Hole',
    easyDesc: 'Adventure · 30 yugto ng desimal at aritmetika',
    mediumDesc: 'Saluhin ang tamang operator na bumabagsak mula sa kalawakan',
    hardDesc: 'Pagdugtungin ang mga tuldok · sundan ang daan 1→N',
    expertDesc: '_',
    universeDesc: '_',

    question: 'T',
    score: 'Iskor',
    correct: 'Tama!',
    incorrect: 'Mali!',
    timeUp: 'Tapos na ang oras!',

    completed: 'TAPOS NA!',
    excellent: 'Napakahusay!',
    great: 'Galing!',
    good: 'Magaling!',
    keepPracticing: 'Patuloy lang sa pag-eensayo!',
    totalScore: 'Kabuuang Iskor',
    accuracy: 'Tumpak',
    correctAnswers: 'Tama',
    avgTime: 'Ave. Oras',
    newRecord: 'BAGONG REKORD!',
    details: 'Detalye',
    hideDetails: 'Itago ang detalye',
    playAgain: 'Maglaro Ulit',
    home: 'Home',
    seconds: 'seg',

    settings: 'Mga Setting',
    soundEffects: 'Mga Sound Effect',
    chooseLanguage: 'Pumili ng Wika',
    on: 'ON',
    off: 'OFF',

    ageGateTitle: 'Maligayang pagdating!',
    ageGateSubtitle: 'Ilang taon ka na?',
    ageGateKid: 'Wala pang 13',
    ageGateKidSub: 'Bata',
    ageGateTeen: '13 – 17',
    ageGateTeenSub: 'Tin-edyer',
    ageGateAdult: '18 pataas',
    ageGateAdultSub: 'Adulto',
    ageGateNote: 'Tumutulong ito upang itugma ang karanasan sa iyong edad.',
  },

  hi: {
    appName: 'STARSHIP',
    appNameAccent: 'MATH',
    subtitle: 'त्वरित गणित',
    selectChallenge: 'चुनौती चुनें',
    tip: '',
    poweredBy: 'Powered by Fin Data Solution',
    questions: 'प्र',
    perQuestion: 'प्रति प्र',
    operations: 'क्रिया',
    points: 'अंक',
    language: 'भाषा',

    easy: 'शुक्र',
    medium: 'बृहस्पति',
    hard: 'मंगल',
    expert: 'शनि',
    universe: 'ब्लैक होल',
    easyDesc: 'साहसिक खेल · 30 चरण दशमलव और अंकगणित',
    mediumDesc: 'अंतरिक्ष से गिरते सही ऑपरेटर पकड़ें',
    hardDesc: 'बिंदु जोड़ें · 1 से N तक का रास्ता बनाएं',
    expertDesc: '_',
    universeDesc: '_',

    question: 'प्र',
    score: 'अंक',
    correct: 'सही!',
    incorrect: 'ग़लत!',
    timeUp: 'समय समाप्त!',

    completed: 'पूरा!',
    excellent: 'बेहतरीन!',
    great: 'शानदार!',
    good: 'बहुत बढ़िया!',
    keepPracticing: 'अभ्यास जारी रखें!',
    totalScore: 'कुल अंक',
    accuracy: 'सटीकता',
    correctAnswers: 'सही उत्तर',
    avgTime: 'औसत समय',
    newRecord: 'नया रिकॉर्ड!',
    details: 'विवरण',
    hideDetails: 'विवरण छिपाएँ',
    playAgain: 'फिर से खेलें',
    home: 'होम',
    seconds: 'से',

    settings: 'सेटिंग्स',
    soundEffects: 'ध्वनि प्रभाव',
    chooseLanguage: 'भाषा चुनें',
    on: 'चालू',
    off: 'बंद',

    ageGateTitle: 'स्वागत है!',
    ageGateSubtitle: 'आपकी उम्र क्या है?',
    ageGateKid: '13 से कम',
    ageGateKidSub: 'बच्चा',
    ageGateTeen: '13 – 17',
    ageGateTeenSub: 'किशोर',
    ageGateAdult: '18 या उससे अधिक',
    ageGateAdultSub: 'वयस्क',
    ageGateNote: 'आपकी पसंद हमें उम्र के अनुसार अनुभव देने में मदद करती है।',
  },

  id: {
    appName: 'STARSHIP',
    appNameAccent: 'MATH',
    subtitle: 'MATEMATIKA CEPAT',
    selectChallenge: 'PILIH TANTANGAN',
    tip: '',
    poweredBy: 'Powered by Fin Data Solution',
    questions: 'P',
    perQuestion: 'per P',
    operations: 'op',
    points: 'poin',
    language: 'Bahasa',

    easy: 'Venus',
    medium: 'Jupiter',
    hard: 'Mars',
    expert: 'Saturnus',
    universe: 'Lubang Hitam',
    easyDesc: 'Petualangan · 30 tahap desimal & aritmatika',
    mediumDesc: 'Tangkap operator yang tepat dari angkasa',
    hardDesc: 'Hubungkan titik · gambar jalur dari 1 ke N',
    expertDesc: '_',
    universeDesc: '_',

    question: 'P',
    score: 'Skor',
    correct: 'Benar!',
    incorrect: 'Salah!',
    timeUp: 'Waktu habis!',

    completed: 'SELESAI!',
    excellent: 'Luar biasa!',
    great: 'Hebat!',
    good: 'Bagus!',
    keepPracticing: 'Terus berlatih!',
    totalScore: 'Total Skor',
    accuracy: 'Akurasi',
    correctAnswers: 'Benar',
    avgTime: 'Waktu rata-rata',
    newRecord: 'REKOR BARU!',
    details: 'Detail',
    hideDetails: 'Sembunyikan',
    playAgain: 'Main lagi',
    home: 'Beranda',
    seconds: 'dtk',

    settings: 'Pengaturan',
    soundEffects: 'Efek Suara',
    chooseLanguage: 'Pilih Bahasa',
    on: 'AKTIF',
    off: 'NONAKTIF',

    ageGateTitle: 'Selamat datang!',
    ageGateSubtitle: 'Berapa usiamu?',
    ageGateKid: 'Di bawah 13',
    ageGateKidSub: 'Anak-anak',
    ageGateTeen: '13 – 17',
    ageGateTeenSub: 'Remaja',
    ageGateAdult: '18 ke atas',
    ageGateAdultSub: 'Dewasa',
    ageGateNote: 'Pilihanmu membantu kami menyesuaikan pengalaman dengan usia.',
  },
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(LANGUAGES.en);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('app_language');
        if (stored && Object.values(LANGUAGES).includes(stored)) {
          setLanguage(stored);
        } else {
          // First launch — auto-detect from device locale
          setLanguage(detectLocale());
        }
        const snd = await AsyncStorage.getItem('sound_enabled');
        if (snd !== null) {
          const enabled = snd === 'true';
          setSoundEnabled(enabled);
          setMuted(!enabled);
        }
      } catch {}
      setIsLoading(false);
    })();
  }, []);

  const changeLanguage = async (newLanguage) => {
    try {
      await AsyncStorage.setItem('app_language', newLanguage);
      setLanguage(newLanguage);
    } catch {}
  };

  const toggleSound = async () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setMuted(!next);
    try { await AsyncStorage.setItem('sound_enabled', String(next)); } catch {}
  };

  const t = (key) => {
    const dict = TRANSLATIONS[language] ?? TRANSLATIONS.en;
    return dict[key] ?? TRANSLATIONS.en[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{
      language, changeLanguage,
      soundEnabled, toggleSound,
      t, isLoading,
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
