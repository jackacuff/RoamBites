import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useGetTruck,
  useGetTruckReviews,
  useAddFavorite,
  useRemoveFavorite,
  useCreateReview,
  useListFavorites,
} from "@workspace/api-client-react";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function TruckDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data: truck, isLoading } = useGetTruck(id);
  const { data: reviewsData, refetch: refetchReviews } = useGetTruckReviews(id);
  const { data: favorites, refetch: refetchFavorites } = useListFavorites();

  const addFavoriteMutation = useAddFavorite();
  const removeFavoriteMutation = useRemoveFavorite();
  const createReviewMutation = useCreateReview();

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isFavorited = favorites?.some((f) => f.truckId === truck?.id);

  const toggleFavorite = async () => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    if (!truck) return;
    if (isFavorited) {
      await removeFavoriteMutation.mutateAsync({ truckId: truck.id });
    } else {
      await addFavoriteMutation.mutateAsync({ data: { truckId: truck.id } });
    }
    refetchFavorites();
  };

  const submitReview = async () => {
    if (!truck) return;
    if (!reviewComment.trim()) {
      Alert.alert("Please add a comment");
      return;
    }
    setSubmitting(true);
    try {
      await createReviewMutation.mutateAsync({
        data: {
          truckId: truck.id,
          rating: reviewRating,
          comment: reviewComment.trim(),
        },
      });
      setReviewComment("");
      setReviewRating(5);
      setShowReviewForm(false);
      refetchReviews();
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Could not submit review");
    } finally {
      setSubmitting(false);
    }
  };

  if (!id || isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!truck) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>
          Truck not found
        </Text>
      </View>
    );
  }

  const groupedMenuItems = truck.menuItems.reduce(
    (acc, item) => {
      const cat = item.category ?? "Other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    },
    {} as Record<string, typeof truck.menuItems>
  );

  const userAlreadyReviewed = reviewsData?.reviews.some(
    (r) => r.userId === user?.id
  );

  const achievements: { icon: string; label: string; color: string; bg: string }[] = [];
  const avg = truck.avgRating ?? 0;
  const reviews = truck.reviewCount ?? 0;
  const favs = truck.favoritesCount ?? 0;
  if (avg >= 4.5 && reviews >= 3) achievements.push({ icon: "⭐", label: "Top Rated", color: "#92400e", bg: "#fef3c7" });
  else if (avg >= 4.0 && reviews >= 5) achievements.push({ icon: "❤️", label: "Customer Favorite", color: "#7f1d1d", bg: "#fee2e2" });
  if (reviews >= 50) achievements.push({ icon: "💬", label: "50+ Reviews", color: "#1e3a5f", bg: "#dbeafe" });
  else if (reviews >= 10) achievements.push({ icon: "💬", label: "10+ Reviews", color: "#1e3a5f", bg: "#dbeafe" });
  if (favs >= 20) achievements.push({ icon: "🔥", label: "Popular Choice", color: "#7c2d12", bg: "#ffedd5" });
  const memberSince = new Date(truck.createdAt);
  const yearsOld = (Date.now() - memberSince.getTime()) / (365.25 * 24 * 3600 * 1000);
  if (yearsOld >= 1) achievements.push({ icon: "🏆", label: "Established Vendor", color: "#065f46", bg: "#d1fae5" });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Image */}
      <View style={styles.heroWrap}>
        {truck.imageUrl ? (
          <Image
            source={{ uri: truck.imageUrl }}
            style={styles.heroImage}
            contentFit="cover"
          />
        ) : (
          <View
            style={[styles.heroImage, styles.heroPlaceholder, { backgroundColor: colors.muted }]}
          >
            <Feather name="truck" size={48} color={colors.mutedForeground} />
          </View>
        )}
        {/* Back button */}
        <Pressable
          onPress={() => router.back()}
          style={[
            styles.backBtn,
            {
              backgroundColor: colors.card + "EE",
              top: Platform.OS === "ios" ? insets.top + 8 : 16,
            },
          ]}
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        {/* Favorite button */}
        <Pressable
          onPress={toggleFavorite}
          style={[
            styles.favBtn,
            {
              backgroundColor: colors.card + "EE",
              top: Platform.OS === "ios" ? insets.top + 8 : 16,
            },
          ]}
        >
          <Feather
            name="heart"
            size={20}
            color={isFavorited ? colors.destructive : colors.foreground}
            fill={isFavorited ? colors.destructive : "none"}
          />
        </Pressable>
      </View>

      {/* Info */}
      <View style={styles.section}>
        <View style={styles.titleRow}>
          <Text style={[styles.truckName, { color: colors.foreground }]}>
            {truck.name}
          </Text>
          <StatusBadge status={truck.status} isLive={truck.isLive} />
        </View>
        <Text style={[styles.cuisine, { color: colors.mutedForeground }]}>
          {truck.cuisine}
        </Text>
        {truck.description && (
          <Text style={[styles.description, { color: colors.foreground }]}>
            {truck.description}
          </Text>
        )}

        {/* Location */}
        {truck.currentLocation && (
          <View style={styles.metaRow}>
            <Feather name="map-pin" size={14} color={colors.primary} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {truck.currentLocation}
              {truck.currentCity ? `, ${truck.currentCity}` : ""}
            </Text>
          </View>
        )}

        {/* Contact */}
        {truck.phone && (
          <Pressable
            onPress={() => Linking.openURL(`tel:${truck.phone}`)}
            style={styles.metaRow}
          >
            <Feather name="phone" size={14} color={colors.primary} />
            <Text style={[styles.metaLink, { color: colors.primary }]}>
              {truck.phone}
            </Text>
          </Pressable>
        )}
        {truck.website && (
          <Pressable
            onPress={() => Linking.openURL(truck.website!)}
            style={styles.metaRow}
          >
            <Feather name="globe" size={14} color={colors.primary} />
            <Text
              style={[styles.metaLink, { color: colors.primary }]}
              numberOfLines={1}
            >
              {truck.website}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Achievements */}
      {achievements.length > 0 && (
        <View style={[styles.section, { paddingTop: 0 }]}>
          <Text style={[styles.achievementsLabel, { color: colors.mutedForeground }]}>
            ACHIEVEMENTS
          </Text>
          <View style={styles.achievementsRow}>
            {achievements.slice(0, 5).map((a) => (
              <View
                key={a.label}
                style={[styles.achievementPill, { backgroundColor: a.bg }]}
              >
                <Text style={styles.achievementIcon}>{a.icon}</Text>
                <Text style={[styles.achievementText, { color: a.color }]}>
                  {a.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Menu */}
      {truck.menuItems.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Menu
          </Text>
          {Object.entries(groupedMenuItems).map(([category, items]) => (
            <View key={category} style={styles.menuCategory}>
              <Text
                style={[styles.menuCategoryName, { color: colors.mutedForeground }]}
              >
                {category}
              </Text>
              {items.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.menuItem,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderRadius: colors.radius / 2,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.menuItemName, { color: colors.foreground }]}
                    >
                      {item.name}
                    </Text>
                    {item.description && (
                      <Text
                        style={[
                          styles.menuItemDesc,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {item.description}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.menuItemPrice, { color: colors.primary }]}>
                    ${item.price.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      {/* Schedule */}
      {truck.scheduleEntries.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Schedule
          </Text>
          {truck.scheduleEntries.slice(0, 5).map((entry) => {
            const start = new Date(entry.startDateTime);
            const end = new Date(entry.endDateTime);
            const day = start.toLocaleDateString("default", {
              weekday: "short",
              month: "short",
              day: "numeric",
            });
            const timeRange = `${start.toLocaleTimeString("default", { hour: "numeric", minute: "2-digit" })} – ${end.toLocaleTimeString("default", { hour: "numeric", minute: "2-digit" })}`;
            return (
              <View
                key={entry.id}
                style={[
                  styles.scheduleEntry,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius / 2,
                  },
                ]}
              >
                <View
                  style={[
                    styles.scheduleActive,
                    {
                      backgroundColor: entry.isLive
                        ? colors.accent
                        : colors.muted,
                    },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.scheduleName, { color: colors.foreground }]}
                  >
                    {entry.venueName}
                  </Text>
                  <Text
                    style={[
                      styles.scheduleDate,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {day} · {timeRange}
                  </Text>
                  {entry.address && (
                    <Text
                      style={[
                        styles.scheduleAddress,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {entry.address}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Reviews */}
      <View style={styles.section}>
        <View style={styles.reviewsHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Reviews
            </Text>
            {reviewsData?.avgRating != null && (
              <View style={styles.ratingRow}>
                <Feather name="star" size={16} color={colors.secondary} />
                <Text
                  style={[styles.avgRating, { color: colors.foreground }]}
                >
                  {reviewsData.avgRating.toFixed(1)}
                </Text>
                <Text
                  style={[styles.reviewCount, { color: colors.mutedForeground }]}
                >
                  ({reviewsData.total})
                </Text>
              </View>
            )}
          </View>
          {user && !userAlreadyReviewed && (
            <Pressable
              onPress={() => setShowReviewForm(!showReviewForm)}
              style={[
                styles.writeReviewBtn,
                {
                  backgroundColor: colors.primary + "18",
                  borderRadius: colors.radius / 2,
                },
              ]}
            >
              <Text style={[styles.writeReviewText, { color: colors.primary }]}>
                {showReviewForm ? "Cancel" : "Write Review"}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Review form */}
        {showReviewForm && (
          <View
            style={[
              styles.reviewForm,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>
              Rating
            </Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  onPress={() => setReviewRating(star)}
                  hitSlop={4}
                >
                  <Feather
                    name="star"
                    size={28}
                    color={
                      star <= reviewRating ? colors.secondary : colors.border
                    }
                    fill={star <= reviewRating ? colors.secondary : "none"}
                  />
                </Pressable>
              ))}
            </View>
            <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>
              Comment
            </Text>
            <TextInput
              style={[
                styles.commentInput,
                {
                  color: colors.foreground,
                  backgroundColor: colors.muted,
                  borderRadius: colors.radius / 2,
                  fontFamily: "Inter_400Regular",
                },
              ]}
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="Share your experience..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
            />
            <Pressable
              onPress={submitReview}
              disabled={submitting}
              style={[
                styles.submitBtn,
                {
                  backgroundColor: submitting ? colors.muted : colors.primary,
                  borderRadius: colors.radius / 2,
                },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Review</Text>
              )}
            </Pressable>
          </View>
        )}

        {/* Reviews list */}
        {reviewsData?.reviews && reviewsData.reviews.length > 0 ? (
          reviewsData.reviews.map((review) => (
            <View
              key={review.id}
              style={[
                styles.reviewCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <View style={styles.reviewCardHeader}>
                <Text
                  style={[styles.reviewerName, { color: colors.foreground }]}
                >
                  {review.userName ?? "Anonymous"}
                </Text>
                <View style={styles.reviewStars}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Feather
                      key={s}
                      name="star"
                      size={12}
                      color={
                        s <= review.rating ? colors.secondary : colors.border
                      }
                      fill={s <= review.rating ? colors.secondary : "none"}
                    />
                  ))}
                </View>
              </View>
              <Text
                style={[styles.reviewComment, { color: colors.foreground }]}
              >
                {review.comment}
              </Text>
              <Text
                style={[styles.reviewDate, { color: colors.mutedForeground }]}
              >
                {new Date(review.createdAt).toLocaleDateString()}
              </Text>
            </View>
          ))
        ) : (
          <Text style={[styles.noReviews, { color: colors.mutedForeground }]}>
            No reviews yet. Be the first to review!
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  notFoundText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  content: {},
  heroWrap: { position: "relative" },
  heroImage: { width: "100%", height: 240 },
  heroPlaceholder: { alignItems: "center", justifyContent: "center" },
  backBtn: {
    position: "absolute",
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  favBtn: {
    position: "absolute",
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  truckName: { fontSize: 24, fontFamily: "Inter_700Bold", flex: 1 },
  cuisine: { fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 10 },
  description: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    marginBottom: 12,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  metaText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  metaLink: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
  },
  menuCategory: { marginBottom: 16 },
  menuCategoryName: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    marginBottom: 6,
    gap: 12,
  },
  menuItemName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  menuItemDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  menuItemPrice: { fontSize: 14, fontFamily: "Inter_700Bold" },
  scheduleEntry: {
    flexDirection: "row",
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 8,
    alignItems: "stretch",
  },
  scheduleActive: { width: 4 },
  scheduleName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  scheduleDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 12,
    paddingBottom: 2,
  },
  scheduleAddress: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 12,
    paddingBottom: 10,
    color: "gray",
  },
  reviewsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  avgRating: { fontSize: 16, fontFamily: "Inter_700Bold" },
  reviewCount: { fontSize: 14, fontFamily: "Inter_400Regular" },
  writeReviewBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  writeReviewText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  reviewForm: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  formLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  starsRow: { flexDirection: "row", gap: 8 },
  commentInput: {
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
  submitBtn: {
    paddingVertical: 12,
    alignItems: "center",
  },
  submitBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  reviewCard: {
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 6,
  },
  reviewCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewerName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  reviewStars: { flexDirection: "row", gap: 2 },
  reviewComment: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  reviewDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  noReviews: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingVertical: 20,
  },
  achievementsLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  achievementsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  achievementPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  achievementIcon: { fontSize: 13 },
  achievementText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});
