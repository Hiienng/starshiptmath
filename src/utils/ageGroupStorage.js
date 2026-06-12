import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'age_group';

// Three age buckets per CLAUDE.md §2:
// 'kid'   → under 13: tagForChildDirectedTreatment=true, contextual ads only, no PII, no ATT prompt.
// 'teen'  → 13-17:    tagForUnderAgeOfConsent=true, force NPA, no PII, no UMP form.
// 'adult' → 18+:      standard AdMob, UMP/GDPR consent, personalized ads when allowed.
export const AGE_GROUPS = { kid: 'kid', teen: 'teen', adult: 'adult' };

const VALID = new Set(Object.values(AGE_GROUPS));

export const getAgeGroup = async () => {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return VALID.has(v) ? v : null;
  } catch {
    return null;
  }
};

export const setAgeGroup = async (group) => {
  if (!VALID.has(group)) return false;
  try {
    await AsyncStorage.setItem(KEY, group);
    return true;
  } catch {
    return false;
  }
};
