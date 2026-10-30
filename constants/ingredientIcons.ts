import type { ImageSourcePropType } from "react-native";

export const commonIngredientIcons = {
  beverage: require("../assets/icons/common/beverage.png"),
  bread: require("../assets/icons/common/bread.png"),
  broth: require("../assets/icons/common/broth.png"),
  dairy: require("../assets/icons/common/dairy.png"),
  dumpling: require("../assets/icons/common/dumpling.png"),
  egg: require("../assets/icons/common/egg.png"),
  etc: require("../assets/icons/common/etc.png"),
  fish_cake: require("../assets/icons/common/fish_cake.png"),
  fruit: require("../assets/icons/common/fruit.png"),
  gelatin: require("../assets/icons/common/gelatin.png"),
  grain: require("../assets/icons/common/grain.png"),
  ice: require("../assets/icons/common/ice.png"),
  jam: require("../assets/icons/common/jam.png"),
  jelly: require("../assets/icons/common/jelly.png"),
  kimchi: require("../assets/icons/common/kimchi.png"),
  leaf: require("../assets/icons/common/leaf.png"),
  meat: require("../assets/icons/common/meat.png"),
  noodles: require("../assets/icons/common/noodles.png"),
  nuts: require("../assets/icons/common/nuts.png"),
  oil: require("../assets/icons/common/oil.png"),
  pickles: require("../assets/icons/common/pickles.png"),
  powder: require("../assets/icons/common/powder.png"),
  processed_meat: require("../assets/icons/common/processed_meat.png"),
  rice_cake: require("../assets/icons/common/rice_cake.png"),
  sauce: require("../assets/icons/common/sauce.png"),
  seafood: require("../assets/icons/common/seafood.png"),
  seasoning: require("../assets/icons/common/seasoning.png"),
  seaweed: require("../assets/icons/common/seaweed.png"),
  snack: require("../assets/icons/common/snack.png"),
  tofu: require("../assets/icons/common/tofu.png"),
  vegetable: require("../assets/icons/common/vegetable.png"),
} as const satisfies Record<string, ImageSourcePropType>;

export type IngredientIconCategory = keyof typeof commonIngredientIcons;

const individualIngredientIcons: Record<string, ImageSourcePropType> = {
  "사과": require("../assets/icons/individual/apple.png"),
  "베이컨": require("../assets/icons/individual/bacon.png"),
  "바나나": require("../assets/icons/individual/banana.png"),
  "콩나물": require("../assets/icons/individual/bean_sprout.png"),
  "숙주나물": require("../assets/icons/individual/bean_sprout.png"),
  "숙주": require("../assets/icons/individual/bean_sprout.png"),
  "소고기": require("../assets/icons/individual/beef.png"),
  "쇠고기": require("../assets/icons/individual/beef.png"),
  "한우": require("../assets/icons/individual/beef.png"),
  "파프리카": require("../assets/icons/individual/bell_pepper.png"),
  "피망": require("../assets/icons/individual/bell_pepper.png"),
  "식빵": require("../assets/icons/individual/bread.png"),
  "바게트": require("../assets/icons/individual/bread.png"),
  "모닝빵": require("../assets/icons/individual/bread.png"),
  "빵": require("../assets/icons/individual/bread.png"),
  "브로콜리": require("../assets/icons/individual/broccoli.png"),
  "버터": require("../assets/icons/individual/butter.png"),
  "양배추": require("../assets/icons/individual/cabbage.png"),
  "배추": require("../assets/icons/individual/cabbage.png"),
  "당근": require("../assets/icons/individual/carrot.png"),
  "치즈": require("../assets/icons/individual/cheese.png"),
  "닭가슴살": require("../assets/icons/individual/chicken.png"),
  "닭안심": require("../assets/icons/individual/chicken.png"),
  "닭고기": require("../assets/icons/individual/chicken.png"),
  "닭": require("../assets/icons/individual/chicken.png"),
  "청양고추": require("../assets/icons/individual/chili_pepper.png"),
  "풋고추": require("../assets/icons/individual/chili_pepper.png"),
  "홍고추": require("../assets/icons/individual/chili_pepper.png"),
  "고추": require("../assets/icons/individual/chili_pepper.png"),
  "바지락": require("../assets/icons/individual/clam.png"),
  "꼬막": require("../assets/icons/individual/clam.png"),
  "조개": require("../assets/icons/individual/clam.png"),
  "옥수수": require("../assets/icons/individual/corn.png"),
  "오이": require("../assets/icons/individual/cucumber.png"),
  "된장": require("../assets/icons/individual/doenjang.png"),
  "가지": require("../assets/icons/individual/eggplant.png"),
  "고등어": require("../assets/icons/individual/fish.png"),
  "갈치": require("../assets/icons/individual/fish.png"),
  "연어": require("../assets/icons/individual/fish.png"),
  "참치": require("../assets/icons/individual/fish.png"),
  "생선": require("../assets/icons/individual/fish.png"),
  "마늘": require("../assets/icons/individual/garlic.png"),
  "고추장": require("../assets/icons/individual/gochujang.png"),
  "대파": require("../assets/icons/individual/green_onion.png"),
  "쪽파": require("../assets/icons/individual/green_onion.png"),
  "실파": require("../assets/icons/individual/green_onion.png"),
  "소고기다짐육": require("../assets/icons/individual/ground_meat.png"),
  "돼지고기다짐육": require("../assets/icons/individual/ground_meat.png"),
  "다진소고기": require("../assets/icons/individual/ground_meat.png"),
  "다진돼지고기": require("../assets/icons/individual/ground_meat.png"),
  "다짐육": require("../assets/icons/individual/ground_meat.png"),
  "다진고기": require("../assets/icons/individual/ground_meat.png"),
  "햄": require("../assets/icons/individual/ham.png"),
  "케첩": require("../assets/icons/individual/ketchup.png"),
  "상추": require("../assets/icons/individual/lettuce.png"),
  "마요네즈": require("../assets/icons/individual/mayonnaise.png"),
  "마요": require("../assets/icons/individual/mayonnaise.png"),
  "우유": require("../assets/icons/individual/milk.png"),
  "새송이버섯": require("../assets/icons/individual/mushroom.png"),
  "팽이버섯": require("../assets/icons/individual/mushroom.png"),
  "느타리버섯": require("../assets/icons/individual/mushroom.png"),
  "표고버섯": require("../assets/icons/individual/mushroom.png"),
  "버섯": require("../assets/icons/individual/mushroom.png"),
  "양파": require("../assets/icons/individual/onion.png"),
  "오렌지": require("../assets/icons/individual/orange.png"),
  "귤": require("../assets/icons/individual/orange.png"),
  "깻잎": require("../assets/icons/individual/perilla_leaf.png"),
  "돼지고기": require("../assets/icons/individual/pork.png"),
  "삼겹살": require("../assets/icons/individual/pork.png"),
  "목살": require("../assets/icons/individual/pork.png"),
  "감자": require("../assets/icons/individual/potato.png"),
  "단호박": require("../assets/icons/individual/pumpkin.png"),
  "늙은호박": require("../assets/icons/individual/pumpkin.png"),
  "호박": require("../assets/icons/individual/pumpkin.png"),
  "무우": require("../assets/icons/individual/radish.png"),
  "무": require("../assets/icons/individual/radish.png"),
  "라면": require("../assets/icons/individual/ramen.png"),
  "쌀": require("../assets/icons/individual/rice.png"),
  "현미": require("../assets/icons/individual/rice.png"),
  "잡곡": require("../assets/icons/individual/rice.png"),
  "밥": require("../assets/icons/individual/rice.png"),
  "소금": require("../assets/icons/individual/salt.png"),
  "소시지": require("../assets/icons/individual/sausage.png"),
  "소세지": require("../assets/icons/individual/sausage.png"),
  "새우": require("../assets/icons/individual/shrimp.png"),
  "진간장": require("../assets/icons/individual/soy_sauce.png"),
  "국간장": require("../assets/icons/individual/soy_sauce.png"),
  "양조간장": require("../assets/icons/individual/soy_sauce.png"),
  "간장": require("../assets/icons/individual/soy_sauce.png"),
  "시금치": require("../assets/icons/individual/spinach.png"),
  "오징어": require("../assets/icons/individual/squid.png"),
  "한치": require("../assets/icons/individual/squid.png"),
  "딸기": require("../assets/icons/individual/strawberry.png"),
  "설탕": require("../assets/icons/individual/sugar.png"),
  "올리고당": require("../assets/icons/individual/sugar.png"),
  "물엿": require("../assets/icons/individual/sugar.png"),
  "고구마": require("../assets/icons/individual/sweet_potato.png"),
  "방울토마토": require("../assets/icons/individual/tomato.png"),
  "토마토": require("../assets/icons/individual/tomato.png"),
  "식초": require("../assets/icons/individual/vinegar.png"),
  "요구르트": require("../assets/icons/individual/yogurt.png"),
  "요거트": require("../assets/icons/individual/yogurt.png"),
  "애호박": require("../assets/icons/individual/zucchini.png"),
  "주키니호박": require("../assets/icons/individual/zucchini.png"),
  "주키니": require("../assets/icons/individual/zucchini.png"),
};

