import React, { useState } from "react";
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

const CITIES = ["All", "OKC", "Edmond", "Norman", "Moore"];

export default function BrowseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [openNow, setOpenNow] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: trucks, isLoading, refetch } = useListTrucks({
    search: search || undefined,
    city: selectedCity || undefined,
    openNow: openNow || undefined,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

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
          Browse Trucks
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
          <Pressable
            onPress={() => setOpenNow(!openNow)}
            style={[
              styles.chip,
              {
                backgroundColor: openNow ? colors.accent : colors.muted,
                borderRadius: colors.radius / 2,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: openNow ? "#FFF" : colors.mutedForeground },
              ]}
            >
              Open Now
            </Text>
          </Pressable>
          {CITIES.map((city) => {
            const isSelected =
              (city === "All" && !selectedCity) || selectedCity === city;
            return (
              <Pressable
                key={city}
                onPress={() =>
                  setSelectedCity(city === "All" ? null : city)
                }
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected
                      ? colors.foreground
                      : colors.muted,
                    borderRadius: colors.radius / 2,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isSelected
                        ? colors.background
                        : colors.mutedForeground,
                    },
                  ]}
                >
                  {city}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={trucks ?? []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <TruckCard truck={item} />}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom: isWeb ? 34 : insets.bottom + 100,
            },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!(trucks && trucks.length > 0)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
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
  listContent: { paddingHorizontal: 16, paddingTop: 12 },
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
