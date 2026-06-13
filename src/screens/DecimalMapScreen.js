import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, Animated, Platform, useWindowDimensions,
} from 'react-native';
import AdBanner from '../components/AdBanner';
import { LinearGradient } from 'expo-linear-gradient';
import { DECIMAL_STAGES, DECIMAL_STAGE_CONFIG, PYRAMID_ROWS, TOTAL_STAGES } from '../utils/decimalGenerator';
import { getUnlockedStages } from '../utils/progressStorage';
import { FONTS } from '../constants/fonts';

// Section op symbols shown in header strip
const SEC_OP = { 1: '+', 2: '−', 3: '×', 4: '÷', 5: '★' };

// ── Stage cell ────────────────────────────────────────────────────────────────
const StageCell = ({ stage, state, onPress, cellSize }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (state !== 'current') {
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1,  duration: 750, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 750, useNativeDriver: true }),
      ])
    );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    glow.start();
    return () => { loop.stop(); glow.stop(); };
  }, [state]);

  const locked    = state === 'locked';
  const current   = state === 'current';
  const completed = state === 'completed';

  const fontSize = cellSize * 0.27;

  if (locked) {
    return (
      <View style={[styles.cell, {
        width: cellSize, height: cellSize, borderRadius: cellSize * 0.24,
        backgroundColor: 'rgba(37, 37, 71, 0.6)',
        borderColor: 'rgba(124, 58, 237, 0.18)', borderWidth: 1,
      }]}>
        <View style={styles.cellInner}>
          <Text style={{ fontSize: cellSize * 0.34, opacity: 0.35 }}>🔒</Text>
        </View>
      </View>
    );
  }

  if (current) {
    return (
      <Animated.View style={[styles.cell, {
        width: cellSize, height: cellSize, borderRadius: cellSize * 0.24,
        transform: [{ scale: pulseAnim }],
        shadowColor: '#7C3AED', shadowOpacity: 0.8, shadowRadius: 16, elevation: 14,
        borderColor: '#A78BFA', borderWidth: 2,
        backgroundColor: '#1a0d3d',
      }]}>
        <TouchableOpacity style={styles.cellInner} onPress={onPress} activeOpacity={0.78}>
          <LinearGradient
            colors={['#8B5CF6', '#6C63FF']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />
          <Text style={{ fontSize: cellSize * 0.30, position: 'absolute', top: 3, right: 5 }}>⚡</Text>
          <Text style={[styles.cellLabel, { fontSize, color: '#fff', fontWeight: '900', letterSpacing: 0.5 }]}>
            {stage.label}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  if (completed) {
    return (
      <View style={[styles.cell, {
        width: cellSize, height: cellSize, borderRadius: cellSize * 0.24,
        borderColor: stage.color + '88', borderWidth: 1.5,
        shadowColor: stage.color, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
        backgroundColor: 'rgba(37, 37, 71, 0.5)',
      }]}>
        <TouchableOpacity style={styles.cellInner} onPress={onPress} activeOpacity={0.78}>
          <LinearGradient
            colors={[stage.color + '40', stage.color + '15']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />
          <Text style={[styles.cellCheck, { fontSize: cellSize * 0.26, color: stage.color }]}>✓</Text>
          <Text style={[styles.cellLabel, { fontSize, color: '#fff', fontWeight: '800', letterSpacing: 0.5 }]}>
            {stage.label}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // unlocked but not yet reached — shouldn't happen in current flow, treat as locked
  return null;
};

// ── Section divider ───────────────────────────────────────────────────────────
const SectionBadge = ({ sectionId, color, name }) => (
  <View style={[styles.sectionBadge, { borderColor: color + '66' }]}>
    <Text style={[styles.sectionOp, { color }]}>{SEC_OP[sectionId]}</Text>
    <Text style={[styles.sectionName, { color: color + 'cc' }]}>{name}</Text>
  </View>
);

// ── Screen ────────────────────────────────────────────────────────────────────
const DecimalMapScreen = ({ navigation }) => {
  const { width: SW } = useWindowDimensions();
  const isTablet = SW >= 768;
  // Continuous scale factor for tablets — grows with screen width so UI
  // elements don't stay phone-sized on large iPads.
  const ts = isTablet ? Math.min(SW / 480, 2.2) : 1;
  const [unlocked, setUnlocked]       = useState(new Set([1]));
  const [highestStage, setHighestStage] = useState(1);

  const GAP     = 8;
  const H_PAD   = 20;
  const MAX_COLS = 5;
  const cellSize = Math.min(Math.floor((SW - H_PAD * 2 - GAP * (MAX_COLS - 1)) / MAX_COLS), isTablet ? Math.round(68 * Math.min(ts, 1.8)) : 68);

  useEffect(() => {
    const load = async () => {
      const u = await getUnlockedStages();
      setUnlocked(u);
      setHighestStage(Math.max(...u));
    };
    load();
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation]);

  const getState = (id) => {
    if (!unlocked.has(id)) return 'locked';
    if (id === highestStage) return 'current';
    return 'completed';
  };

  const startStage = (stage) => {
    navigation.navigate('Game', {
      difficulty: 'decimal',
      stageId: stage.id,
      customConfig: DECIMAL_STAGE_CONFIG(stage.id),
      totalFails: 0,
      timeMultiplier: 1,
      operandMultiplier: 1,
      isStageMode: true,
    });
  };

  const currentStage = DECIMAL_STAGES.find(s => s.id === highestStage);
  const completedCount = highestStage - 1;

  // Build rows with section dividers injected between section changes
  // We'll detect section breaks between consecutive PYRAMID_ROWS
  const getSectionForRow = (row) => {
    const stage = DECIMAL_STAGES.find(s => s.id === row[0]);
    return stage?.section ?? 0;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050510" />
      <LinearGradient
        colors={['#050510', '#0a0a1a', '#0f0f2a', '#0a0a1a', '#050510']}
        locations={[0, 0.3, 0.5, 0.7, 1]}
        style={styles.gradient}
      >

        {/* Header — same pattern as Jupiter: floating X + centred glow card */}
        <View style={[styles.headerWrap, isTablet && { height: 130 + (ts - 1) * 30 }]}>
          <TouchableOpacity style={[styles.closeBtn, isTablet && { width: 30 * Math.min(ts, 1.4), height: 30 * Math.min(ts, 1.4), borderRadius: 15 * Math.min(ts, 1.4) }]} onPress={() => navigation.navigate('Home')}>
            <Text style={[styles.closeTxt, isTablet && { fontSize: 13 * Math.min(ts, 1.4) }]}>✕</Text>
          </TouchableOpacity>
          <View style={[styles.headerCard, isTablet && { paddingVertical: 14 * Math.min(ts, 1.5), paddingHorizontal: 14 * Math.min(ts, 1.5) }]}>
            <Text style={[styles.headerTitle, isTablet && { fontSize: 22 * Math.min(ts, 1.5) }]}>ADVENTURE</Text>
            <Text style={[styles.headerSub, isTablet && { fontSize: 11 * Math.min(ts, 1.5) }]}>{completedCount} / {TOTAL_STAGES} stages</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: H_PAD }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Rows rendered bottom→top visually = base first, peak last */}
          {[...PYRAMID_ROWS].reverse().map((row, revIdx, arr) => {
            const rowIdx = PYRAMID_ROWS.length - 1 - revIdx; // original index
            const section = getSectionForRow(row);
            // Show section badge when section changes from previous row (going upward = decreasing rowIdx)
            const prevRow = arr[revIdx + 1];
            const prevSection = prevRow ? getSectionForRow(prevRow) : 0;
            const showBadge = section !== prevSection;
            const sectionStage = DECIMAL_STAGES.find(s => s.section === section);
            const indent = ((MAX_COLS - row.length) * (cellSize + GAP)) / 2;

            return (
              <View key={rowIdx}>
                {showBadge && sectionStage && (
                  <SectionBadge
                    sectionId={section}
                    color={sectionStage.color}
                    name={sectionStage.sectionName}
                  />
                )}
                <View style={[styles.pyramidRow, { marginLeft: indent, marginRight: indent }]}>
                  {row.map(stageId => {
                    const stage = DECIMAL_STAGES.find(s => s.id === stageId);
                    return (
                      <StageCell
                        key={stageId}
                        stage={stage}
                        state={getState(stageId)}
                        onPress={() => startStage(stage)}
                        cellSize={cellSize}
                      />
                    );
                  })}
                </View>
              </View>
            );
          })}

          <View style={{ height: 16 }} />
        </ScrollView>

        {Platform.OS !== 'web' && <AdBanner />}

        {/* Bottom play button */}
        <View style={[styles.bottomBar, isTablet && { paddingHorizontal: '15%' }]}>
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => currentStage && startStage(currentStage)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#8B5CF6', '#6C63FF']}
              style={[styles.playGradient, isTablet && { paddingVertical: 18 * Math.min(ts, 1.4) }]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Text style={[styles.playBtnLabel, isTablet && { fontSize: 12 * Math.min(ts, 1.4) }]}>PLAY NOW</Text>
              <Text style={[styles.playBtnStage, isTablet && { fontSize: 20 * Math.min(ts, 1.4) }]}>
                {currentStage ? `Stage ${currentStage.label} · ${currentStage.sectionName}` : '—'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050510' },
  gradient:  { flex: 1 },

  headerWrap: {
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 14,
    height: 130,
  },
  closeBtn: {
    position: 'absolute',
    top: 50, left: 14,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
  closeTxt: { color: '#fff', fontSize: 13 },
  headerCard: {
    position: 'absolute',
    top: 50, left: 56, right: 56,
    backgroundColor: 'rgba(15, 10, 35, 0.92)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.35)',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 20,
  },
  headerTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 22, color: '#fff',
    letterSpacing: 2,
  },
  headerSub: {
    fontFamily: FONTS.bodySemi,
    fontSize: 11, color: 'rgba(184, 184, 212, 0.6)',
    marginTop: 4, letterSpacing: 1,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: 18,
    paddingBottom: 8,
    alignItems: 'center',
  },

  // Section divider
  sectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginTop: 22,
    marginBottom: 12,
    gap: 8,
    backgroundColor: 'rgba(15, 15, 35, 0.6)',
  },
  sectionOp:   { fontFamily: FONTS.displayBold, fontSize: 16 },
  sectionName: { fontFamily: FONTS.displaySemi, fontSize: 13, letterSpacing: 1 },

  // Pyramid
  pyramidRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 8,
  },

  // Cell base (locked uses this directly; others via inline styles)
  cell: {
    overflow: 'hidden',
  },
  cellInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellCheck: {
    position: 'absolute', top: 4, right: 6, fontWeight: '900',
  },
  cellLabel: { letterSpacing: 0.3 },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingBottom: 34,
    backgroundColor: 'rgba(5, 5, 16, 0.8)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.15)',
  },
  playButton: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  playGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: 18,
  },
  playBtnLabel: {
    fontFamily: FONTS.bodyBlack,
    fontSize: 12, color: 'rgba(255,255,255,0.85)', letterSpacing: 3,
  },
  playBtnStage: {
    fontFamily: FONTS.displayBold,
    fontSize: 20, color: '#fff', letterSpacing: 0.3, marginTop: 3,
  },
});

export default DecimalMapScreen;
