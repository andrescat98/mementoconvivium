// Font Google proposti nel selettore di /admin, raggruppati per atmosfera.
// Ne va bene anche uno non in lista: basta scriverne il nome esatto.
// [famiglia, ripiego CSS]
type F = [string, string];
export const FONT_GROUPS: [string, F[]][] = [
  ["Classici e romani", [
    ["Cinzel", "serif"], ["Cinzel Decorative", "serif"], ["Marcellus", "serif"], ["Marcellus SC", "serif"],
    ["Forum", "serif"], ["Cormorant Garamond", "serif"], ["Cormorant SC", "serif"], ["Cormorant Unicase", "serif"],
    ["EB Garamond", "serif"], ["Gideon Roman", "serif"], ["Federo", "sans-serif"],
  ]],
  ["Medioevo e gotici", [
    ["MedievalSharp", "cursive"], ["Uncial Antiqua", "cursive"], ["Almendra", "serif"], ["Almendra Display", "cursive"],
    ["Grenze Gotisch", "cursive"], ["UnifrakturMaguntia", "cursive"], ["Pirata One", "cursive"],
    ["Germania One", "cursive"], ["Fondamento", "cursive"], ["Metamorphous", "cursive"], ["IM Fell English", "serif"],
    ["IM Fell English SC", "serif"], ["IM Fell DW Pica", "serif"],
  ]],
  ["Pirati e avventura", [
    ["Jolly Lodger", "cursive"], ["Eagle Lake", "cursive"], ["Caesar Dressing", "cursive"], ["Macondo", "cursive"],
    ["Della Respira", "serif"],
  ]],
  ["Far West", [
    ["Rye", "cursive"], ["Smokum", "cursive"], ["Ewert", "cursive"], ["Sancreek", "cursive"], ["Holtwood One SC", "serif"],
    ["Special Elite", "cursive"],
  ]],
  ["Oriente", [
    ["Aref Ruqaa", "serif"], ["El Messiri", "sans-serif"], ["Reem Kufi", "sans-serif"], ["Amiri", "serif"], ["Lalezar", "cursive"],
  ]],
  ["Belle Époque e anni '20", [
    ["Limelight", "cursive"], ["Poiret One", "cursive"], ["Josefin Sans", "sans-serif"], ["Abril Fatface", "serif"],
    ["Bodoni Moda", "serif"], ["Playfair Display", "serif"], ["Playfair Display SC", "serif"], ["Libre Baskerville", "serif"],
    ["Berkshire Swash", "cursive"],
  ]],
  ["Corsivi eleganti", [
    ["Great Vibes", "cursive"], ["Pinyon Script", "cursive"], ["Italianno", "cursive"], ["Tangerine", "cursive"],
    ["Parisienne", "cursive"], ["Kaushan Script", "cursive"],
  ]],
];
