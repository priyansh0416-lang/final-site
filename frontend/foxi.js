// Shared utilities & constants
export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const ASSET_META = {
  equities:    { label: "Global Equities",  color: "#0A2540" },
  bonds:       { label: "Global Bonds",     color: "#1D4ED8" },
  gold:        { label: "Gold",             color: "#D97706" },
  real_estate: { label: "Real Estate",      color: "#64748B" },
  cash:        { label: "Cash / T-Bills",   color: "#94A3B8" },
  fox_fx:      { label: "FOX I FX Strategy", color: "#0F766E" },
};

export const DEFAULT_ALLOCATION = {
  equities: 60,
  bonds: 20,
  gold: 5,
  real_estate: 5,
  cash: 10,
  fox_fx: 0,
};

export const formatPct = (v, digits = 2) =>
  `${v >= 0 ? "" : ""}${Number(v).toFixed(digits)}%`;

export const formatNum = (v, digits = 2) => Number(v).toFixed(digits);

export const colorForDelta = (v, invert = false) => {
  const positive = invert ? v < 0 : v > 0;
  if (positive) return "text-[#059669]";
  if (v === 0) return "text-[#475569]";
  return "text-[#DC2626]";
};
