import { Colors } from "@/constants/theme";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  indicatorWidth: number;
}

function TabButton({
  label,
  isActive,
  onPress,
  indicatorWidth,
}: TabButtonProps) {
  return (
    <Pressable style={styles.tab} onPress={onPress}>
      <Text style={[styles.tabText, isActive && styles.activeTabText]}>
        {label}
      </Text>
      <View
        style={[
          styles.tabIndicator,
          isActive && styles.activeTabIndicator,
          { width: indicatorWidth },
        ]}
      />
    </Pressable>
  );
}

interface TabSwitcherProps {
  activeTab: "login" | "signup";
  onTabChange: (tab: "login" | "signup") => void;
}

export function TabSwitcher({ activeTab, onTabChange }: TabSwitcherProps) {
  return (
    <View style={styles.tabContainer}>
      <TabButton
        label="Create Account"
        isActive={activeTab === "signup"}
        onPress={() => onTabChange("signup")}
        indicatorWidth={activeTab === "signup" ? 77 : 22}
      />
      <TabButton
        label="Login"
        isActive={activeTab === "login"}
        onPress={() => onTabChange("login")}
        indicatorWidth={activeTab === "login" ? 22 : 77}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tab: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  tabText: {
    marginVertical: 10,
    fontWeight: "bold",
    fontSize: 16,
    color: Colors.gray[300],
  },
  tabIndicator: {
    marginTop: "auto",
    height: 3,
    backgroundColor: "transparent",
  },
  activeTabIndicator: {
    backgroundColor: Colors.lilac[800],
  },
  activeTabText: {
    color: Colors.lilac[800],
  },
});
