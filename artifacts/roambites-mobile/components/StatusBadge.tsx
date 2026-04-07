import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface StatusBadgeProps {
  status: string;
  isLive: boolean;
  compact?: boolean;
}

export function StatusBadge({ status, isLive, compact = false }: StatusBadgeProps) {
  const colors = useColors();

  const getConfig = () => {
    if (isLive || status === "open") {
      return { bg: colors.accent + "22", text: colors.accent, label: "Open" };
    }
    if (status === "closing_soon") {
      return { bg: colors.secondary + "22", text: colors.secondary, label: "Closing Soon" };
    }
    if (status === "opening_later") {
      return { bg: colors.primary + "22", text: colors.primary, label: "Opening Later" };
    }
    return { bg: colors.muted, text: colors.mutedForeground, label: "Closed" };
  };

  const { bg, text, label } = getConfig();

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderRadius: compact ? 4 : 6 }]}>
      {(isLive || status === "open") && (
        <View style={[styles.dot, { backgroundColor: text }]} />
      )}
      <Text style={[styles.text, { color: text, fontSize: compact ? 10 : 11 }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
});
