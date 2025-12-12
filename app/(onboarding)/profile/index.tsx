import CustomButton from "@/shared/components/custom-button";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ImageBackground, StyleSheet, Text, View } from "react-native";

const onboardingPages = [
  {
    title: "Define Your Goal",
    description:
      "Let's get started! Choose your main goal to reach results faster and stay motivated",
  },
  {
    title: "Track Your Progress",
    description:
      "Monitor your journey with detailed insights and achieve your goals step by step",
  },
  {
    title: "Stay Motivated",
    description:
      "Get personalized tips and reminders to keep you on track every day",
  },
];

export default function OnboardingScreen() {
  const [currentPage, setCurrentPage] = useState(0);

  function handleBack() {
    if (currentPage === 0) {
      router.back();
    } else {
      setCurrentPage(currentPage - 1);
    }
  }

  function handleNext() {
    if (currentPage === onboardingPages.length - 1) {
      // Navigate to main app or next screen
      // TODO: Update this path when main app route is ready
      console.log("Onboarding completed");
    } else {
      setCurrentPage(currentPage + 1);
    }
  }

  const page = onboardingPages[currentPage];

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require("@/assets/images/onboarding-bg.png")}
        style={styles.backgroundImage}
        blurRadius={24}
      >
        {/* Overlay */}
        <View style={styles.overlay} />

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{page.title}</Text>
            <Text style={styles.description}>{page.description}</Text>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <CustomButton
            containerStyle={styles.backButton}
            accessibilityLabel="Go Back"
            onPress={handleBack}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </CustomButton>

          <CustomButton
            containerStyle={styles.diveInButton}
            accessibilityLabel="Dive In"
            onPress={handleNext}
          >
            <Text style={styles.buttonText}>Dive In!</Text>
          </CustomButton>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  content: {
    flex: 1,
    paddingTop: 267,
  },
  textContainer: {
    paddingHorizontal: 27,
  },
  title: {
    fontFamily: "Inter",
    fontWeight: "500",
    fontSize: 40,
    lineHeight: 48.4,
    color: "#FFFFFF",
    marginBottom: 62,
  },
  description: {
    fontFamily: "Inter",
    fontWeight: "400",
    fontSize: 16,
    lineHeight: 28,
    color: "#FFFFFF",
    paddingHorizontal: 4,
    maxWidth: 300,
  },
  buttonContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  backButton: {
    width: 56,
    height: 56,
    backgroundColor: "rgba(161, 164, 170, 0.5)",
    borderRadius: 8,
    padding: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  diveInButton: {
    flex: 1,
    backgroundColor: "#7849B6",
    borderRadius: 8,
    paddingVertical: 19,
    paddingHorizontal: 115,
  },
  buttonText: {
    fontFamily: "Inter",
    fontWeight: "500",
    fontSize: 16,
    lineHeight: 19.36,
    color: "#FFFFFF",
    textAlign: "center",
  },
});
