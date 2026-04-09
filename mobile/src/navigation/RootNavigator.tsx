import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { navigationRef } from '@/navigation/navigationRef';
import { OrganizationSheetProvider } from '@/contexts/OrganizationSheetContext';
import { useAuth } from '@/contexts/AuthContext';
import { AppNavigator } from '@/navigation/AppNavigator';
import { AuthStackNavigator } from '@/navigation/AuthStackNavigator';
import { OnboardingFlowScreen } from '@/screens/OnboardingFlowScreen';
import { CvColors } from '@/theme/colors';

function LoadingSplash() {
  return (
    <View style={styles.splash}>
      <Image
        source={require('../../assets/app-logo.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="Logo Citizen Vitae"
      />
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
    <OrganizationSheetProvider>
      <NavigationContainer ref={navigationRef} key={navKey} theme={navTheme}>
        {!user ? (
          <AuthStackNavigator />
        ) : needsOnboarding ? (
          <OnboardingFlowScreen />
        ) : (
          <AppNavigator />
        )}
      </NavigationContainer>
    </OrganizationSheetProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CvColors.background,
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 20,
  },
});
