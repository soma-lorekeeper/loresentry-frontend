export type NavigationIntent = "first" | "last" | "next" | "previous";

export function getMenuItemIndex(
  itemCount: number,
  currentIndex: number,
  intent: NavigationIntent,
) {
  if (itemCount <= 0) return -1;
  if (intent === "first") return 0;
  if (intent === "last") return itemCount - 1;
  if (intent === "next") return (currentIndex + 1 + itemCount) % itemCount;
  return (currentIndex - 1 + itemCount) % itemCount;
}
