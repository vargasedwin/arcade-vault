import type { Database } from "./supabase/database.types";

export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type NeonColor = "cyan" | "magenta" | "yellow" | "green";

export type Game = Database["public"]["Tables"]["games"]["Row"];

export const CATS: ("TODOS" | Category)[] = [
  "TODOS",
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
  "VERSUS",
];
