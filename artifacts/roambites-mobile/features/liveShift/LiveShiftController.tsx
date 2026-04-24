import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useLiveHeartbeat } from "./useLiveHeartbeat";

interface Props {
  truckId: number | null;
  isLive: boolean;
  onShiftEnded?: () => void;
}

// Banner + streaming controller. Mount once in the vendor dashboard.
// While the truck is live, it streams location via useLiveHeartbeat and
// renders a persistent banner so the vendor always knows sharing is on.
export function LiveShiftController({ truckId, isLive, onShiftEnded }: Props) {
  const colors = useColors();

  useLiveHeartbeat({ truckId, isLive, onNotLive: onShiftEnded });

  if (!isLive || Platform.OS === "web") return null;

  return (
    <View style={[styles.banner, { backgroundColor: colors.accent }]}>
      <Feather name="radio" size={16} color="#fff" />
      <Text style={styles.text}>Sharing location — tap End Shift to stop</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  text: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
