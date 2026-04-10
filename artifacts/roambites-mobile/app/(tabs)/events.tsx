import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListEvents } from "@workspace/api-client-react";
import { EventCard } from "@/components/EventCard";
import { useColors } from "@/hooks/useColors";

type Tab = "upcoming" | "featured" | "all";

const TABS: { label: string; value: Tab }[] = [
  { label: "Upcoming", value: "upcoming" },
  { label: "⭐ Featured", value: "featured" },
  { label: "All Events", value: "all" },
];

export default function EventsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");
  const [refreshing, setRefreshing] = useState(false);
  const isWeb = Platform.OS === "web";

  const { data: events, isLoading, refetch } = useListEvents({
    upcoming: activeTab === "upcoming" ? true : undefined,
  });

  const displayEvents = useMemo(() => {
    if (!events) return [];
    if (activeTab === "featured") return events.filter((e) => e.isFeatured);
    const featured = events.filter((e) => e.isFeatured);
    const rest = events.filter((e) => !e.isFeatured);
    return [...featured, ...rest];
  }, [events, activeTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const hasFeatured = events?.some((e) => e.isFeatured);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: isWeb ? 67 + 8 : insets.top + 8,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          Events near you
        </Text>
        <View
          style={[
            styles.toggle,
            {
              backgroundColor: colors.muted,
              borderRadius: colors.radius,
            },
          ]}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <Pressable
                key={tab.value}
                onPress={() => setActiveTab(tab.value)}
                style={[
                  styles.toggleBtn,
                  {
                    backgroundColor: isActive ? colors.primary : "transparent",
                    borderRadius: colors.radius - 2,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.toggleText,
                    { color: isActive ? "#FFF" : colors.mutedForeground },
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={displayEvents}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <EventCard event={item} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: isWeb ? 34 : insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={displayEvents.length > 0}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            activeTab !== "featured" && hasFeatured && displayEvents.length > 0
              ? () => (
                  <View
                    style={[
                      styles.featuredBanner,
                      {
                        backgroundColor: colors.secondary + "15",
                        borderColor: colors.secondary + "40",
                        borderRadius: colors.radius,
                      },
                    ]}
                  >
                    <Text style={[styles.featuredBannerText, { color: colors.foreground }]}>
                      ⭐ Featured events are shown first
                    </Text>
                  </View>
                )
              : null
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {activeTab === "featured"
                  ? "No featured events right now"
                  : "No events found"}
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  { color: colors.mutedForeground },
                ]}
              >
                {activeTab === "featured"
                  ? "Check back soon for featured food truck events"
                  : "Check back soon for upcoming food truck events in Central Oklahoma"}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
  },
  toggle: { flexDirection: "row", padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: "center", paddingHorizontal: 4 },
  toggleText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: { paddingHorizontal: 16, paddingTop: 8 },
  featuredBanner: {
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  featuredBannerText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  emptyState: {
    paddingTop: 60,
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
});
