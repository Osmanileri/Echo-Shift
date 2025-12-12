import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

interface CustomTextInputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: object;
  labelStyle?: object;
  inputStyle?: object;
}

export function CustomTextInput({
  label,
  error,
  containerStyle,
  labelStyle,
  inputStyle,
  style,
  ...props
}: CustomTextInputProps) {
  return (
    <View style={[containerStyle]}>
      {label && <Text style={[styles.label, labelStyle]}>{label}</Text>}
      <View
        style={[styles.inputContainer, error && styles.inputContainerError]}
      >
        <TextInput style={[styles.textInput, inputStyle, style]} {...props} />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
    lineHeight: 36,
    paddingLeft: 16,
  },
  inputContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BEC5D1",
    height: 48,
    justifyContent: "center",
  },
  inputContainerError: {
    borderColor: "#EF4444",
  },
  textInput: {
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#000000",
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    paddingLeft: 16,
    marginTop: 4,
  },
});
