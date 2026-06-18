// TON Acton Integrated TypeScript Wrapper & SDK Core Implementation
// Integrates the 7 core smart contract patterns into user-facing TypeScript controls.

export interface ActorState {
  address: string;
  name: string;
  symbol: string;
  totalSupply: number;
  circulatingSupply: number;
  balances: Record<string, number>;
}

export interface TDAState {
  address: string;
  fundingGoalTON: number;
  publicSharesOffered: number;
  totalDepositedTON: number;
  status: "PENDING" | "ACTIVE" | "COMPLETED" | "ABORTED";
  deposits: Record<string, number>;
}

export interface VestingSchedule {
  address: string;
  beneficiary: string;
  totalVestedShares: number;
  startBlock: number;
  durationBlocks: number;
  cliffBlocks: number;
  sharesClaimed: number;
}

export interface StakingPool {
  address: string;
  totalStakedTokens: number;
  userStakes: Record<string, number>;
  accruedUserPayments: Record<string, number>;
  totalDistributedTON: number;
}

export interface ProposalModel {
  id: number;
  title: string;
  description: string;
  yeasCount: number;
  naysCount: number;
  executed: boolean;
  voteEndBlock: number;
}

// TON Acton SDK Orchestrator Class
export class MintActonSDK {
  // Mock simulation values mimicking the decentralized TON environment
  public tokenState: ActorState;
  public tdaState: TDAState;
  public vestingSchedule: VestingSchedule;
  public stancePool: StakingPool;
  public reserveBalanceTON: number = 250000;
  public slopeMultiplier: number = 1.8;
  public basePriceTON: number = 100;
  public proposals: ProposalModel[] = [];
  public collectedTaxTON: number = 0;
  public totalDispersedTaxTON: number = 0;

  constructor(
    channelId: string,
    founderAddress: string,
    totalSupply: number = 10000000
  ) {
    const founderAllocation = Math.floor(totalSupply * 0.35); // 35%
    const publicFloat = totalSupply - founderAllocation;

    // Initialize Token Core
    this.tokenState = {
      address: "EQ_MINT_TOKEN_" + channelId.toUpperCase(),
      name: `Mint Media Equity ${channelId}`,
      symbol: `MINT-${channelId.toUpperCase()}`,
      totalSupply,
      circulatingSupply: founderAllocation,
      balances: {
        [founderAddress]: founderAllocation,
      },
    };

    // Initialize TDA
    this.tdaState = {
      address: "EQ_TDA_MANAGER_" + channelId.toUpperCase(),
      fundingGoalTON: 150000,
      publicSharesOffered: publicFloat,
      totalDepositedTON: 0,
      status: "PENDING",
      deposits: {},
    };

    // Initialize Vesting (100,000 blocks duration)
    this.vestingSchedule = {
      address: "EQ_VESTING_" + channelId.toUpperCase(),
      beneficiary: founderAddress,
      totalVestedShares: Math.floor(founderAllocation * 0.8),
      startBlock: 12050000,
      durationBlocks: 100000,
      cliffBlocks: 10000,
      sharesClaimed: 0,
    };

    // Initialize Revenue & Staking Pools
    this.stancePool = {
      address: "EQ_REVENUE_DISTRIBUTOR_" + channelId.toUpperCase(),
      totalStakedTokens: 0,
      userStakes: {},
      accruedUserPayments: {},
      totalDistributedTON: 0,
    };

    // Populate Initial Mock Governance Proposals
    this.proposals = [
      {
        id: 1,
        title: "Deploy 15% Ad Revenue Staking Booster Program",
        description: "Increase dynamic revenue redistribution target from 10% to 15% for the next 2 quarters using the premium Mint SDK curve.",
        yeasCount: 75000,
        naysCount: 3000,
        executed: false,
        voteEndBlock: 12061000,
      },
      {
        id: 2,
        title: "Activate Hostile Takeover Shield Protection for Channel Admin",
        description: "Activate protective voting weighting that caps single address leverage at 30% power.",
        yeasCount: 120000,
        naysCount: 1500,
        executed: true,
        voteEndBlock: 12055000,
      }
    ];
  }

