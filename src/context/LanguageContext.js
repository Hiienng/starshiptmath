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
    appName: 'SMART',
    appNameAccent: 'MATH',
    subtitle: '⚡ LUYỆN PHẢN ỨNG NHANH QUA TOÁN HỌC ⚡',
    selectChallenge: 'CHỌN THỬ THÁCH',
    tip: 'Bắt đầu từ mức Dễ và tăng dần độ khó!',
    poweredBy: 'Powered by Fin Data Solution',
    questions: 'câu',
    perQuestion: 'mỗi câu',
    operations: 'phép tính',
    points: 'điểm',
    language: 'Ngôn ngữ',

    // Difficulty levels
    easy: 'Dễ',
    medium: 'Trung bình',
    hard: 'Khó',
    expert: 'Siêu khó',
    universe: 'Universe',
    easyDesc: 'Số từ 1-10, cộng trừ',
    mediumDesc: 'Số từ 1-20, cộng trừ nhân',
    hardDesc: 'Số từ 1-50, tất cả phép tính',
    expertDesc: 'Số từ 1-100, siêu tốc độ',
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
    appName: 'SMART',
    appNameAccent: 'MATH',
    subtitle: '⚡ QUICK REACTION MATH TRAINING ⚡',
    selectChallenge: 'SELECT CHALLENGE',
    tip: 'Start from Easy and gradually increase difficulty!',
    poweredBy: 'Powered by Fin Data Solution',
    questions: 'Q',
    perQuestion: 'per Q',
    operations: 'ops',
    points: 'pts',
    language: 'Language',

    // Difficulty levels
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    expert: 'Expert',
    universe: 'Universe',
    easyDesc: 'Numbers 1-10, add & subtract',
    mediumDesc: 'Numbers 1-20, add, sub, multiply',
    hardDesc: 'Numbers 1-50, all operations',
    expertDesc: 'Numbers 1-100, super speed',
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
