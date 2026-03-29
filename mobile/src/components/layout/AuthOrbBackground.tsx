import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CvColors } from '@/theme/colors';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Fond type « carte » auth web : base crème + halo flou coloré au centre.
 */
export function AuthOrbBackground({ children, style }: Props) {
  return (
    <View style={[styles.root, style]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient
          colors={[CvColors.background, CvColors.background]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.orbWrap}>
          <LinearGradient
            colors={[CvColors.orbPink, CvColors.orbPeach, CvColors.orbCream, 'transparent']}
            locations={[0, 0.35, 0.65, 1]}
            style={styles.orb}
          />
        </View>
      </View>
      {children}
    </View>
  );
}

const ORB = 560;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: CvColors.background,
  },
  orbWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orb: {
    width: ORB,
    height: ORB,
    borderRadius: ORB / 2,
    opacity: 0.5,
  },
});
