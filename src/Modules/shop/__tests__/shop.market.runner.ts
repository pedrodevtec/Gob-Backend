import assert from "node:assert/strict";
import { resolveMarketSellPrice } from "../shop.service";

const run = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
};

run("resolveMarketSellPrice aplica taxa de item", () => {
  assert.equal(resolveMarketSellPrice(25, "ITEM"), 15);
});

run("resolveMarketSellPrice aplica taxa de equipamento", () => {
  assert.equal(resolveMarketSellPrice(80, "EQUIPMENT"), 56);
});

run("resolveMarketSellPrice respeita preco minimo", () => {
  assert.equal(resolveMarketSellPrice(1, "ITEM"), 1);
});

console.log("Shop market tests completed.");
