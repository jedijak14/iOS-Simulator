// Session-only blob URLs for videos recorded in Camera (not persistable).
export const videoUrls = new Map<string, string>();

export interface StockPhoto {
  id: number;
  title: string;
  cat: "Nature" | "Cities" | "Pets";
  daysAgo: number;
  hue: number;
}
export const STOCK: StockPhoto[] = [
  { id: 27667695, title: "Oeschinensee", cat: "Nature", daysAgo: 2, hue: 190 },
  { id: 1666022, title: "Mountain Lake", cat: "Nature", daysAgo: 3, hue: 160 },
  { id: 40701120, title: "Autumn Cabin", cat: "Nature", daysAgo: 6, hue: 30 },
  { id: 27630474, title: "Highland Lake", cat: "Nature", daysAgo: 9, hue: 210 },
  { id: 18385183, title: "Madrid Street", cat: "Cities", daysAgo: 12, hue: 20 },
  { id: 22944327, title: "Barcelona", cat: "Cities", daysAgo: 16, hue: 250 },
  { id: 17558422, title: "Cobblestone Lane", cat: "Cities", daysAgo: 21, hue: 40 },
  { id: 17674075, title: "Bologna", cat: "Cities", daysAgo: 30, hue: 10 },
  { id: 39553434, title: "Buddy", cat: "Pets", daysAgo: 40, hue: 280 },
  { id: 31255875, title: "Cocker Spaniel", cat: "Pets", daysAgo: 52, hue: 35 },
  { id: 35708965, title: "Good Boy", cat: "Pets", daysAgo: 70, hue: 330 },
];
