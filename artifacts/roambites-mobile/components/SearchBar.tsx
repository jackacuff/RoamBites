import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Search...",
}: SearchBarProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.muted,
          borderRadius: colors.radius,
        },
      ]}
    >
      <Feather name="search" size={16} color={colors.mutedForeground} />
      <TextInput
        style={[
          styles.input,
          { color: colors.foreground, fontFamily: "Inter_400Regular" },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText("")} hitSlop={8}>
          <Feather name="x" size={16} color={colors.mutedForeground} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
});
