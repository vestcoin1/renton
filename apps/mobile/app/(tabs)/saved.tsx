import { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Heart } from "lucide-react-native";
import { PropertyCard } from "../../src/property-card";
import { useFavorites } from "../../src/favorites";
import { listings } from "../../src/listings";
import { colors, type } from "../../src/theme";

export default function SavedScreen() {
  const { favoriteIds } = useFavorites();
  const savedListings = useMemo(() => listings.filter((property) => favoriteIds.includes(property.id)), [favoriteIds]);

  return (
    <FlatList
      data={savedListings}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <PropertyCard property={item} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.eyebrow}>YOUR SHORTLIST</Text>
          <Text style={styles.title}>Saved homes</Text>
          <Text style={styles.count}>{savedListings.length} {savedListings.length === 1 ? "home" : "homes"} saved on this device</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <View style={styles.iconCircle}><Heart size={22} color={colors.green} /></View>
          <Text style={styles.emptyTitle}>Your shortlist starts here</Text>
          <Text style={styles.emptyCopy}>Tap the heart on any home to keep it close.</Text>
        </View>
      }
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 24, paddingBottom: 24, backgroundColor: colors.canvas },
  header: { marginBottom: 20 },
  eyebrow: { color: colors.green, fontFamily: type.bold, fontSize: 9, letterSpacing: 1.2 },
  title: { marginTop: 6, color: colors.ink, fontFamily: type.bold, fontSize: 30 },
  count: { marginTop: 4, color: colors.muted, fontFamily: type.regular, fontSize: 13 },
  emptyState: { alignItems: "center", paddingHorizontal: 24, paddingVertical: 44, borderRadius: 16, backgroundColor: colors.surface },
  iconCircle: { width: 52, height: 52, alignItems: "center", justifyContent: "center", borderRadius: 26, backgroundColor: colors.greenPale },
  emptyTitle: { marginTop: 15, color: colors.ink, fontFamily: type.semiBold, fontSize: 17 },
  emptyCopy: { marginTop: 6, color: colors.muted, fontFamily: type.regular, fontSize: 13, textAlign: "center" },
});