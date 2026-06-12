// Two-font system per CLAUDE.md design rules:
//
//   • Fredoka  — chunky rounded display face for headings, planet names,
//                hero titles. Use SemiBold/Bold weights for impact.
//   • Nunito   — humanist sans for body text, descriptions, small UI labels.
//                Loads as the default for every <Text> via App.js.
//
// Components import these constants instead of hardcoding family strings.

export const FONTS = {
  // Display / headings
  displayBold:     'Fredoka_700Bold',     // STARSHIP MATH, big titles
  displaySemi:     'Fredoka_600SemiBold', // SELECT CHALLENGE, planet names
  displayMedium:   'Fredoka_500Medium',   // smaller heading variants

  // Body
  bodyRegular:     'Nunito_400Regular',
  bodySemi:        'Nunito_600SemiBold',
  bodyBold:        'Nunito_700Bold',
  bodyExtra:       'Nunito_800ExtraBold',
  bodyBlack:       'Nunito_900Black',
};
