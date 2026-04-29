import { CATEGORY_COLORS, type ArtCategory } from "@/lib/constants";

export function getCategoryColor(category: ArtCategory) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.art;
}

export function getCategoryBg(category: ArtCategory) {
  return getCategoryColor(category).bg;
}

export function getCategoryLabel(category: ArtCategory) {
  return getCategoryColor(category).label;
}
