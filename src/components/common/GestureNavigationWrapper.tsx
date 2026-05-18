import React, { useRef } from 'react';
import { Dimensions, View, StyleSheet } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolate,
  runOnJS
} from 'react-native-reanimated';
import { useAppTheme } from '../../hooks/useAppTheme';

const { width, height } = Dimensions.get('window');
const EDGE_THRESHOLD = 40;
const SWIPE_THRESHOLD = 80;
const NAVIGATION_COOLDOWN = 500;

interface GestureNavigationWrapperProps {
  children: React.ReactNode;
}

export function GestureNavigationWrapper({ children }: GestureNavigationWrapperProps) {
  const navigation = useNavigation();
  const { colors, isDark } = useAppTheme();

  const isGestureActive = useRef(false);
  const lastNavigationTime = useRef(0);
  const startX = useRef(0);
  const forwardStack = useRef<string[]>([]);

  const leftSwipeX = useSharedValue(0);
  const rightSwipeX = useSharedValue(0);

  const handleBack = () => {
    const now = Date.now();
    if (now - lastNavigationTime.current < NAVIGATION_COOLDOWN) return;

    if (navigation.canGoBack()) {
      lastNavigationTime.current = now;
      isGestureActive.current = true;

      const state = navigation.getState();
      if (state) {
        const currentRoute = state.routes[state.index]?.name;
        if (currentRoute) {
          forwardStack.current.push(currentRoute);
        }
      }

      navigation.goBack();
    }
  };

  const handleForward = () => {
    const now = Date.now();
    if (now - lastNavigationTime.current < NAVIGATION_COOLDOWN) return;

    const nextRoute = forwardStack.current.pop();
    if (nextRoute) {
      lastNavigationTime.current = now;
      isGestureActive.current = true;
      try {
        (navigation as any).navigate(nextRoute);
      } catch (err) {
        console.error('Forward gesture failed', err);
        forwardStack.current.push(nextRoute);
      }
    }
  };

  const leftEdgeGesture = Gesture.Pan()
    .activeOffsetX(5)
    .onBegin((e) => {
      startX.current = e.x;
      leftSwipeX.value = 0;
    })
    .onUpdate((e) => {
      if (startX.current < EDGE_THRESHOLD) {
        leftSwipeX.value = Math.max(0, e.translationX);
      }
    })
    .onEnd((e) => {
      if (startX.current < EDGE_THRESHOLD && e.translationX > SWIPE_THRESHOLD) {
        runOnJS(handleBack)();
      }
      leftSwipeX.value = withTiming(0, { duration: 200 });
    })
    .onFinalize(() => {
      leftSwipeX.value = withTiming(0);
    });

  const rightEdgeGesture = Gesture.Pan()
    .activeOffsetX(-5)
    .onBegin((e) => {
      startX.current = e.x;
      rightSwipeX.value = 0;
    })
    .onUpdate((e) => {
      if (startX.current > width - EDGE_THRESHOLD) {
        rightSwipeX.value = Math.min(0, e.translationX);
      }
    })
    .onEnd((e) => {
      if (startX.current > width - EDGE_THRESHOLD && e.translationX < -SWIPE_THRESHOLD) {
        runOnJS(handleForward)();
      }
      rightSwipeX.value = withTiming(0, { duration: 200 });
    })
    .onFinalize(() => {
      rightSwipeX.value = withTiming(0);
    });

  const leftIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(leftSwipeX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolate.CLAMP);
    const scale = interpolate(leftSwipeX.value, [0, SWIPE_THRESHOLD], [0.5, 1.2], Extrapolate.CLAMP);
    const translateX = interpolate(leftSwipeX.value, [0, SWIPE_THRESHOLD], [-20, 20], Extrapolate.CLAMP);

    return {
      opacity,
      transform: [{ scale }, { translateX }],
    };
  });

  const rightIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(Math.abs(rightSwipeX.value), [0, SWIPE_THRESHOLD], [0, 1], Extrapolate.CLAMP);
    const scale = interpolate(Math.abs(rightSwipeX.value), [0, SWIPE_THRESHOLD], [0.5, 1.2], Extrapolate.CLAMP);
    const translateX = interpolate(rightSwipeX.value, [-SWIPE_THRESHOLD, 0], [-20, 20], Extrapolate.CLAMP);

    return {
      opacity,
      transform: [{ scale }, { translateX }],
    };
  });

  const composed = Gesture.Simultaneous(leftEdgeGesture, rightEdgeGesture);

  return (
    <View style={{ flex: 1 }}>
      <GestureDetector gesture={composed}>
        <View style={{ flex: 1 }}>
          {children}

          <Animated.View
            style={[
              styles.indicator,
              styles.leftIndicator,
              leftIndicatorStyle,
            ]}
          >
            <View style={[styles.arrowCircle, { backgroundColor: colors.primary }]}>
              <ArrowLeft size={28} color="white" strokeWidth={3} />
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.indicator,
              styles.rightIndicator,
              rightIndicatorStyle,
            ]}
          >
            <View style={[styles.arrowCircle, { backgroundColor: colors.primary }]}>
              <ArrowRight size={28} color="white" strokeWidth={3} />
            </View>
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  indicator: {
    position: 'absolute',
    top: height / 2 - 40,
    zIndex: 9999,
    pointerEvents: 'none',
  },
  leftIndicator: {
    left: 10,
  },
  rightIndicator: {
    right: 10,
  },
  arrowCircle: {
    padding: 12,
    borderRadius: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});