function normalizeIconName(value?: string | null) {
  return value?.trim().replace(/\s+/g, "") ?? "";
}

function normalizeCategory(value?: string | null) {
  return value?.trim().toLocaleLowerCase("en-US") ?? "";
}

// Ingredients with a shared category image rather than an individual asset.
const namedCommonIcons: Record<string, IngredientIconCategory> = {
  달걀: "egg", 계란: "egg", 두부: "tofu", 순두부: "tofu", 연두부: "tofu",
  김치: "kimchi", 배추김치: "kimchi", 깍두기: "kimchi",
  김: "seaweed", 미역: "seaweed", 다시마: "seaweed",
  식용유: "oil", 올리브유: "oil", 참기름: "oil", 들기름: "oil",
  후추: "seasoning", 밀가루: "powder", 전분: "powder",
  어묵: "fish_cake", 만두: "dumpling", 떡: "rice_cake",
  국수: "noodles", 소면: "noodles", 우동: "noodles", 파스타: "noodles",
  포도: "fruit", 청포도: "fruit", 레몬: "fruit", 배: "fruit", 복숭아: "fruit",
  땅콩: "nuts", 아몬드: "nuts", 호두: "nuts",
};

function lookupIndividual(value?: string | null) {
  const key = normalizeIconName(value);
  return Object.prototype.hasOwnProperty.call(individualIngredientIcons, key)
    ? individualIngredientIcons[key] : undefined;
}

export function getIngredientIcon(
  category?: string | null,
  iconName?: string | null,
  ingredientName?: string | null,
): ImageSourcePropType {
  const individual = lookupIndividual(iconName) || lookupIndividual(ingredientName);
  if (individual) return individual;

  const name = normalizeIconName(ingredientName || iconName);
  if (Object.prototype.hasOwnProperty.call(namedCommonIcons, name)) {
    return commonIngredientIcons[namedCommonIcons[name]];
  }

  const normalizedCategory = normalizeCategory(category);
  if (Object.prototype.hasOwnProperty.call(commonIngredientIcons, normalizedCategory)) {
    return commonIngredientIcons[normalizedCategory as IngredientIconCategory];
  }

  return commonIngredientIcons.etc;
}
