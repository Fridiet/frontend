import { Image, type ImageStyle, type StyleProp } from "react-native";
import { getIngredientIcon } from "../constants/ingredientIcons";

type IngredientIconProps = {
  category?: string | null;
  iconName?: string | null;
  name?: string | null;
  style?: StyleProp<ImageStyle>;
};

export function IngredientIcon({ category, iconName, name, style }: IngredientIconProps) {
  return <Image source={getIngredientIcon(category, iconName, name)} style={style} resizeMode="contain" />;
}
