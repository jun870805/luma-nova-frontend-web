// src/data/rooms.tsx
export type Room = {
  id: string;
  name: string;
  last: string;
  ts: number;
};

export const rooms: Room[] = [
  { id: "1", name: "Astra", last: "準備開始吧！", ts: Date.now() - 1000 * 60 },
  { id: "2", name: "Orion", last: "我在這裡。", ts: Date.now() - 1000 * 120 },
  { id: "3", name: "Vega", last: "收到。", ts: Date.now() - 1000 * 3600 },
];
