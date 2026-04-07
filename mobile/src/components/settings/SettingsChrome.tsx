import { View, Text, Pressable, StyleSheet } from 'react-native';
import { CvColors } from '@/theme/colors';

export function SettingsSheetHandle() {
  return (
    <View style={handleStyles.wrap}>
      <View style={handleStyles.bar} />
    </View>
  );
}

const handleStyles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 6, paddingBottom: 4 },
  bar: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1' },
});

type SettingsSubHeaderProps = {
  title: string;
  onBack: () => void;
};

export function SettingsSubHeader({ title, onBack }: SettingsSubHeaderProps) {
  return (
    <View style={subStyles.wrap}>
      <Pressable
        style={subStyles.backBtn}
        onPress={onBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Retour"
      >
        <Text style={subStyles.back}>{'<'} Retour</Text>
      </Pressable>
      <Text style={subStyles.title} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

const subStyles = StyleSheet.create({
  wrap: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  backBtn: { position: 'absolute', left: 12, top: 0, zIndex: 1, paddingVertical: 4 },
  back: { fontSize: 16, color: '#64748B', fontWeight: '500' },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: CvColors.foreground,
    textAlign: 'center',
    paddingHorizontal: 88,
  },
});

type SettingsHomeHeaderProps = {
  title: string;
};

export function SettingsHomeHeader({ title }: SettingsHomeHeaderProps) {
  return (
    <View style={homeStyles.wrap}>
      <Text style={homeStyles.title}>{title}</Text>
    </View>
  );
}

const homeStyles = StyleSheet.create({
  wrap: {
    paddingBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '700', color: CvColors.foreground },
});
