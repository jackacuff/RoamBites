import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListTrucks } from "@workspace/api-client-react";
import { SearchBar } from "@/components/SearchBar";
import { TruckCard } from "@/components/TruckCard";
import { useColors } from "@/hooks/useColors";

type SortMode = "default" | "topRated";

export default function BrowseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [search, setSearch] = useState("");
  const [openNow, setOpenNow] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [refreshing, setRefreshing] = useState(false);

  const { data: trucks, isLoading, refetch } = useListTrucks({
    search: search || undefined,
    openNow: openNow || undefined,
  });

  const sortedTrucks = useMemo(() => {
    if (!trucks) return [];
    if (sortMode === "default") {
      return [...trucks].sort((a, b) => {
        const aOpen = a.status === "open" ? 1 : 0;
        const bOpen = b.status === "open" ? 1 : 0;
        return bOpen - aOpen;
      });
    }
    return trucks;
  }, [trucks, sortMode]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const chips: { label: string; active: boolean; onPress: () => void }[] = [
    {
      label: "Open Now",
      active: openNow,
      onPress: () => setOpenNow(!openNow),
    },
    {
      label: "All Trucks",
      active: !openNow && sortMode === "default",
      onPress: () => { setOpenNow(false); setSortMode("default"); },
    },
  ];

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
          Browse Trucks Near You
        </Text>
        <View style={styles.searchWrap}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search trucks, cuisines..."
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersRow}
          contentContainerStyle={{ paddingRight: 16 }}
        >
          {chips.map((chip) => (
            <Pressable
              key={chip.label}
              onPress={chip.onPress}
              style={[
                styles.chip,
                {
                  backgroundColor: chip.active ? colors.primary : colors.muted,
                  borderRadius: colors.radius / 2,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: chip.active ? "#FFF" : colors.mutedForeground },
                ]}
              >
                {chip.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={sortedTrucks}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <TruckCard truck={item} />}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom: isWeb ? 34 : insets.bottom + 100,
            },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={sortedTrucks.length > 0}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            sortedTrucks.length > 0
              ? () => (
                  <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
                    {sortedTrucks.length} truck{sortedTrucks.length !== 1 ? "s" : ""}
                    {openNow ? " open now" : " in Central Oklahoma"}
                  </Text>
                )
              : null
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No trucks found
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  { color: colors.mutedForeground },
                ]}
              >
                Try adjusting your search or filters
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
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
  },
  searchWrap: { marginBottom: 10 },
  filtersRow: { marginBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
  },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: { paddingHorizontal: 16, paddingTop: 8 },
  resultCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 8,
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
  },
});
