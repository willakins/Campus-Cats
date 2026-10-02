import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { AuthTextField } from '@/presentation/auth';
import {
  AppText,
  Button,
  FeedbackBanner,
  IconButton,
  Screen,
} from '@/presentation/ui';
import { LegalLinks } from '@/presentation/legal';
import { appModules } from '@/composition/appModules';
import { useAuth, useUniversitySelection } from '@/presentation/providers';
import { useAppTheme, useReducedMotion } from '@/theme';
import { requestPushNotificationToken } from '@/adapters/expo/pushNotifications';

const LoginScreen = () => {
  const router = useRouter();
  const theme = useAppTheme();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = process.env.NODE_ENV !== 'test' && !reducedMotion;
  const { login } = useAuth();
  const { university } = useUniversitySelection();
  const saml = university?.club?.saml;
  const [busy, setBusy] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [animateEmailEntry, setAnimateEmailEntry] = useState(false);
  const [animateChoiceEntry, setAnimateChoiceEntry] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(!saml);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: 'info' | 'danger';
  }>();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const choiceOpacity = useRef(new Animated.Value(1)).current;
  const choiceOffset = useRef(new Animated.Value(0)).current;
  const emailOpacity = useRef(new Animated.Value(1)).current;
  const emailOffset = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      choiceOpacity.setValue(1);
      choiceOffset.setValue(0);
      setTransitioning(false);
    }, [choiceOffset, choiceOpacity]),
  );

  useEffect(() => {
    if (showEmailForm || !animateChoiceEntry) return undefined;
    if (!animationsEnabled) {
      choiceOpacity.setValue(1);
      choiceOffset.setValue(0);
      setAnimateChoiceEntry(false);
      setTransitioning(false);
      return undefined;
    }
    const animation = Animated.parallel([
      Animated.timing(choiceOpacity, {
        toValue: 1,
        duration: theme.motion.content,
        useNativeDriver: true,
      }),
      Animated.timing(choiceOffset, {
        toValue: 0,
        duration: theme.motion.content,
        useNativeDriver: true,
      }),
    ]);
    animation.start(() => {
      setAnimateChoiceEntry(false);
      setTransitioning(false);
    });
    return () => animation.stop();
  }, [
    animateChoiceEntry,
    animationsEnabled,
    choiceOffset,
    choiceOpacity,
    showEmailForm,
    theme.motion.content,
  ]);

  useEffect(() => {
    if (!showEmailForm || !animateEmailEntry) return undefined;
    if (!animationsEnabled) {
      emailOpacity.setValue(1);
      emailOffset.setValue(0);
      setAnimateEmailEntry(false);
      setTransitioning(false);
      return undefined;
    }
    const animation = Animated.parallel([
      Animated.timing(emailOpacity, {
        toValue: 1,
        duration: theme.motion.content,
        useNativeDriver: true,
      }),
      Animated.timing(emailOffset, {
        toValue: 0,
        duration: theme.motion.content,
        useNativeDriver: true,
      }),
    ]);
    animation.start(() => {
      setAnimateEmailEntry(false);
      setTransitioning(false);
    });
    return () => animation.stop();
  }, [
    animateEmailEntry,
    animationsEnabled,
    emailOffset,
    emailOpacity,
    showEmailForm,
    theme.motion.content,
  ]);

  const handleChange = (field: 'email' | 'password', value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const loginWhitelistUser = async () => {
    if (busy) return;
    try {
      setBusy(true);
      setFeedback(undefined);
      await login(formData.email, formData.password);
      const token = await requestPushNotificationToken();
      if (token) await appModules.session.registerPushToken(token);
      router.replace('/(app)/(tabs)');
    } catch (error) {
      setFeedback({
        message: error instanceof Error ? error.message : 'Consider using SSO.',
        tone: 'danger',
      });
    } finally {
      setBusy(false);
    }
  };

  const selectSignInMethod = (method: 'sso' | 'email') => {
    if (transitioning) return;
    const showSelectedMethod = () => {
      if (method === 'sso') {
        router.navigate('/saml-sign-in');
        setTransitioning(false);
        return;
      }
      emailOpacity.setValue(animationsEnabled ? 0 : 1);
      emailOffset.setValue(animationsEnabled ? 28 : 0);
      setAnimateEmailEntry(animationsEnabled);
      setShowEmailForm(true);
      if (!animationsEnabled) setTransitioning(false);
    };

    if (!animationsEnabled) {
      showSelectedMethod();
      return;
    }

    setTransitioning(true);
    Animated.parallel([
      Animated.timing(choiceOpacity, {
        toValue: 0,
        duration: theme.motion.press,
        useNativeDriver: true,
      }),
      Animated.timing(choiceOffset, {
        toValue: -16,
        duration: theme.motion.press,
        useNativeDriver: true,
      }),
    ]).start(showSelectedMethod);
  };

  const goBack = () => {
    if (showEmailForm && saml) {
      setFeedback(undefined);
      const showChoices = () => {
        choiceOpacity.setValue(animationsEnabled ? 0 : 1);
        choiceOffset.setValue(animationsEnabled ? -28 : 0);
        setAnimateChoiceEntry(animationsEnabled);
        setShowEmailForm(false);
        if (!animationsEnabled) setTransitioning(false);
      };

      if (!animationsEnabled) {
        showChoices();
        return;
      }

      setTransitioning(true);
      Animated.parallel([
        Animated.timing(emailOpacity, {
          toValue: 0,
          duration: theme.motion.press,
          useNativeDriver: true,
        }),
        Animated.timing(emailOffset, {
          toValue: 28,
          duration: theme.motion.press,
          useNativeDriver: true,
        }),
      ]).start(showChoices);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/university-search');
  };

  return (
    <Screen
      scroll={showEmailForm}
      keyboardAware={showEmailForm}
      contentStyle={{
        paddingBottom: showEmailForm ? theme.spacing.huge : theme.spacing.lg,
      }}
    >
      <View
        style={{
          flex: showEmailForm ? undefined : 1,
          width: '100%',
          maxWidth: theme.layout.maxAuthWidth,
          alignSelf: 'center',
          gap: theme.spacing.lg,
          paddingTop: showEmailForm ? theme.spacing.xl : 0,
        }}
      >
        <IconButton
          accessibilityLabel="Back"
          icon="arrow-back"
          disabled={transitioning}
          onPress={goBack}
          style={
            showEmailForm
              ? undefined
              : {
                  position: 'absolute',
                  top: theme.spacing.sm,
                  left: 0,
                  zIndex: 2,
                }
          }
        />

        {showEmailForm ? (
          <Animated.View
            style={{
              gap: theme.spacing.xl,
              opacity: emailOpacity,
              transform: [{ translateY: emailOffset }],
            }}
          >
            <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
              <AppText
                accessibilityRole="header"
                variant="pageTitle"
                style={{ textAlign: 'center' }}
              >
                Sign in with email
              </AppText>
              <AppText color="muted" style={{ textAlign: 'center' }}>
                Use your Campus Cats community account.
              </AppText>
            </View>

            <View style={{ gap: theme.spacing.md }}>
              <AuthTextField
                label="Email"
                value={formData.email}
                autoCapitalize="none"
                autoComplete="email"
                inputMode="email"
                keyboardType="email-address"
                onChangeText={(text) => handleChange('email', text)}
              />
              <AuthTextField
                label="Password"
                value={formData.password}
                autoCapitalize="none"
                autoComplete="current-password"
                secureTextEntry
                onChangeText={(text) => handleChange('password', text)}
              />
              {feedback ? (
                <FeedbackBanner
                  message={feedback.message}
                  tone={feedback.tone}
                />
              ) : null}
              <Button
                label="Sign in with email"
                fullWidth
                loading={busy}
                loadingLabel="Signing in…"
                disabled={busy}
                style={{ minHeight: 56 }}
                onPress={() => void loginWhitelistUser()}
              />
              <Button
                label="Forgot password?"
                variant="tertiary"
                fullWidth
                disabled={busy}
                onPress={() => router.navigate('/forgot-password')}
              />
            </View>

            <View
              style={{
                gap: theme.spacing.sm,
                paddingTop: theme.spacing.lg,
                borderTopWidth: 1,
                borderTopColor: theme.colors.border,
              }}
            >
              <AppText color="muted" style={{ textAlign: 'center' }}>
                New to Campus Cats?
              </AppText>
              <Button
                label="Sign up"
                variant="secondary"
                fullWidth
                disabled={busy}
                onPress={() => router.navigate('/whitelist')}
              />
            </View>

            <LegalLinks returnTo="/login" />
          </Animated.View>
        ) : (
          <Animated.View
            style={{
              flex: 1,
              justifyContent: 'center',
              gap: theme.spacing.xl,
              opacity: choiceOpacity,
              transform: [{ translateY: choiceOffset }],
            }}
          >
            <View
              style={{
                alignItems: 'center',
                gap: theme.spacing.xs,
              }}
            >
              <AppText
                accessibilityRole="header"
                variant="display"
                style={{ textAlign: 'center' }}
              >
                Sign in to Campus Cats
              </AppText>
              <AppText color="muted" style={{ textAlign: 'center' }}>
                Choose how you’d like to continue.
              </AppText>
            </View>
            <View
              style={{
                width: '100%',
                maxWidth: 420,
                alignSelf: 'center',
                gap: theme.spacing.md,
              }}
            >
              <Button
                label={`Sign in with ${saml?.label ?? 'university SSO'}`}
                icon="school-outline"
                fullWidth
                disabled={busy || transitioning}
                style={{ minHeight: 56 }}
                onPress={() => selectSignInMethod('sso')}
              />
              <Button
                label="Sign in with email"
                icon="mail-outline"
                variant="secondary"
                fullWidth
                disabled={busy || transitioning}
                style={{ minHeight: 56 }}
                onPress={() => selectSignInMethod('email')}
              />
            </View>
          </Animated.View>
        )}
      </View>
    </Screen>
  );
};

export default LoginScreen;
