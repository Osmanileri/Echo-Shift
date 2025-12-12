import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { forwardRef, useCallback, useState } from "react";
import { StyleSheet } from "react-native";
import { LoginTab } from "./login-tab";
import { SignupTab } from "./signup-tab";
import { TabSwitcher } from "./tab-switcher";

export const AuthModal = forwardRef<BottomSheetModal>((props, ref) => {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");

  const handleSheetChanges = useCallback((index: number) => {
    console.log("handleSheetChanges", index);
  }, []);

  // Callbacks
  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={ref}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetView style={styles.contentContainer}>
        <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === "login" && <LoginTab />}
        {activeTab === "signup" && <SignupTab />}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

AuthModal.displayName = "AuthModal";

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: "center",
  },
});
