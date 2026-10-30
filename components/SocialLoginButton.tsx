import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
} from "react-native";
import { Colors } from "../constants/colors";

type SocialLoginButtonProps = {
  icon: ImageSourcePropType;
  backgroundColor?: string;
  borderColor?: string;
  onPress?: () => void;
};

export default function SocialLoginButton({
  icon,
  backgroundColor = Colors.white,
  borderColor = Colors.line,
  onPress,
}: SocialLoginButtonProps) {
  return (
    <Pressable
      style={[
        styles.button,
        {
          backgroundColor,
          borderColor,
        },
      ]}
      onPress={onPress}
    >
      <Image source={icon} style={styles.icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  icon: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },
});
