/**
 * Kör kontraktstesterna mot mock-implementationen.
 *
 * Ingår i `npm test` och i CI, så att mocken alltid beter sig som kontraktet säger.
 */
import { describe } from "vitest";
import { createMockDatabase } from "@/db/mock";
import { runContractTests } from "./db-contract";

describe("mock", () => {
  const db = createMockDatabase();
  runContractTests(() => db);
});
