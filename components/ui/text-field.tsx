import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fonts, radius } from '@/theme';

export function TextField({
  label,
  error,
  hint,
  prefix,
  style,
  ...props
}: TextInputProps & {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: string;
}) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.red : focused ? colors.blue : colors.gray200;

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          { borderColor },
          focused && !error ? styles.fieldFocused : null,
          error ? styles.fieldError : null,
        ]}
      >
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          placeholderTextColor={colors.gray400}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={[styles.input, style]}
          {...props}
        />
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.gray600 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
  },
  fieldFocused: {
    shadowColor: colors.blue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  fieldError: {
    shadowColor: colors.red,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  prefix: { fontFamily: fonts.bodyBold, color: colors.gray400, marginRight: 6 },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
  },
  error: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.red },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.gray600 },
});
