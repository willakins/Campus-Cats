import { Image, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { Ionicons } from '@expo/vector-icons';

import { AppText, Button, Card, Screen } from '@/presentation/ui';
import { useAppTheme } from '@/theme';

const features = [
  {
    icon: 'paw-outline',
    title: 'Know your campus cats',
    description: 'Discover their stories and sightings.',
  },
  {
    icon: 'heart-outline',
    title: 'Care together',
    description: 'Coordinate feeding stations and volunteer efforts.',
  },
  {
    icon: 'people-outline',
    title: 'Build your community',
    description: 'Connect through conversations, events, and shared goals.',
  },
] as const;

export default function WelcomeScreen() {
  const theme = useAppTheme();
  const router = useRouter();

  return (
    <>
      {Platform.OS === 'web' ? (
        <Head>
          <title>Welcome | Campus Cats</title>
        </Head>
      ) : null}
      <Screen scroll contentStyle={{ paddingVertical: theme.spacing.xl }}>
        <View
          style={{
            width: '100%',
            maxWidth: theme.layout.maxAuthWidth,
            alignSelf: 'center',
            gap: theme.spacing.lg,
          }}
        >
          <View style={{ gap: theme.spacing.sm }}>
            <Image
              source={require('../assets/images/default-app-icon.png')}
              accessibilityLabel="Campus Cats logo"
              style={{ width: 48, height: 48, borderRadius: theme.radii.field }}
              resizeMode="contain"
            />
            <AppText accessibilityRole="header" variant="display">
              Welcome to Campus Cats
            </AppText>
            <AppText variant="section" style={{ color: theme.colors.primary }}>
              More time caring for cats. More people caring together.
            </AppText>
            <AppText color="muted">
              Bring your campus community together to share sightings,
              coordinate care, and get to know your local cats—alongside
              campuses across the country.
            </AppText>
          </View>
          <Card style={{ gap: theme.spacing.lg }}>
            {features.map((feature) => (
              <View
                key={feature.title}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.md,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: theme.radii.pill,
                    backgroundColor: theme.colors.primarySurface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons
                    name={feature.icon}
                    size={22}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={{ flex: 1, gap: theme.spacing.xs }}>
                  <AppText variant="label">{feature.title}</AppText>
                  <AppText variant="caption" color="muted">
                    {feature.description}
                  </AppText>
                </View>
              </View>
            ))}
          </Card>
          <View style={{ gap: theme.spacing.sm }}>
            <Button
              label="Find your university"
              onPress={() => router.push('/university-search' as never)}
            />
            <AppText
              variant="caption"
              color="muted"
              style={{ textAlign: 'center' }}
            >
              Your campus community starts here.
            </AppText>
          </View>
        </View>
      </Screen>
    </>
  );
}
