import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const DURATION = 700;

export function AnimatedSplashOverlay() {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const splashKeyframe = new Keyframe({
    0: { opacity: 1 },
    60: { opacity: 1 },
    100: { opacity: 0, easing: Easing.out(Easing.ease) },
  });

  const logoMark = (
    <View style={styles.logoContainer}>
      <Animated.View style={styles.ring} />
      <View style={styles.dotCore} />
      <Text style={styles.wordMark}>VEKTRA</Text>
      <Text style={styles.tagline}>Autonomous AI Forensics</Text>
    </View>
  );

  return animate ? (
    <Animated.View
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={styles.splashOverlay}
    >
      {logoMark}
    </Animated.View>
  ) : (
    <View
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => {
          setAnimate(true);
        });
      }}
      style={styles.splashOverlay}
    >
      {logoMark}
    </View>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0b0e14',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#3b82f6',
    position: 'absolute',
    opacity: 0.4,
  },
  dotCore: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    marginBottom: 20,
  },
  wordMark: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 6,
    marginTop: 4,
  },
  tagline: {
    color: '#3b82f6',
    fontSize: 11,
    letterSpacing: 2,
    marginTop: 6,
    opacity: 0.8,
  },
});
