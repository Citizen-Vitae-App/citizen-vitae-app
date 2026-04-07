import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type InAppToastType = 'success' | 'error' | 'info';

/** `unsubscribe` : icône X rouge, titre bleu nuit (toast « Désinscription confirmée »). */
export type ToastVisualVariant = 'default' | 'unsubscribe';

export interface ShowToastInput {
  type: InAppToastType;
  title: string;
  message?: string;
  durationMs?: number;
  /** Présentation de l’icône et du titre ; par défaut dérivée du `type`. */
  visualVariant?: ToastVisualVariant;
}

interface ToastPayload extends ShowToastInput {
  id: string;
  durationMs: number;
}

interface ToastContextValue {
  showToast: (input: ShowToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const DEFAULT_DURATION = 4200;

/** Décalage vertical d’entrée (depuis le haut) et de sortie (vers le haut). */
const ENTRANCE_Y = -48;
const EXIT_Y = -56;

function ToastBubble({
  toast,
  onRemoved,
  topOffset,
  maxWidth,
}: {
  toast: ToastPayload;
  onRemoved: () => void;
  topOffset: number;
  maxWidth: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(ENTRANCE_Y)).current;
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitingRef = useRef(false);

  const animateRemove = useCallback(
    (then: () => void) => {
      if (exitingRef.current) return;
      exitingRef.current = true;
      translateY.stopAnimation();
      opacity.stopAnimation();
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: EXIT_Y,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, { toValue: 0, duration: 240, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) then();
      });
    },
    [opacity, translateY]
  );

  useEffect(() => {
    exitingRef.current = false;
    translateY.setValue(ENTRANCE_Y);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 65,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    hideTimerRef.current = setTimeout(() => {
      animateRemove(onRemoved);
    }, toast.durationMs);

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [toast.id, toast.durationMs, animateRemove, onRemoved]);

  const handlePress = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    animateRemove(onRemoved);
  };

  const visual = toast.visualVariant ?? 'default';
  const isUnsubscribeVisual = visual === 'unsubscribe';

  const iconName = isUnsubscribeVisual
    ? 'close-circle-outline'
    : toast.type === 'success'
      ? 'check-circle-outline'
      : toast.type === 'error'
        ? 'alert-circle-outline'
        : 'information-outline';
  const iconColor = isUnsubscribeVisual
    ? '#EF4444'
    : toast.type === 'success'
      ? '#22C55E'
      : toast.type === 'error'
        ? '#EF4444'
        : '#3B82F6';
  const titleColor = isUnsubscribeVisual ? '#0F172A' : '#000000';

  return (
    <Animated.View
      style={[
        styles.toastWrap,
        {
          top: topOffset,
          opacity,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={handlePress}
        style={[styles.toastInner, { maxWidth }]}
        accessibilityRole="alert"
        accessibilityLabel={`${toast.title}. ${toast.message ?? ''}`}
      >
        <MaterialCommunityIcons name={iconName} size={22} color={iconColor} style={styles.icon} />
        <View style={styles.textCol}>
          <Text style={[styles.title, { color: titleColor }]}>{toast.title}</Text>
          {toast.message ? <Text style={styles.message}>{toast.message}</Text> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [toast, setToast] = useState<ToastPayload | null>(null);

  const removeToast = useCallback(() => {
    setToast(null);
  }, []);

  const showToast = useCallback((input: ShowToastInput) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const durationMs = input.durationMs ?? DEFAULT_DURATION;
    setToast({ id, ...input, durationMs });
  }, []);

  const toastMaxWidth = Math.min(width - 48, 400);
  const topOffset = insets.top + 10;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <ToastBubble
            key={toast.id}
            toast={toast}
            onRemoved={removeToast}
            topOffset={topOffset}
            maxWidth={toastMaxWidth}
          />
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toastWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99999,
    elevation: 99999,
  },
  toastInner: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 18,
    paddingRight: 22,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  icon: { marginRight: 10 },
  textCol: { flexShrink: 1 },
  title: { fontSize: 15, fontWeight: '700' },
  message: { fontSize: 13, color: '#6B7280', marginTop: 2 },
});

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
