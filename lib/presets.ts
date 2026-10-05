// Palettes + style presets distilled from the four reference wallpapers.
export type Palette = { id: string; name: string; colors: string[] };

export const PALETTES: Palette[] = [
  { id: "indigo-dusk",  name: "Indigo Dusk",   colors: ["#fdf6e3", "#c9c6f5", "#4b45ff", "#1a0b8c", "#05012e"] }, // ref 1
  { id: "sea-mist",     name: "Sea Mist",      colors: ["#fbf4e6", "#dfe6ec", "#8fb4c4", "#1f6d86", "#040d12"] }, // ref 2
  { id: "candy-sky",    name: "Candy Sky",     colors: ["#f1557f", "#b89ad6", "#aab8d4", "#0f74c0", "#141821"] }, // ref 3
  { id: "aura-bloom",   name: "Aura Bloom",    colors: ["#000000", "#7b3bff", "#2f7bff", "#ff9c2f", "#ff5db0"] }, // ref 4
  { id: "electric",     name: "Electric",      colors: ["#000000", "#7a00ff", "#00e5ff", "#001133"] },
  { id: "ember",        name: "Ember",         colors: ["#1a0500", "#ff5e00", "#ffb300", "#300a00"] },
  { id: "mint-fade",    name: "Mint Fade",     colors: ["#f6fff8", "#aef3d2", "#28b485", "#063b2d"] },
  { id: "mono-noir",    name: "Mono Noir",     colors: ["#f5f5f5", "#9aa0a6", "#3c4043", "#0a0a0a"] },
  { id: "peach-sunset", name: "Peach Sunset",  colors: ["#fff3e6", "#ffb199", "#ff6a88", "#6a2c70", "#1a0922"] },
  { id: "jade",         name: "Jade",          colors: ["#eafff6", "#8ee6c8", "#1aa17a", "#0b5a46", "#02140f"] },
  { id: "gold-noir",    name: "Gold Noir",     colors: ["#0a0a0a", "#3a2c00", "#c99700", "#ffd766", "#fff4cc"] },
  { id: "rose-quartz",  name: "Rose Quartz",   colors: ["#fff0f5", "#ffc2d9", "#f06595", "#8e3b64", "#2a0e1d"] },
  { id: "plum-orchid", name: "Plum Orchid", colors: ["#eadada", "#d59cc5", "#be5ca9", "#4d3a4d"] },
  { id: "cyan-abyss", name: "Cyan Abyss", colors: ["#43d9e7", "#3ec4d0", "#393c83", "#2a2c5f"] },
  { id: "crimson-ink", name: "Crimson Ink", colors: ["#ffffff", "#fd0053", "#a80139", "#2b2024"] },
  { id: "gold-teal-deep", name: "Gold Teal Deep", colors: ["#ffd716", "#0da574", "#073358", "#001f3e"] },
  { id: "steel-berry", name: "Steel Berry", colors: ["#f1d43a", "#23b2da", "#f23456", "#3b4a6b"] },
  { id: "violet-aqua", name: "Violet Aqua", colors: ["#f6f7fb", "#5be7c4", "#4fc0e8", "#7a56d0"] },
  { id: "azure-fuchsia", name: "Azure Fuchsia", colors: ["#daeaf7", "#0c8abc", "#ff008e", "#124e96"] },
  { id: "lime-noir", name: "Lime Noir", colors: ["#fff5f4", "#b1d430", "#1a8b9d", "#000000"] },
  { id: "midnight-rust", name: "Midnight Rust", colors: ["#d9d9d9", "#c24d2c", "#3e4a62", "#1a273a"] },
  { id: "lemon-forest", name: "Lemon Forest", colors: ["#faffa3", "#c6e772", "#66d47e", "#073835"] },
  { id: "verdant-hills", name: "Verdant Hills", colors: ["#f3fff0", "#aee04e", "#3fbf43", "#2f6fe8", "#143b96"] },
  { id: "alpine-tide",   name: "Alpine Tide",   colors: ["#eafcff", "#8fe0a0", "#3bc4a0", "#2b74d6", "#10306e"] },
  { id: "cream-teal", name: "Cream Teal", colors: ["#ffeed0", "#f4c180", "#00a79d", "#007064"] },
  { id: "amethyst-jade", name: "Amethyst Jade", colors: ["#f0e4e4", "#15cda9", "#9765c8", "#099a97"] },
  { id: "clay-ember", name: "Clay Ember", colors: ["#e2ded3", "#ff6d24", "#857671", "#4e413b"] },
  { id: "sky-lemon", name: "Sky Lemon", colors: ["#e3fcf9", "#faee5a", "#ace5f6", "#4a89ac"] },
  { id: "mango-plum", name: "Mango Plum", colors: ["#ffaf50", "#ed743f", "#824c97", "#423465"] },
  { id: "sage-stone", name: "Sage Stone", colors: ["#fbf5b7", "#b4cd93", "#437a5b", "#3f3f3f"] },
  { id: "canyon-dusk", name: "Canyon Dusk", colors: ["#777e7a", "#8b5b2b", "#2b3648"] },
  { id: "crimson-night", name: "Crimson Night", colors: ["#80517d", "#9c1f20", "#1a123b"] },
  { id: "coral-grape", name: "Coral Grape", colors: ["#f0533d", "#b93950", "#822063"] },
  { id: "ruby-lagoon", name: "Ruby Lagoon", colors: ["#5b969b", "#986371", "#d53048"] },
  { id: "amber-jungle", name: "Amber Jungle", colors: ["#e79645", "#40776a", "#cc039b", "#0e2c32"] },
  { id: "navy-slate", name: "Navy Slate", colors: ["#3b4f6c", "#25314b", "#0f132a"] },
  { id: "flamingo", name: "Flamingo", colors: ["#f27b7c", "#dc5961", "#c73847"] },
  { id: "neon-fuchsia", name: "Neon Fuchsia", colors: ["#fc5ab8", "#45a494", "#226d72", "#00143c"] },
  { id: "orchid-sea", name: "Orchid Sea", colors: ["#5cc8c3", "#2f92bc", "#723097"] },
];

