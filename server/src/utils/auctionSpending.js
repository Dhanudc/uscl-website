import { PlayerRegistration } from "../models/PlayerRegistration.js";
import { FRANCHISES, resolveFranchiseId } from "./franchises.js";

const DEFAULT_TEAM_BUDGET_INR = 250000;
const DEFAULT_TOP_SOLD_PRICE_TIERS = 5;
const MAX_TOP_SOLD_PRICE_TIERS = 20;

export function normalizeAuctionTeamBudgetInr(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_TEAM_BUDGET_INR;
  return n;
}

export function getAuctionTeamBudgetInr(settings) {
  return normalizeAuctionTeamBudgetInr(settings?.auctionTeamBudgetInr);
}

/** How many distinct hammer prices to show on the home page (ties included per price). */
export function normalizeAuctionTopSoldPriceTiers(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 1) return DEFAULT_TOP_SOLD_PRICE_TIERS;
  return Math.min(MAX_TOP_SOLD_PRICE_TIERS, n);
}

export function getAuctionTopSoldPriceTiers(settings) {
  return normalizeAuctionTopSoldPriceTiers(settings?.auctionTopSoldPriceTiers);
}

export async function buildAuctionSpendingReport(budgetInr) {
  const budget = normalizeAuctionTeamBudgetInr(budgetInr);
  const sold = await PlayerRegistration.find({
    status: "verified",
    auctionStatus: "sold",
    franchiseId: { $ne: "" },
    interest: { $in: ["player", "captain"] },
  })
    .select("franchiseId soldPrice")
    .lean();

  const totals = {};
  for (const f of FRANCHISES) {
    totals[f.id] = { spent: 0, playersSold: 0 };
  }
  for (const row of sold) {
    const fid = resolveFranchiseId(row.franchiseId);
    if (!totals[fid]) {
      totals[fid] = { spent: 0, playersSold: 0 };
    }
    totals[fid].spent += Math.max(0, Number(row.soldPrice) || 0);
    totals[fid].playersSold += 1;
  }

  const teams = FRANCHISES.map((f) => {
    const t = totals[f.id] || { spent: 0, playersSold: 0 };
    const spent = t.spent;
    const remaining = budget - spent;
    return {
      id: f.id,
      name: f.name,
      spent,
      remaining,
      overBudget: remaining < 0,
      playersSold: t.playersSold,
      budgetInr: budget,
      spentPercent: budget > 0 ? Math.round((spent / budget) * 1000) / 10 : 0,
    };
  });

  const totalSpent = teams.reduce((sum, t) => sum + t.spent, 0);

  return {
    budgetInr: budget,
    totalSpent,
    teams,
  };
}
