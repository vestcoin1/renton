import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, BedDouble, Bath, Heart, MapPin, ShieldCheck, Square } from "lucide-react-native";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ReactNode } from "react";
import { useFavorites } from "../../src/favorites";
import { formatNaira } from "../../src/format";
import { listings } from "../../src/listings";
import { colors, type } from "../../src/theme";

export default function PropertyDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { favoriteIds, ready, toggleFavorite } = useFavorites();
  const property = listings.find((listing) => listing.id === id);

  if (!property) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundTitle}>This home is unavailable</Text>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backLink}><Text style={styles.backText}>Go back</Text></Pressable>
      </View>
    );
  }

  const isFavorite = favoriteIds.includes(property.id);

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <Image source={{ uri: property.images[0] }} style={styles.heroImage} resizeMode="cover" />
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={[styles.floatingButton, styles.backButton]}>
            <ArrowLeft size={20} color={colors.ink} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? "Remove from saved homes" : "Save home"}
            disabled={!ready}
            onPress={() => toggleFavorite(property.id)}
            style={[styles.floatingButton, styles.saveButton]}
          >
            <Heart size={20} color={isFavorite ? colors.coral : colors.ink} fill={isFavorite ? colors.coral : "transparent"} />
          </Pressable>
          <View style={styles.verifiedBadge}><ShieldCheck size={15} color={colors.greenDark} /><Text style={styles.verifiedText}>VERIFIED HOME</Text></View>
        </View>

        <View style={styles.details}>
          <Text style={styles.price}>{formatNaira(property.rent)}<Text style={styles.perYear}> / year</Text></Text>
          <Text style={styles.title}>{property.title}</Text>
          <View style={styles.location}><MapPin size={15} color={colors.green} /><Text style={styles.locationText}>{property.address}, {property.city}</Text></View>

          <View style={styles.stats}>
            <Stat icon={<BedDouble size={18} color={colors.green} />} value={`${property.bedrooms} bedrooms`} />
            <Stat icon={<Bath size={18} color={colors.green} />} value={`${property.bathrooms} baths`} />
            <Stat icon={<Square size={18} color={colors.green} />} value={`${property.sizeSqm} m2`} />
          </View>

          <Text style={styles.sectionTitle}>About this home</Text>
          <Text style={styles.description}>{property.description}</Text>

          <Text style={styles.sectionTitle}>Home details</Text>
          <View style={styles.detailGrid}>
            <Detail label="Property type" value={property.type} />
            <Detail label="Availability" value={property.occupancy === "vacant" ? "Ready to move in" : "Available soon"} />
            <Detail label="Water" value={property.waterSupply} />
            <Detail label="Power" value={property.power} />
          </View>

          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={styles.amenities}>
            {property.amenities.map((amenity) => <View key={amenity} style={styles.amenity}><Text style={styles.amenityText}>{amenity}</Text></View>)}
          </View>
        </View>
      </ScrollView>
      <View style={styles.bottomBar}>
        <View><Text style={styles.bottomLabel}>Annual rent</Text><Text style={styles.bottomPrice}>{formatNaira(property.rent)}</Text></View>
        <Pressable accessibilityRole="button" onPress={() => toggleFavorite(property.id)} disabled={!ready} style={styles.saveAction}>
          <Heart size={17} color={colors.white} fill={isFavorite ? colors.white : "transparent"} />
          <Text style={styles.saveActionText}>{isFavorite ? "Saved" : "Save this home"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Stat({ icon, value }: { icon: ReactNode; value: string }) {
  return <View style={styles.stat}>{icon}<Text style={styles.statText}>{value}</Text></View>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={styles.detailItem}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  scrollContent: { paddingBottom: 105 },
  hero: { height: 310, position: "relative", backgroundColor: colors.greenPale },
  heroImage: { width: "100%", height: "100%" },
  floatingButton: { position: "absolute", top: 54, width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: colors.white },
  backButton: { left: 18 },
  saveButton: { right: 18 },
  verifiedBadge: { position: "absolute", left: 18, bottom: 16, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: colors.white },
  verifiedText: { color: colors.greenDark, fontFamily: type.bold, fontSize: 10, letterSpacing: 0.5 },
  details: { paddingHorizontal: 20, paddingTop: 20 },
  price: { color: colors.greenDark, fontFamily: type.bold, fontSize: 23 },
  perYear: { color: colors.muted, fontFamily: type.regular, fontSize: 13 },
  title: { marginTop: 5, color: colors.ink, fontFamily: type.bold, fontSize: 21, lineHeight: 27 },
  location: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  locationText: { flex: 1, color: colors.muted, fontFamily: type.regular, fontSize: 12 },
  stats: { flexDirection: "row", justifyContent: "space-between", marginTop: 20, padding: 15, borderRadius: 12, backgroundColor: colors.surface },
  stat: { alignItems: "center", gap: 7 },
  statText: { color: colors.ink, fontFamily: type.medium, fontSize: 11 },
  sectionTitle: { marginTop: 24, marginBottom: 10, color: colors.ink, fontFamily: type.bold, fontSize: 17 },
  description: { color: colors.muted, fontFamily: type.regular, fontSize: 13, lineHeight: 21 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  detailItem: { width: "48%", minHeight: 62, justifyContent: "center", paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.surface },
  detailLabel: { color: colors.muted, fontFamily: type.regular, fontSize: 10 },
  detailValue: { marginTop: 3, color: colors.ink, fontFamily: type.semiBold, fontSize: 12 },
  amenities: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  amenity: { borderRadius: 7, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: colors.greenPale },
  amenityText: { color: colors.greenDark, fontFamily: type.medium, fontSize: 11 },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, minHeight: 82, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 10, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface },
  bottomLabel: { color: colors.muted, fontFamily: type.regular, fontSize: 10 },
  bottomPrice: { marginTop: 2, color: colors.ink, fontFamily: type.bold, fontSize: 16 },
  saveAction: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 17, borderRadius: 9, backgroundColor: colors.green },
  saveActionText: { color: colors.white, fontFamily: type.semiBold, fontSize: 13 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas },
  notFoundTitle: { color: colors.ink, fontFamily: type.semiBold, fontSize: 17 },
  backLink: { marginTop: 12, padding: 10 },
  backText: { color: colors.green, fontFamily: type.semiBold, fontSize: 14 },
});