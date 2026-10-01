import { createContext, useContext } from 'react';

export const FLOATING_TAB_BAR_HEIGHT = 64;
export const FLOATING_TAB_BAR_EDGE_GAP = 8;
export const FLOATING_TAB_BAR_CONTENT_GAP = 12;
export const FLOATING_TAB_BAR_HORIZONTAL_PADDING = 16;
export const FLOATING_TAB_SELECTION_SIZE = 52;
export const FLOATING_TAB_BAR_COLLAPSED_SCALE = 0.76;
export const FLOATING_TAB_BAR_COLLAPSED_OPACITY = 0.72;

export const FloatingTabBarContentInsetContext = createContext(0);
export const FloatingTabBarCollapseContext = createContext<() => void>(
  () => undefined,
);

export const useFloatingTabBarContentInset = (): number =>
  useContext(FloatingTabBarContentInsetContext);

export const useCollapseFloatingTabBar = (): (() => void) =>
  useContext(FloatingTabBarCollapseContext);

export const floatingTabBarBottom = (safeAreaBottom: number): number =>
  safeAreaBottom + FLOATING_TAB_BAR_EDGE_GAP;

export const floatingTabBarContentInset = (safeAreaBottom: number): number =>
  floatingTabBarBottom(safeAreaBottom) +
  FLOATING_TAB_BAR_HEIGHT +
  FLOATING_TAB_BAR_CONTENT_GAP;

export const floatingTabSelectionOffset = (
  tabBarWidth: number,
  tabCount: number,
  activeIndex: number,
): number => {
  if (tabBarWidth <= FLOATING_TAB_BAR_HORIZONTAL_PADDING * 2 || tabCount <= 0) {
    return 0;
  }
  const contentWidth = tabBarWidth - FLOATING_TAB_BAR_HORIZONTAL_PADDING * 2;
  const clampedIndex = Math.min(Math.max(activeIndex, 0), tabCount - 1);
  return (
    FLOATING_TAB_BAR_HORIZONTAL_PADDING +
    (contentWidth / tabCount) * (clampedIndex + 0.5) -
    FLOATING_TAB_SELECTION_SIZE / 2
  );
};
