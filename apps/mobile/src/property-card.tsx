import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { BedDouble, Heart, MapPin, ShieldCheck } from "lucide-react-native";
import type { Property } from "renton-shared/types";
import { useFavorites } from "./favorites";
import { formatCompactNaira } from "./format";
import { colors, type } from "./theme";

export function PropertyCard({ property }: { property: Property }) {
  const router = useRouter();
  const { favoriteIds, ready, toggleFavorite } = useFavorites();
  const isFavorite = favoriteIds.includes(property.id);

  return (
    <View style={styles.card}>
      <View style={styles.imageFrame}>
        <View style={styles.imageAction}>
          <Image source={{ uri: property.images[0] }} style={styles.image} resizeMode="cover" />
          <View style={styles.verifiedPill}>
            <ShieldCheck size={14} color={colors.greenDark} strokeWidth={2.5} />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
          {property.featured ? (
            <View style={styles.featuredPill}>
              <Text style={styles.featuredText}>FEATURED</Text>
            </View>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? "Remove from saved homes" : "Save home"}
          disabled={!ready}
          onPress={() => toggleFavorite(property.id)}
          style={styles.heartButton}
        >
          <Heart size={19} color={isFavorite ? colors.coral : colors.ink} fill={isFavorite ? colors.coral : "transparent"} />
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${property.title}`}
        onPress={() => router.push({ pathname: "/property/[id]", params: { id: property.id } })}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <View>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatCompactNaira(property.rent)}</Text>
            <Text style={styles.perYear}>/ year</Text>
          </View>
          <Text numberOfLines={1} style={styles.title}>{property.title}</Text>
          <View style={styles.metaRow}>
            <MapPin size={14} color={colors.muted} />
            <Text numberOfLines={1} style={styles.location}>{property.area}, {property.city}</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.footRow}>
            <View style={styles.bedrooms}>
              <BedDouble size={16} color={colors.green} />
              <Text style={styles.bedroomText}>{property.bedrooms} {property.bedrooms === 1 ? "bedroom" : "bedrooms"}</Text>
            </View>
            <Text style={styles.propertyType}>{property.type}</Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: "hidden", borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, marginBottom: 16 },
  pressed: { opacity: 0.94, transform: [{ scale: 0.99 }] },
  imageFrame: { height: 212, position: "relative", backgroundColor: colors.greenPale },
  imageAction: { flex: 1 },
  image: { width: "100%", height: "100%" },
  verifiedPill: { position: "absolute", top: 14, left: 14, flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 7, backgroundColor: "#F7FFF9", paddingHorizontal: 9, paddingVertical: 6 },
  verifiedText: { color: colors.greenDark, fontFamily: type.semiBold, fontSize: 11 },
  heartButton: { position: "absolute", top: 12, right: 12, width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: colors.white },
  featuredPill: { position: "absolute", left: 14, bottom: 13, borderRadius: 5, backgroundColor: colors.amber, paddingHorizontal: 8, paddingVertical: 5 },
  featuredText: { color: colors.ink, fontFamily: type.bold, fontSize: 9, letterSpacing: 0.7 },
  body: { paddingHorizontal: 15, paddingTop: 13, paddingBottom: 14 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 5 },
  price: { color: colors.ink, fontFamily: type.bold, fontSize: 20 },
  perYear: { color: colors.muted, fontFamily: type.regular, fontSize: 12 },
  title: { marginTop: 5, color: colors.ink, fontFamily: type.semiBold, fontSize: 15 },
  metaRow: { marginTop: 6, flexDirection: "row", alignItems: "center", gap: 5 },
  location: { flex: 1, color: colors.muted, fontFamily: type.regular, fontSize: 12 },
  separator: { height: 1, marginTop: 13, marginBottom: 11, backgroundColor: colors.line },
  footRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bedrooms: { flexDirection: "row", alignItems: "center", gap: 6 },
  bedroomText: { color: colors.ink, fontFamily: type.medium, fontSize: 12 },
  propertyType: { color: colors.muted, fontFamily: type.medium, fontSize: 12 },
});