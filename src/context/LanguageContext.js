import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LanguageContext = createContext();

export const LANGUAGES = {
  vi: 'vi',
  en: 'en',
};

export const TRANSLATIONS = {
  vi: {
    // Home Screen
    appName: 'STARSHIP',
    appNameAccent: 'MATH',
    subtitle: 'TOÁN HỌC PHẢN XẠ NHANH',
    selectChallenge: 'CHỌN THỬ THÁCH',
    tip: '',
    poweredBy: 'Powered by Fin Data Solution',
    questions: 'câu',
    perQuestion: 'mỗi câu',
    operations: 'phép tính',
    points: 'điểm',
    language: 'Ngôn ngữ',

    // Difficulty levels
    easy: 'Sao Kim',
    medium: 'Sao Mộc',
    hard: 'Sao Hỏa',
    expert: 'Sao Thổ',
    universe: 'Hố Đen',
    easyDesc: 'Số từ 1-10, chỉ cộng',
    mediumDesc: 'Số từ 1-100, cộng và trừ',
    hardDesc: 'Số lớn, chỉ nhân',
    expertDesc: 'Số lớn, nhân và chia',
    universeDesc: 'Thử thách tối thượng',

    // Game Screen
    question: 'Câu',
    score: 'Điểm',
    correct: 'Đúng rồi!',
    incorrect: 'Sai rồi!',
    timeUp: 'Hết giờ!',

    // Result Screen
    completed: 'HOÀN THÀNH!',
    excellent: 'Xuất sắc!',
    great: 'Tuyệt vời!',
    good: 'Tốt lắm!',
    keepPracticing: 'Cố gắng thêm!',
    totalScore: 'Tổng điểm',
    accuracy: 'Độ chính xác',
    correctAnswers: 'Trả lời đúng',
    avgTime: 'Thời gian TB',
    newRecord: 'KỶ LỤC MỚI!',
    details: 'Chi tiết',
    hideDetails: 'Ẩn chi tiết',
    playAgain: 'Chơi lại',
    home: 'Về trang chủ',
    seconds: 'giây',
  },
  en: {
    // Home Screen
    appName: 'STARSHIP',
    appNameAccent: 'MATH',
    subtitle: 'QUICK REACTION MATH',
    selectChallenge: 'SELECT CHALLENGE',
    tip: '',
    poweredBy: 'Powered by Fin Data Solution',
    questions: 'Q',
    perQuestion: 'per Q',
    operations: 'ops',
    points: 'pts',
    language: 'Language',

    // Difficulty levels
    easy: 'Venus',
    medium: 'Jupiter',
    hard: 'Mars',
    expert: 'Saturn',
    universe: 'Black Hole',
    easyDesc: 'Numbers 1-10, addition only',
    mediumDesc: 'Numbers 1-100, add & subtract',
    hardDesc: 'Large numbers, multiply only',
    expertDesc: 'Large numbers, multiply & divide',
    universeDesc: 'Ultimate challenge',

    // Game Screen
    question: 'Q',
    score: 'Score',
    correct: 'Correct!',
    incorrect: 'Wrong!',
    timeUp: 'Time up!',

    // Result Screen
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
  },
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(LANGUAGES.vi);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('app_language');
      if (savedLanguage && LANGUAGES[savedLanguage]) {
        setLanguage(savedLanguage);
      }
    } catch (error) {
      console.log('Error loading language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = async (newLanguage) => {
    try {
      await AsyncStorage.setItem('app_language', newLanguage);
      setLanguage(newLanguage);
    } catch (error) {
      console.log('Error saving language:', error);
    }
  };

  const t = (key) => {
    return TRANSLATIONS[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t, isLoading }}>
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
