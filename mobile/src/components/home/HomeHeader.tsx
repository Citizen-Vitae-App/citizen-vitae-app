import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { CitizenVitaeLogo } from '@/components/branding/CitizenVitaeLogo';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CIRCLE = 38;
const BORDER = '#E5E7EB';
const META = '#6B7280';

type Props = {
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onOpenFilters: () => void;
  activeFilterCount: number;
};

export function HomeHeader({
  searchQuery,
  onSearchQueryChange,
  onOpenFilters,
  activeFilterCount,
}: Props) {
  const [searchOpen, setSearchOpen] = useState(false);

  const toggleSearch = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSearchOpen((o) => !o);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {!searchOpen ? (
          <View style={styles.logoWrap}>
            <CitizenVitaeLogo width={168} height={26} />
          </View>
        ) : (
          <View style={styles.logoSpacer} />
        )}

        <View style={styles.actions}>
          <Pressable
            onPress={toggleSearch}
            style={({ pressed }) => [styles.circleBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={searchOpen ? 'Fermer la recherche' : 'Rechercher'}
          >
            <MaterialCommunityIcons name="magnify" size={22} color="#111827" />
          </Pressable>

          <Pressable
            onPress={onOpenFilters}
            style={({ pressed }) => [styles.circleBtn, styles.circleBtnSecond, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Filtres"
          >
            <Feather name="sliders" size={20} color="#111827" />
            {activeFilterCount > 0 ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>
                  {activeFilterCount > 9 ? '9+' : String(activeFilterCount)}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      {searchOpen ? (
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={20} color={META} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={onSearchQueryChange}
            placeholder="Rechercher un événement..."
            placeholderTextColor={META}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Recherche d'événements"
          />
          <Pressable
            onPress={() => {
              onSearchQueryChange('');
              setSearchOpen(false);
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Fermer"
          >
            <MaterialCommunityIcons name="close" size={22} color={META} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: CIRCLE,
  },
  logoWrap: { flexShrink: 1, justifyContent: 'center' },
  logoSpacer: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  circleBtn: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBtnSecond: { marginLeft: 8 },
  pressed: { opacity: 0.85 },
  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FAFAFA',
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 6,
  },
});
