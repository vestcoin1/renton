import { Tabs } from "expo-router";
import { Heart, Search } from "lucide-react-native";
import { colors, type } from "../../src/theme";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: type.semiBold, fontSize: 11, marginBottom: 4 },
        tabBarStyle: { height: 64, paddingTop: 8, borderTopColor: colors.line, backgroundColor: colors.surface },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Explore", tabBarIcon: ({ color }) => <Search size={21} color={color} /> }} />
      <Tabs.Screen name="saved" options={{ title: "Saved", tabBarIcon: ({ color }) => <Heart size={21} color={color} /> }} />
    </Tabs>
  );
}