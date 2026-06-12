import React, { useState } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import MenuModal from './MenuModal';

const MenuButton = ({ navigation, activeTab, style }) => {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.button, style]}
        onPress={() => setVisible(true)}
        activeOpacity={0.75}
      >
        <View style={styles.line} />
        <View style={styles.line} />
        <View style={styles.line} />
      </TouchableOpacity>

      <MenuModal
        visible={visible}
        onClose={() => setVisible(false)}
        navigation={navigation}
        activeTab={activeTab}
      />
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  line: {
    width: 18,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#ffffff',
  },
});

export default MenuButton;