  // --- 1. Share Token Contract Wrappers ---
  public transferShares(sender: string, recipient: string, amount: number): void {
    const senderBal = this.tokenState.balances[sender] || 0;
    if (senderBal < amount) throw new Error("Insufficient shares equity balance.");
    this.tokenState.balances[sender] = senderBal - amount;
    this.tokenState.balances[recipient] = (this.tokenState.balances[recipient] || 0) + amount;
  }

  // --- 2. TDA Contract Wrappers ---
  public launchTDA(): void {
    this.tdaState.status = "ACTIVE";
  }

  public depositTON(backer: string, amountTON: number): void {
    if (this.tdaState.status !== "ACTIVE") throw new Error("TDA process is not open currently.");
    this.tdaState.deposits[backer] = (this.tdaState.deposits[backer] || 0) + amountTON;
    this.tdaState.totalDepositedTON += amountTON;
  }

  public finalizeTDA(): { allocatedShares: number; oversubscriptionRatio: number } {
    if (this.tdaState.totalDepositedTON < this.tdaState.fundingGoalTON) {
      this.tdaState.status = "ABORTED";
      return { allocatedShares: 0, oversubscriptionRatio: 0 };
    }

    this.tdaState.status = "COMPLETED";
    const oversubscriptionRatio = this.tdaState.totalDepositedTON / this.tdaState.fundingGoalTON;

    // Distribute shares to initial backers proportionally
    const allocationFactor = oversubscriptionRatio > 1 ? 1 / oversubscriptionRatio : 1;
    Object.keys(this.tdaState.deposits).forEach((backer) => {
      const tonPaid = this.tdaState.deposits[backer];
      // Formula: allocatedShares = (UserDeposit / GoalTON) * totalSharesOffered
      const sharesToAllocate = Math.floor(
        (tonPaid * allocationFactor / this.tdaState.fundingGoalTON) * this.tdaState.publicSharesOffered
      );
      this.tokenState.balances[backer] = (this.tokenState.balances[backer] || 0) + sharesToAllocate;
      this.tokenState.circulatingSupply += sharesToAllocate;
    });

    return {
      allocatedShares: this.tdaState.publicSharesOffered,
      oversubscriptionRatio,
    };
  }

  // --- 3. Vesting Contract Wrappers ---
  public getUnlockedVesting(currentBlock: number): number {
    const schedule = this.vestingSchedule;
    if (currentBlock < schedule.startBlock + schedule.cliffBlocks) return 0;
    if (currentBlock >= schedule.startBlock + schedule.durationBlocks) return schedule.totalVestedShares;

    const elapsed = currentBlock - schedule.startBlock;
    const ratio = elapsed / schedule.durationBlocks;
    return Math.floor(schedule.totalVestedShares * ratio);
  }

  public claimUnlockedVesting(currentBlock: number): number {
    const unlocked = this.getUnlockedVesting(currentBlock);
    const claimable = unlocked - this.vestingSchedule.sharesClaimed;
    if (claimable <= 0) return 0;

    const maxMintable = this.tokenState.totalSupply - this.tokenState.circulatingSupply;
    const actualClaim = Math.min(claimable, maxMintable);
    if (actualClaim <= 0) return 0;

    this.vestingSchedule.sharesClaimed += actualClaim;
    const ben = this.vestingSchedule.beneficiary;
    this.tokenState.balances[ben] = (this.tokenState.balances[ben] || 0) + actualClaim;
    this.tokenState.circulatingSupply += actualClaim;
    return actualClaim;
  }

  // --- 4. Revenue Distribution wrappers ---
  public depositAdRevenue(amountTON: number): void {
    if (this.stancePool.totalStakedTokens === 0) {
      // Burn or buffer if no stakers exist
      return;
    }
    this.stancePool.totalDistributedTON += amountTON;
    
    // Scale and write to users proportionally
    Object.keys(this.stancePool.userStakes).forEach((user) => {
      const staked = this.stancePool.userStakes[user];
      const distributionRatio = staked / this.stancePool.totalStakedTokens;
      const profitShare = Math.floor(amountTON * distributionRatio);
      this.stancePool.accruedUserPayments[user] = (this.stancePool.accruedUserPayments[user] || 0) + profitShare;
    });
  }

  public stakeShares(user: string, amount: number): void {
    const balance = this.tokenState.balances[user] || 0;
    if (balance < amount) throw new Error("Insufficient shares equity to stake.");

    this.tokenState.balances[user] = balance - amount;
    this.stancePool.userStakes[user] = (this.stancePool.userStakes[user] || 0) + amount;
    this.stancePool.totalStakedTokens += amount;
  }