export type StyleId = "aura" | "soft-linear" | "mesh" | "ridges";

export type StylePreset = {
  id: StyleId;
  name: string;
  desc: string;
  // engine knobs
  background: "black" | "lightTop" | "firstColor";
  blobCount: [number, number];   // min,max
  blobSize: [number, number];    // fraction of max(w,h)
  blend: GlobalCompositeOperation;
  grain: number;                 // 0..1
  layout: "centered" | "scattered" | "verticalBands" | "ridges";
};

export const STYLES: StylePreset[] = [
  {
    id: "aura", name: "Aura Bloom", desc: "Centered stacked glow on black (ref 4).",
    background: "black", blobCount: [4, 6], blobSize: [0.28, 0.42],
    blend: "screen", grain: 0.05, layout: "centered",
  },
  {
    id: "soft-linear", name: "Soft Linear", desc: "Cream fading to deep color (ref 1 & 2).",
    background: "lightTop", blobCount: [1, 2], blobSize: [0.4, 0.6],
    blend: "source-over", grain: 0.06, layout: "verticalBands",
  },
  {
    id: "mesh", name: "Mesh Dream", desc: "Soft corner blobs, pastel bleed (ref 3).",
    background: "firstColor", blobCount: [3, 5], blobSize: [0.55, 0.9],
    blend: "source-over", grain: 0.04, layout: "scattered",
  },
  {
    id: "ridges", name: "Ridges", desc: "Layered misty hills, grainy color-field (ref: rolling valleys).",
    background: "lightTop", blobCount: [8, 11], blobSize: [0.1, 0.2],
    blend: "source-over", grain: 0.07, layout: "ridges",
  },
];

export const DEVICES: { id: string; name: string; w: number; h: number; label: string }[] = [
  { id: "desktop", name: "Desktop 4K",     w: 3840, h: 2160, label: "16:9" },
  { id: "laptop",  name: "Laptop",         w: 2560, h: 1600, label: "16:10" },
  { id: "tablet",  name: "Tablet",         w: 2048, h: 1536, label: "4:3" },
  { id: "phone",   name: "iPhone Pro Max", w: 1290, h: 2796, label: "19.5:9" },
];
