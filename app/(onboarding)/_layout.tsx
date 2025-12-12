import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="profile/index" options={{ headerShown: false }} />
    </Stack>
  );
}
