export const verticalStackTransition = (reducedMotion: boolean) => ({
  animation: reducedMotion ? ('none' as const) : ('slide_from_bottom' as const),
  gestureEnabled: true,
  gestureDirection: 'vertical' as const,
  fullScreenGestureEnabled: true,
  animationMatchesGesture: true,
});
