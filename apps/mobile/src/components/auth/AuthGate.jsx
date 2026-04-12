import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLoginWithEmail } from '@privy-io/expo';
import { Colors, Fonts, Spacing } from '../../constants/theme';

export default function AuthGate() {
  const { sendCode, loginWithCode, state } = useLoginWithEmail();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);

  const awaitingCode = state.status === 'awaiting-code-input' || state.status === 'submitting-code';
  const busy = state.status === 'sending-code' || state.status === 'submitting-code';

  const buttonLabel = useMemo(() => {
    if (state.status === 'sending-code') return 'Sending Code…';
    if (state.status === 'submitting-code') return 'Verifying…';
    return awaitingCode ? 'Verify And Continue' : 'Continue With Email';
  }, [awaitingCode, state.status]);

  const helperText = awaitingCode
    ? `Enter the 6-digit code sent to ${email || 'your email'}.`
    : 'Sign in first. The wallet and live data will be wired to this session.';

  async function handleContinue() {
    setError(null);
    try {
      if (!awaitingCode) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          throw new Error('Enter a valid email address.');
        }
        await sendCode({ email: email.trim() });
        return;
      }

      if (!code.trim()) {
        throw new Error('Enter the verification code.');
      }

      await loginWithCode({
        email: email.trim(),
        code: code.trim(),
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to continue.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Agent Online</Text>
        </View>

        <Text style={styles.title}>Amara</Text>
        <Text style={styles.subtitle}>
          AI-assisted wallet access for the live Base, Ethereum, and BNB flows.
        </Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="name@example.com"
          placeholderTextColor={Colors.muted2}
          value={email}
          onChangeText={setEmail}
          editable={!awaitingCode && !busy}
        />

        {awaitingCode && (
          <>
            <Text style={styles.label}>Verification Code</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              placeholder="123456"
              placeholderTextColor={Colors.muted2}
              value={code}
              onChangeText={setCode}
              editable={!busy}
            />
          </>
        )}

        <Text style={styles.helper}>{helperText}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {state.status === 'error' && state.error ? (
          <Text style={styles.error}>{state.error.message}</Text>
        ) : null}

        <TouchableOpacity style={[styles.cta, busy && styles.ctaDisabled]} onPress={() => { void handleContinue(); }} disabled={busy}>
          <Text style={styles.ctaText}>{buttonLabel}</Text>
        </TouchableOpacity>

        {awaitingCode && (
          <TouchableOpacity style={styles.secondary} onPress={() => { setCode(''); setError(null); }}>
            <Text style={styles.secondaryText}>Keep Email, Clear Code</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.earth,
  },
  card: {
    backgroundColor: Colors.soil,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
  },
  liveBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.lg,
    backgroundColor: 'rgba(46,204,113,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(46,204,113,0.20)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.green },
  liveText: {
    color: Colors.green,
    fontFamily: Fonts.sansBd,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.serif,
    fontSize: 40,
    lineHeight: 44,
  },
  subtitle: {
    color: Colors.text2,
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 20,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  label: {
    color: Colors.muted,
    fontFamily: Fonts.sansBd,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.clay,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    fontFamily: Fonts.sans,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  helper: {
    color: Colors.muted,
    fontFamily: Fonts.sans,
    fontSize: 11,
    lineHeight: 17,
    marginTop: Spacing.sm,
  },
  error: {
    color: Colors.kola,
    fontFamily: Fonts.sansMd,
    fontSize: 11,
    marginTop: Spacing.sm,
  },
  cta: {
    backgroundColor: Colors.gold,
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingVertical: 14,
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    color: Colors.earth,
    fontFamily: Fonts.sansBd,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  secondary: {
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryText: {
    color: Colors.text2,
    fontFamily: Fonts.sansBd,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
