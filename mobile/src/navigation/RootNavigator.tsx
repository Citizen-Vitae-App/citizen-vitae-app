import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { AppNavigator } from '@/navigation/AppNavigator';
import { AuthStackNavigator } from '@/navigation/AuthStackNavigator';
import { OnboardingPlaceholderScreen } from '@/screens/OnboardingPlaceholderScreen';
import { CvColors } from '@/theme/colors';

function LoadingSplash() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color={CvColors.primary} accessibilityLabel="Chargement" />
    </View>
  );
}

export function RootNavigator() {
  const { user, isLoading, needsOnboarding } = useAuth();

  if (isLoading) {
    return <LoadingSplash />;
  }

  const navKey = !user ? 'guest' : needsOnboarding ? 'onboarding' : 'app';

  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: CvColors.primary,
      background: CvColors.background,
      card: CvColors.card,
      text: CvColors.foreground,
      border: CvColors.border,
      notification: CvColors.ring,
    },
  };

  return (
    <NavigationContainer key={navKey} theme={navTheme}>
      {!user ? (
        <AuthStackNavigator />
      ) : needsOnboarding ? (
        <OnboardingPlaceholderScreen />
      ) : (
        <AppNavigator />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CvColors.background,
  },
});
