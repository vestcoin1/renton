import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Search, SlidersHorizontal, Sparkles } from "lucide-react-native";
import { CITIES } from "renton-shared/reference";
import type { Property } from "renton-shared/types";
import { PropertyCard } from "../../src/property-card";
import { listings } from "../../src/listings";
import { colors, type } from "../../src/theme";

const budgets = [
  { label: "Any budget", max: null },
  { label: "Under \u20A63m", max: 3_000_000 },
  { label: "Under \u20A66m", max: 6_000_000 },
  { label: "Under \u20A612m", max: 12_000_000 },
];
const bedrooms = [0, 1, 2, 3];

export default function ExploreScreen() {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState<string | null>("Lagos");
  const [maxBudget, setMaxBudget] = useState<number | null>(null);
  const [minimumBedrooms, setMinimumBedrooms] = useState(0);

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return listings.filter((property) => {
      const matchesCity = !city || property.city === city;
      const matchesBudget = maxBudget === null || property.rent <= maxBudget;
      const matchesBedrooms = minimumBedrooms === 0 || property.bedrooms >= minimumBedrooms;
      const searchable = `${property.title} ${property.city} ${property.area} ${property.address}`.toLowerCase();
      return matchesCity && matchesBudget && matchesBedrooms && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [city, maxBudget, minimumBedrooms, query]);

  const renderHeader = () => (
    <View>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.wordmark}>renton<Text style={styles.wordmarkDot}>.</Text></Text>
          <Text style={styles.topCaption}>YOUR NEXT CHAPTER STARTS HERE</Text>
        </View>
        <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>Nigeria</Text></View>
      </View>

      <Text style={styles.heading}>{"Find a place\nto call home."}</Text>
      <Text style={styles.subheading}>Verified homes, chosen around your life.</Text>

      <View style={styles.searchBox}>
        <Search size={19} color={colors.green} />
        <TextInput
          accessibilityLabel="Search homes"
          placeholder="Area, city or property name"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          style={styles.searchInput}
        />
        <SlidersHorizontal size={19} color={colors.ink} />
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Explore by city</Text>
        <Sparkles size={16} color={colors.coral} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        <FilterChip label="All Nigeria" selected={city === null} onPress={() => setCity(null)} />
        {CITIES.map((item) => (
          <FilterChip key={item.name} label={item.name} selected={city === item.name} onPress={() => setCity(item.name)} />
        ))}
      </ScrollView>

      <View style={styles.filtersBlock}>
        <Text style={styles.filterLabel}>ANNUAL BUDGET</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {budgets.map((budget) => (
            <FilterChip key={budget.label} label={budget.label} selected={maxBudget === budget.max} onPress={() => setMaxBudget(budget.max)} compact />
          ))}
        </ScrollView>
        <Text style={[styles.filterLabel, styles.bedroomLabel]}>BEDROOMS</Text>
        <View style={styles.bedroomRow}>
          {bedrooms.map((count) => (
            <FilterChip key={count} label={count === 0 ? "Any" : `${count}+`} selected={minimumBedrooms === count} onPress={() => setMinimumBedrooms(count)} compact />
          ))}
        </View>
      </View>

      <View style={styles.resultsHeader}>
        <View>
          <Text style={styles.resultsTitle}>{city ?? "Nigeria"}</Text>
          <Text style={styles.resultsCount}>{results.length} verified {results.length === 1 ? "home" : "homes"}</Text>
        </View>
        <Text style={styles.sortLabel}>Recommended</Text>
      </View>
    </View>
  );

  return (
    <FlatList<Property>
      data={results}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <PropertyCard property={item} />}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={<EmptyResults />}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    />
  );
}

function FilterChip({ label, selected, onPress, compact = false }: { label: string; selected: boolean; onPress: () => void; compact?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.chip, compact && styles.compactChip, selected && styles.selectedChip]}>
      <Text style={[styles.chipText, selected && styles.selectedChipText]}>{label}</Text>
    </Pressable>
  );
}

function EmptyResults() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No homes match those filters</Text>
      <Text style={styles.emptyCopy}>Try a different city or a wider budget.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 24, backgroundColor: colors.canvas },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
  wordmark: { color: colors.greenDark, fontFamily: type.bold, fontSize: 26 },
  wordmarkDot: { color: colors.coral },
  topCaption: { marginTop: 1, color: colors.muted, fontFamily: type.bold, fontSize: 8, letterSpacing: 1.15 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.coral },
  liveText: { color: colors.ink, fontFamily: type.semiBold, fontSize: 11 },
  heading: { color: colors.ink, fontFamily: type.bold, fontSize: 33, lineHeight: 37 },
  subheading: { marginTop: 8, color: colors.muted, fontFamily: type.regular, fontSize: 14 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 11, height: 52, marginTop: 20, marginBottom: 23, paddingHorizontal: 15, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.surface },
  searchInput: { flex: 1, color: colors.ink, fontFamily: type.regular, fontSize: 14 },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 11 },
  sectionTitle: { color: colors.ink, fontFamily: type.semiBold, fontSize: 15 },
  chipRow: { gap: 8, paddingRight: 8 },
  chip: { minHeight: 36, justifyContent: "center", paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  compactChip: { minHeight: 32, paddingHorizontal: 12 },
  selectedChip: { borderColor: colors.green, backgroundColor: colors.green },
  chipText: { color: colors.ink, fontFamily: type.medium, fontSize: 12 },
  selectedChipText: { color: colors.white, fontFamily: type.semiBold },
  filtersBlock: { marginTop: 22, padding: 14, borderRadius: 12, backgroundColor: "#E9EEE8" },
  filterLabel: { marginBottom: 9, color: colors.muted, fontFamily: type.bold, fontSize: 9, letterSpacing: 1 },
  bedroomLabel: { marginTop: 15 },
  bedroomRow: { flexDirection: "row", gap: 8 },
  resultsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 24, marginBottom: 13 },
  resultsTitle: { color: colors.ink, fontFamily: type.bold, fontSize: 21 },
  resultsCount: { marginTop: 2, color: colors.muted, fontFamily: type.regular, fontSize: 12 },
  sortLabel: { color: colors.green, fontFamily: type.semiBold, fontSize: 11 },
  emptyState: { alignItems: "center", paddingHorizontal: 20, paddingVertical: 44, borderRadius: 14, backgroundColor: colors.surface },
  emptyTitle: { color: colors.ink, fontFamily: type.semiBold, fontSize: 16, textAlign: "center" },
  emptyCopy: { marginTop: 7, color: colors.muted, fontFamily: type.regular, fontSize: 13, textAlign: "center" },
});