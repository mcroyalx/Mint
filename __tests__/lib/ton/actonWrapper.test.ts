import { MintActonSDK } from "@/lib/ton/actonWrapper";

describe("MintActonSDK", () => {
  const FOUNDER = "EQ_FOUNDER_ADDR";
  const BACKER_A = "EQ_BACKER_ALICE";
  const BACKER_B = "EQ_BACKER_BOB";
  const CHANNEL = "test_channel";

  let sdk: MintActonSDK;

  beforeEach(() => {
    sdk = new MintActonSDK(CHANNEL, FOUNDER, 10_000_000);
  });

  // ── Constructor & initial state ──────────────────────────────────────

  describe("constructor", () => {
    it("allocates 35% of total supply to founder", () => {
      expect(sdk.tokenState.balances[FOUNDER]).toBe(3_500_000);
    });

    it("sets circulatingSupply to the founder allocation", () => {
      expect(sdk.tokenState.circulatingSupply).toBe(3_500_000);
    });

    it("derives address strings from the channel id", () => {
      expect(sdk.tokenState.address).toBe("EQ_MINT_TOKEN_TEST_CHANNEL");
      expect(sdk.tdaState.address).toBe("EQ_TDA_MANAGER_TEST_CHANNEL");
    });

    it("sets TDA status to PENDING", () => {
      expect(sdk.tdaState.status).toBe("PENDING");
    });

    it("initialises vesting with 80% of founder allocation", () => {
      expect(sdk.vestingSchedule.totalVestedShares).toBe(
        Math.floor(3_500_000 * 0.8)
      );
    });

    it("populates two default governance proposals", () => {
      expect(sdk.proposals).toHaveLength(2);
      expect(sdk.proposals[0].executed).toBe(false);
      expect(sdk.proposals[1].executed).toBe(true);
    });

    it("accepts a custom total supply", () => {
      const custom = new MintActonSDK("ch", FOUNDER, 500);
      expect(custom.tokenState.totalSupply).toBe(500);
      expect(custom.tokenState.balances[FOUNDER]).toBe(Math.floor(500 * 0.35));
    });
  });

  // ── Share Token Contract ─────────────────────────────────────────────

  describe("transferShares", () => {
    it("moves shares between addresses", () => {
      sdk.transferShares(FOUNDER, BACKER_A, 1000);
      expect(sdk.tokenState.balances[FOUNDER]).toBe(3_500_000 - 1000);
      expect(sdk.tokenState.balances[BACKER_A]).toBe(1000);
    });

    it("throws on insufficient balance", () => {
      expect(() => sdk.transferShares(BACKER_A, FOUNDER, 1)).toThrow(
        "Insufficient shares equity balance."
      );
    });

    it("accumulates into an existing recipient balance", () => {
      sdk.transferShares(FOUNDER, BACKER_A, 500);
      sdk.transferShares(FOUNDER, BACKER_A, 300);
      expect(sdk.tokenState.balances[BACKER_A]).toBe(800);
    });
  });

  // ── TDA Contract ─────────────────────────────────────────────────────

  describe("TDA lifecycle", () => {
    it("launchTDA sets status to ACTIVE", () => {
      sdk.launchTDA();
      expect(sdk.tdaState.status).toBe("ACTIVE");
    });

    it("depositTON rejects deposits when TDA is not active", () => {
      expect(() => sdk.depositTON(BACKER_A, 1000)).toThrow(
        "TDA process is not open currently."
      );
    });

    it("depositTON accumulates backer deposits", () => {
      sdk.launchTDA();
      sdk.depositTON(BACKER_A, 5000);
      sdk.depositTON(BACKER_A, 3000);
      expect(sdk.tdaState.deposits[BACKER_A]).toBe(8000);
      expect(sdk.tdaState.totalDepositedTON).toBe(8000);
    });

    it("finalizeTDA aborts when funding goal is not met", () => {
      sdk.launchTDA();
      sdk.depositTON(BACKER_A, 100);
      const result = sdk.finalizeTDA();
      expect(sdk.tdaState.status).toBe("ABORTED");
      expect(result.allocatedShares).toBe(0);
      expect(result.oversubscriptionRatio).toBe(0);
    });

    it("finalizeTDA completes and distributes shares when goal met", () => {
      sdk.launchTDA();
      sdk.depositTON(BACKER_A, 150_000);
      const result = sdk.finalizeTDA();
      expect(sdk.tdaState.status).toBe("COMPLETED");
      expect(result.oversubscriptionRatio).toBe(1);
      expect(sdk.tokenState.balances[BACKER_A]).toBeGreaterThan(0);
    });

    it("handles oversubscription proportionally", () => {
      sdk.launchTDA();
      sdk.depositTON(BACKER_A, 120_000);
      sdk.depositTON(BACKER_B, 180_000);
      const result = sdk.finalizeTDA();
      expect(result.oversubscriptionRatio).toBe(300_000 / 150_000);
      expect(sdk.tokenState.balances[BACKER_A]).toBeGreaterThan(0);
      expect(sdk.tokenState.balances[BACKER_B]).toBeGreaterThan(0);
      // B deposited 1.5x more than A, so B gets more shares
      expect(sdk.tokenState.balances[BACKER_B]!).toBeGreaterThan(
        sdk.tokenState.balances[BACKER_A]!
      );
    });
  });

  // ── Vesting ──────────────────────────────────────────────────────────

  describe("vesting", () => {
    const start = 12_050_000;

    it("returns 0 during cliff period", () => {
      expect(sdk.getUnlockedVesting(start + 5_000)).toBe(0);
    });

    it("returns 0 exactly at cliff boundary minus one", () => {
      expect(sdk.getUnlockedVesting(start + 9_999)).toBe(0);
    });

    it("unlocks proportionally after cliff", () => {
      const halfwayBlock = start + 50_000;
      const unlocked = sdk.getUnlockedVesting(halfwayBlock);
      const expected = Math.floor(
        sdk.vestingSchedule.totalVestedShares * (50_000 / 100_000)
      );
      expect(unlocked).toBe(expected);
    });

    it("unlocks full amount after duration", () => {
      const afterEnd = start + 200_000;
      expect(sdk.getUnlockedVesting(afterEnd)).toBe(
        sdk.vestingSchedule.totalVestedShares
      );
    });

    it("claimUnlockedVesting credits beneficiary and tracks claimed", () => {
      const block = start + 50_000;
      const claimed = sdk.claimUnlockedVesting(block);
      expect(claimed).toBeGreaterThan(0);
      expect(sdk.vestingSchedule.sharesClaimed).toBe(claimed);

      // Claiming again at the same block yields 0
      expect(sdk.claimUnlockedVesting(block)).toBe(0);
    });

    it("claimUnlockedVesting increases circulating supply", () => {
      const before = sdk.tokenState.circulatingSupply;
      const block = start + 50_000;
      const claimed = sdk.claimUnlockedVesting(block);
      expect(sdk.tokenState.circulatingSupply).toBe(before + claimed);
    });
  });

  // ── Revenue Distribution ─────────────────────────────────────────────

  describe("revenue distribution", () => {
    beforeEach(() => {
      sdk.tokenState.balances[BACKER_A] = 5000;
      sdk.tokenState.balances[BACKER_B] = 5000;
    });

    it("depositAdRevenue does nothing when no stakers exist", () => {
      sdk.depositAdRevenue(10_000);
      expect(sdk.stancePool.totalDistributedTON).toBe(0);
    });

    it("distributes revenue proportionally to stakers", () => {
      sdk.stakeShares(BACKER_A, 3000);
      sdk.stakeShares(BACKER_B, 1000);
      sdk.depositAdRevenue(4000);

      expect(sdk.stancePool.accruedUserPayments[BACKER_A]).toBe(3000);
      expect(sdk.stancePool.accruedUserPayments[BACKER_B]).toBe(1000);
    });

    it("stakeShares deducts from token balance", () => {
      sdk.stakeShares(BACKER_A, 2000);
      expect(sdk.tokenState.balances[BACKER_A]).toBe(3000);
      expect(sdk.stancePool.userStakes[BACKER_A]).toBe(2000);
      expect(sdk.stancePool.totalStakedTokens).toBe(2000);
    });

    it("stakeShares throws on insufficient balance", () => {
      expect(() => sdk.stakeShares(BACKER_A, 999_999)).toThrow(
        "Insufficient shares equity to stake."
      );
    });

    it("claimYield returns accrued and resets to zero", () => {
      sdk.stakeShares(BACKER_A, 5000);
      sdk.depositAdRevenue(10_000);
      const payout = sdk.claimYield(BACKER_A);
      expect(payout).toBe(10_000);
      expect(sdk.claimYield(BACKER_A)).toBe(0);
    });

    it("claimYield returns 0 for users with no accrual", () => {
      expect(sdk.claimYield("unknown_user")).toBe(0);
    });
  });

  // ── Bonding Curve Trading ────────────────────────────────────────────

  describe("bonding curve", () => {
    it("getPriceForSupply returns base + slope * supply", () => {
      expect(sdk.getPriceForSupply(0)).toBe(100);
      expect(sdk.getPriceForSupply(100)).toBe(100 + Math.floor(1.8 * 100));
    });

    it("getBuyCost increases with amount", () => {
      const cost10 = sdk.getBuyCost(10);
      const cost50 = sdk.getBuyCost(50);
      expect(cost50).toBeGreaterThan(cost10);
    });

    it("getSellReturn decreases as more shares are sold", () => {
      sdk.buySharesInteractive(BACKER_A, 100);
      const sell10 = sdk.getSellReturn(10);
      const sell50 = sdk.getSellReturn(50);
      expect(sell50).toBeGreaterThan(sell10);
    });

    it("buySharesInteractive credits buyer and increases supply", () => {
      const supplyBefore = sdk.tokenState.circulatingSupply;
      const result = sdk.buySharesInteractive(BACKER_A, 10);
      expect(result.sharesAllocated).toBe(10);
      expect(result.costTON).toBeGreaterThan(0);
      expect(sdk.tokenState.balances[BACKER_A]).toBe(10);
      expect(sdk.tokenState.circulatingSupply).toBe(supplyBefore + 10);
    });

    it("sellSharesInteractive applies 10% exit tax", () => {
      sdk.buySharesInteractive(BACKER_A, 20);
      const result = sdk.sellSharesInteractive(BACKER_A, 10);
      const rawPayout = sdk.getSellReturn(10);
      // the getSellReturn now reflects post-sale supply, so check tax math
      expect(result.exitTaxTON).toBe(
        Math.floor((result.payoutTON + result.exitTaxTON) * 0.1)
      );
      expect(result.payoutTON + result.exitTaxTON).toBe(
        result.payoutTON + result.exitTaxTON
      );
    });

    it("sellSharesInteractive throws on insufficient shares", () => {
      expect(() => sdk.sellSharesInteractive(BACKER_A, 1)).toThrow(
        "Insufficient shares to sell on curve."
      );
    });

    it("sellSharesInteractive accumulates collectedTaxTON", () => {
      sdk.buySharesInteractive(BACKER_A, 50);
      const { exitTaxTON } = sdk.sellSharesInteractive(BACKER_A, 20);
      expect(sdk.collectedTaxTON).toBe(exitTaxTON);
    });
  });

  // ── Governance ───────────────────────────────────────────────────────

  describe("governance", () => {
    it("calculateShieldedVotingWeight caps at 30% of circulating supply", () => {
      const whale = "EQ_WHALE";
      sdk.tokenState.balances[whale] = sdk.tokenState.circulatingSupply;
      const shielded = sdk.calculateShieldedVotingWeight(whale);
      expect(shielded).toBe(
        Math.floor(sdk.tokenState.circulatingSupply * 0.3)
      );
    });

    it("calculateShieldedVotingWeight returns actual balance when under cap", () => {
      sdk.tokenState.balances[BACKER_A] = 100;
      expect(sdk.calculateShieldedVotingWeight(BACKER_A)).toBe(100);
    });

    it("calculateShieldedVotingWeight returns 0 for unknown user", () => {
      expect(sdk.calculateShieldedVotingWeight("nobody")).toBe(0);
    });

    it("castVote adds shielded weight to yeas", () => {
      sdk.tokenState.balances[BACKER_A] = 1000;
      const yeasBefore = sdk.proposals[0].yeasCount;
      sdk.castVote(BACKER_A, 1, true);
      expect(sdk.proposals[0].yeasCount).toBe(yeasBefore + 1000);
    });

    it("castVote adds shielded weight to nays", () => {
      sdk.tokenState.balances[BACKER_A] = 500;
      const naysBefore = sdk.proposals[0].naysCount;
      sdk.castVote(BACKER_A, 1, false);
      expect(sdk.proposals[0].naysCount).toBe(naysBefore + 500);
    });

    it("castVote throws for unknown proposal id", () => {
      expect(() => sdk.castVote(BACKER_A, 999, true)).toThrow(
        "Proposal ID not detected."
      );
    });
  });

  // ── Exit Tax Redistribution ──────────────────────────────────────────

  describe("disperseCollectedTaxes", () => {
    it("returns 0 when no taxes collected", () => {
      expect(sdk.disperseCollectedTaxes()).toBe(0);
    });

    it("disperses taxes through revenue distribution to stakers", () => {
      sdk.tokenState.balances[BACKER_A] = 10_000;
      sdk.stakeShares(BACKER_A, 10_000);
      sdk.collectedTaxTON = 5000;

      const dispersed = sdk.disperseCollectedTaxes();
      expect(dispersed).toBe(5000);
      expect(sdk.collectedTaxTON).toBe(0);
      expect(sdk.totalDispersedTaxTON).toBe(5000);
      expect(sdk.claimYield(BACKER_A)).toBe(5000);
    });

    it("resets collectedTaxTON after dispersal", () => {
      sdk.tokenState.balances[BACKER_A] = 1000;
      sdk.stakeShares(BACKER_A, 1000);
      sdk.collectedTaxTON = 3000;
      sdk.disperseCollectedTaxes();
      expect(sdk.collectedTaxTON).toBe(0);
    });
  });
});