  public claimYield(user: string): number {
    const payout = this.stancePool.accruedUserPayments[user] || 0;
    if (payout > 0) {
      this.stancePool.accruedUserPayments[user] = 0;
    }
    return payout;
  }

  // --- 5. Bonding Curve Trading logic ---
  public getPriceForSupply(supply: number): number {
    return this.basePriceTON + Math.floor(this.slopeMultiplier * supply);
  }

  public getBuyCost(amount: number): number {
    let cost = 0;
    for (let i = 0; i < amount; i++) {
      cost += this.getPriceForSupply(this.tokenState.circulatingSupply + i);
    }
    return cost;
  }

  public getSellReturn(amount: number): number {
    let payout = 0;
    for (let i = 0; i < amount; i++) {
      payout += this.getPriceForSupply(this.tokenState.circulatingSupply - 1 - i);
    }
    return payout;
  }

  public buySharesInteractive(buyer: string, amount: number): { costTON: number; sharesAllocated: number } {
    if (amount <= 0) throw new Error("Buy amount must be positive.");
    if (this.tokenState.circulatingSupply + amount > this.tokenState.totalSupply) {
      throw new Error("Purchase would exceed total supply.");
    }
    const cost = this.getBuyCost(amount);
    this.tokenState.balances[buyer] = (this.tokenState.balances[buyer] || 0) + amount;
    this.tokenState.circulatingSupply += amount;
    this.reserveBalanceTON += cost;
    return { costTON: cost, sharesAllocated: amount };
  }

  public sellSharesInteractive(seller: string, amount: number): { payoutTON: number; exitTaxTON: number } {
    if (amount <= 0) throw new Error("Sell amount must be positive.");
    const userBal = this.tokenState.balances[seller] || 0;
    if (userBal < amount) throw new Error("Insufficient shares to sell on curve.");

    const rawPayout = this.getSellReturn(amount);

    if (rawPayout > this.reserveBalanceTON) {
      throw new Error("Insufficient reserve liquidity for this sell order.");
    }
    
    // applying 10% exit tax
    const exitTaxTON = Math.floor(rawPayout * 0.10);
    const finalPayout = rawPayout - exitTaxTON;

    this.tokenState.balances[seller] = userBal - amount;
    this.tokenState.circulatingSupply -= amount;
    this.reserveBalanceTON -= rawPayout;

    // Divert collected tax into long term stakers redistribution pool
    this.collectedTaxTON += exitTaxTON;
    
    return { payoutTON: finalPayout, exitTaxTON };
  }

  // --- 6. Governance Wrappers with Hostile Takeover Shields ---
  public calculateShieldedVotingWeight(user: string): number {
    const baseShares = this.tokenState.balances[user] || 0;
    const globalCirculating = this.tokenState.circulatingSupply;
    const maxPowerCap = Math.floor(globalCirculating * 0.30); // 30% voting power cap shield!

    if (baseShares > maxPowerCap) {
        return maxPowerCap; // Protected from whale-hostile takeover patterns
    }
    return baseShares;
  }

  private votedUsers: Record<string, Set<number>> = {};

  public castVote(user: string, proposalId: number, supports: boolean): void {
    const prop = this.proposals.find((p) => p.id === proposalId);
    if (!prop) throw new Error("Proposal ID not detected.");

    if (!this.votedUsers[user]) {
      this.votedUsers[user] = new Set();
    }
    if (this.votedUsers[user].has(proposalId)) {
      throw new Error("User has already voted on this proposal.");
    }
    this.votedUsers[user].add(proposalId);
    
    const votingPower = this.calculateShieldedVotingWeight(user);
    if (supports) {
      prop.yeasCount += votingPower;
    } else {
      prop.naysCount += votingPower;
    }
  }

  // --- 7. Exit Tax Redistribution Trigger ---
  public disperseCollectedTaxes(): number {
    const taxToDisperse = this.collectedTaxTON;
    if (taxToDisperse <= 0) return 0;

    this.collectedTaxTON = 0;
    this.totalDispersedTaxTON += taxToDisperse;
    
    // Disperse back through the revenue system to reward long-term stakers
    this.depositAdRevenue(taxToDisperse);
    
    return taxToDisperse;
  }
}
