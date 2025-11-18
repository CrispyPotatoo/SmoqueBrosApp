/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const primaryBlack = '#000';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: primaryBlack,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: primaryBlack,
    primary: primaryBlack,
  },
  dark: {
    // Unifying the theme: dark mode will also use the light background and black accents.
    text: '#11181C',
    background: '#fff',
    tint: primaryBlack,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: primaryBlack,
    primary: primaryBlack,
  },
};
