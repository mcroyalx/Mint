"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu,
  Layers,
  FileText,
  Play,
  CheckCircle,
  Code,
  ShieldAlert,
  Coins,
  ArrowRight,
  TrendingUp,
  Award,
  Lock,
  Vote,
  ExternalLink,
  Info,
  Terminal,
  Activity,
  Copy
} from "lucide-react";
import { motion } from "motion/react";
import { MintActonSDK } from "@/lib/ton/actonWrapper";
import { deployMintEcosystem } from "@/lib/ton/deploySinks";
import { runContractSimulationSuite, TestResult } from "@/lib/ton/testContracts";
import { formatNumberCompact as formatNumber } from "@/lib/formatters";

export default function ContractsTab() {
  const [subTab, setSubTab] = useState<"blueprint" | "sandbox" | "testSuite">("sandbox");
  const [selectedContractIndex, setSelectedContractIndex] = useState<number>(0);
  
  // SDK Instances Simulation state
  const [sdk, setSdk] = useState<MintActonSDK | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testingInProcess, setTestingInProcess] = useState<boolean>(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

  // Simulation Form Controls
  const [backerAddress, setBackerAddress] = useState<string>("EQ_BACKER_ALICE");
  const [depositAmountTON, setDepositAmountTON] = useState<string>("25000");
  const [buySharesAmount, setBuySharesAmount] = useState<string>("1000");
  const [sellSharesAmount, setSellSharesAmount] = useState<string>("500");
  const [stakeSharesAmount, setStakeSharesAmount] = useState<string>("5000");
  const [adRevenueInput, setAdRevenueInput] = useState<string>("15000");

  // Code Copy feedback
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const addLog = (msg: string) => {
    setConsoleLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 30));
  };

  // Initialize SDK Instance
  useEffect(() => {
    const initializedSdk = new MintActonSDK("tech_channel", "EQ_FOUNDER_SARKISSIAN", 1000000);
    initializedSdk.launchTDA(); // Start with ACTIVE TDA to make it fun
    
    const handle = requestAnimationFrame(() => {
      setSdk(initializedSdk);
      addLog("[SYSTEM] Loaded Mint Web3 Orchestrator SDK.");
      addLog("[ACTON] Active Actor mappings established: MintMediaToken (EQ_MINT_TOKEN_TECH_CHANNEL).");
    });
    return () => cancelAnimationFrame(handle);
  }, []);

  const syncState = () => {
    if (!sdk) return;
    setSdk(Object.assign(Object.create(Object.getPrototypeOf(sdk)), sdk));
  };

  // Run official diagnostics
  const executeDiagnostics = () => {
    setTestingInProcess(true);
    addLog("[DIAGNOSTIC] Compiling diagnostics routines...");
    
    setTimeout(() => {
      try {
        const results = runContractSimulationSuite();
        setTestResults(results);
        addLog(`[DIAGNOSTIC] All tests processed. Passed ${results.filter(r => r.passed).length}/${results.length} assertions.`);
      } catch (e: any) {
        addLog(`[ERROR] Diagnostic fail: ${e.message}`);
      } finally {
        setTestingInProcess(false);
      }
    }, 800);
  };

  // --- ACTIONS ---
  
  // 1. TDA Deposit
  const handleTdaDeposit = () => {
    if (!sdk) return;
    try {
      const tonVal = parseInt(depositAmountTON);
      if (isNaN(tonVal) || tonVal <= 0) {
        addLog("[ERROR] Deposit must be a valid positive TON value.");
        return;
      }
      sdk.depositTON(backerAddress, tonVal);
      addLog(`[TDA] ${backerAddress} deposited ${formatNumber(tonVal)} TON subscription.`);
      syncState();
    } catch (e: any) {
      addLog(`[ERROR] TDA: ${e.message}`);
    }
  };

  // 1b. TDA Finalize
  const handleTdaFinalize = () => {
    if (!sdk) return;
    try {
      addLog("[TDA] finalization contract triggered. Re-allocating dynamic float and computing oversubscriptions...");
      const receipt = sdk.finalizeTDA();
      addLog(`[TDA] Success! Finalized with oversell ratio: ${receipt.oversubscriptionRatio.toFixed(3)}x.`);
      addLog(`[TDA] Distributed initial floating shares supply: ${formatNumber(receipt.allocatedShares)} MINT-TECH tokens.`);
      syncState();
    } catch (e: any) {
      addLog(`[ERROR] TDA finalization failed: ${e.message}`);
    }
  };

  // 2. Bonding curve purchase
  const handleBuy = () => {
    if (!sdk) return;
    try {
      const amount = parseInt(buySharesAmount);
      if (isNaN(amount) || amount <= 0) return;
      
      const cost = sdk.getBuyCost(amount);
      sdk.buySharesInteractive("DEMO_USER", amount);
      addLog(`[AMM] Purchased ${formatNumber(amount)} MINT-TECH shares. Expended ${formatNumber(cost)} nano-TON.`);
      syncState();
    } catch (e: any) {
      addLog(`[ERROR] AMM Buy failed: ${e.message}`);
    }
  };

  const handleSell = () => {
    if (!sdk) return;
    try {
      const amount = parseInt(sellSharesAmount);
      if (isNaN(amount) || amount <= 0) return;

      const payout = sdk.sellSharesInteractive("DEMO_USER", amount);
      addLog(`[AMM] Sold ${formatNumber(amount)} MINT-TECH shares on linear curve.`);
      addLog(`[TAX] exit tax collected: ${formatNumber(payout.exitTaxTON)} TON. Dispatched ${formatNumber(payout.payoutTON)} TON payout back to vendor.`);
      syncState();
    } catch (e: any) {
      addLog(`[ERROR] AMM Sell failed: ${e.message}`);
    }
  };

  // 3. Staking & Yields
  const handleStake = () => {
    if (!sdk) return;
    try {
      const amount = parseInt(stakeSharesAmount);
      if (isNaN(amount) || amount <= 0) return;

      sdk.stakeShares("DEMO_USER", amount);
      addLog(`[STAKE] Committed ${formatNumber(amount)} MINT-TECH shares into yield distribution pool.`);
      syncState();
    } catch (e: any) {
      addLog(`[ERROR] Staking: ${e.message}`);
    }
  };

  const handleInjectAdRevenue = () => {
    if (!sdk) return;
    try {
      const tonVal = parseInt(adRevenueInput);
      if (isNaN(tonVal) || tonVal <= 0) return;

      sdk.depositAdRevenue(tonVal);
      addLog(`[REVENUE_DISTRIBUTOR] Injected ${formatNumber(tonVal)} TON advertisement sponsorship.`);
      addLog("[STAKE] Index recalculated. Rewards divided proportionally across active stakers.");
      syncState();
    } catch (e: any) {
      addLog(`[ERROR] Ad revenue deployment: ${e.message}`);
    }
  };

  const handleClaimYieldSim = () => {
    if (!sdk) return;
    const payout = sdk.claimYield("DEMO_USER");
    if (payout > 0) {
      addLog(`[YIELD_CLAIMED] Withdrew ${formatNumber(payout)} TON yield earnings to DEMO_USER wallet.`);
    } else {
      addLog("[YIELD] No outstanding reward accruals to withdraw at present.");
    }
    syncState();
  };

  // 4. Governance Voting
  const handleVoteProposal = (id: number, supports: boolean) => {
    if (!sdk) return;
    try {
      // Simulate User voting power weight checks
      const votingPower = sdk.tokenState.balances["DEMO_USER"] || 0;
      const shieldedPower = sdk.calculateShieldedVotingWeight("DEMO_USER");
      
      sdk.castVote("DEMO_USER", id, supports);
      
      addLog(`[GOVERNANCE] DEMO_USER voted on Proposal #${id} with Weight: ${formatNumber(shieldedPower)} MINT.`);
      if (votingPower > shieldedPower) {
        addLog(`[TAKEOVER_SHIELD] Cap activated! Voting power limited from ${formatNumber(votingPower)} down to ${formatNumber(shieldedPower)} to prevent creator eviction.`);
      }
      syncState();
    } catch (e: any) {
      addLog(`[ERROR] Vote failed: ${e.message}`);
    }
  };

  // 5. Exit Tax Disperse
  const handleDisperseTaxSim = () => {
    if (!sdk) return;
    const dispersed = sdk.disperseCollectedTaxes();
    if (dispersed > 0) {
      addLog(`[EXIT_TAX] Routed ${formatNumber(dispersed)} TON of exit penalty surcharges into Revenue distributor.`);
      addLog("[YIELD] Long-term stakers earned extra dividends.");
    } else {
      addLog("[EXIT_TAX] No pending tax cache to disperse.");
    }
    syncState();
  };

  // Static Smart Contracts Content
  const CONTRACTS_CODE = [
    {
      name: "1. Share Token Contract",
      file: "MintMediaToken.act",
      desc: "Issues secure, tokenized channel media equity representing co-ownership. Restrained by strict limits protecting dilution.",
      code: `// Acton Lang - Media Equity Share Contract
actor MintMediaToken(
    channelId: String,
    founderAddress: String,
    totalShares: Int,
    founderAllocation: Int,
    publicFloatAllocation: Int
) {
    var symbol: String = "MINT-" + channelId.upper()
    var name: String = "Mint Media Equity " + channelId
    var circulatingSupply: Int = 0
    var balances: Map[String, Int] = {}

    action init() {
        assert(founderAllocation + publicFloatAllocation <= totalShares, "Overflow")
        balances[founderAddress] = founderAllocation
        circulatingSupply = founderAllocation
    }

    action claimPublicFloat(recipient: String, amount: Int) {
        assert(circulatingSupply + amount <= totalShares, "Limit hit")
        balances[recipient] = balances.get(recipient, 0) + amount
        circulatingSupply += amount
    }

    action transferShares(to: String, amount: Int) {
        var senderBal = balances.get(context.sender, 0)
        assert(senderBal >= amount, "Insufficient")
        balances[context.sender] = senderBal - amount
        balances[to] = balances.get(to, 0) + amount
    }
}`
    },
    {
      name: "2. TDA Pool Contract",
      file: "MintTDAManager.act",
      desc: "Fair launching pool. Accepts subscriber funds, checks allocations, refunds oversubscribers & finalizes parameters.",
      code: `// Acton Lang - TON TDA & Funding Allocator
actor MintTDAManager(
    tokenAddress: String,
    fundingGoalTON: Int,
    publicSharesOffered: Int
) {
    var state: TDAState = TDAState.PENDING
    var totalDepositedTON: Int = 0
    var deposits: Map[String, Int] = {}

    action depositTON(backer: String, amountTON: Int) {
        assert(state == TDAState.ACTIVE, "Not active")
        deposits[backer] = deposits.get(backer, 0) + amountTON
        totalDepositedTON += amountTON
    }

    action finalize() {
        if (totalDepositedTON >= fundingGoalTON) {
            state = TDAState.COMPLETED
            // Allocate shares & deal with potential oversubscription refunds
        } else {
            state = TDAState.ABORTED // Refund all
        }
    }
}`
    },
    {
      name: "3. Founders Vesting",
      file: "MintVesting.act",
      desc: "Protects community float. Implements modular linear vesting schedule unlocks based on TON block metrics.",
      code: `// Acton Lang - Linear Cliff Vesting
actor MintVesting(
    mediaTokenAddress: String,
    beneficiary: String,
    totalVestedShares: Int,
    startBlock: Int,
    durationBlocks: Int,
    cliffBlocks: Int
) {
    var sharesClaimed: Int = 0

    query calculateUnlocked(currentBlock: Int): Int {
        if (currentBlock < startBlock + cliffBlocks) return 0
        if (currentBlock >= startBlock + durationBlocks) return totalVestedShares
        var elapsed = currentBlock - startBlock
        return Int(Float(totalVestedShares) * (Float(elapsed) / Float(durationBlocks)))
    }

    action claimUnlockedShares(currentBlock: Int) {
        var unlocked = calculateUnlocked(currentBlock)
        var claimable = unlocked - sharesClaimed
        assert(claimable > 0, "Zero claim")
        sharesClaimed += claimable
        MintMediaToken(mediaTokenAddress).transferShares(beneficiary, claimable)
    }
}`
    },
    {
      name: "4. Revenue Distributor",
      file: "MintRevenueDistributor.act",
      desc: "Receives sponsor/advertisement payloads in TON and distributes dividends to stakers synchronously via global indices.",
      code: `// Acton Lang - Ad Yield Distribution Loop
actor MintRevenueDistributor(tokenAddress: String) {
    var currentRewardIndex: Int = 0 
    var totalStakedTokens: Int = 0
    var userStakes: Map[String, Int] = {}

    action payRevenueTON(amountTON: Int) {
        currentRewardIndex += (amountTON * 1e9) / totalStakedTokens
    }

    action stakeShares(user: String, amount: Int) {
        updatePendingReward(user)
        MintMediaToken(tokenAddress).transferShares(context.selfAddress, amount)
        userStakes[user] = userStakes.get(user, 0) + amount
        totalStakedTokens += amount
    }
}`
    },
    {
      name: "5. AMM Trading Curve",
      file: "MintBondingCurveTrading.act",
      desc: "Provides autonomous, continuous automated market maker liquidity based on mathematical supply price functions.",
      code: `// Acton Lang - Elastic Bonding Curves
actor MintBondingCurveTrading(
    tokenAddress: String,
    taxCollectorAddress: String,
    basePriceTON: Int,
    slopeMultiplier: Int
) {
    query getPriceForSupply(supply: Int): Int {
        return basePriceTON + (slopeMultiplier * supply)
    }

    action buyShares(buyer: String, amount: Int, providedTON: Int) {
        var actualCost = getBuyCost(amount)
        assert(providedTON >= actualCost, "Underfunded")
        MintMediaToken(tokenAddress).claimPublicFloat(buyer, amount)
    }
}`
    },
    {
      name: "6. Takeover Shield Governance",
      file: "MintGovernance.act",
      desc: "Implements anti-takeover parameters. Limits single whale voting caps to 30%, preventing creator eviction.",
      code: `// Acton Lang - Sovereign DAO & Anti-Eviction Shield
actor MintGovernance(sharesTokenAddress: String) {
    query calculateShieldedVotingWeight(user: String): Int {
        var baseShares = MintMediaToken(sharesTokenAddress).getBalanceOf(user)
        var globalCirculating = MintMediaToken(sharesTokenAddress).getCirculatingSupply()
        var maxCapAllowed = (globalCirculating * 30) / 100 // strict 30% cap
        if (baseShares > maxCapAllowed) return maxCapAllowed
        return baseShares
    }
}`
    },
    {
      name: "7. Surcharges Exit Tax",
      file: "MintExitTaxManager.act",
      desc: "Diverts 10% from short term flippers on the curve trading pool directly into long-term stakers yield.",
      code: `// Acton Lang - Trading Tax Distributor
actor MintExitTaxManager(sharesTokenAddress: String, distributionContractAddress: String) {
    var accumulatedTaxFundsTON: Int = 0

    action receiveTaxTON(amountTON: Int) {
        accumulatedTaxFundsTON += amountTON
    }

    action disperseCollectedTaxes() {
        var payout = accumulatedTaxFundsTON
        accumulatedTaxFundsTON = 0
        MintRevenueDistributor(distributionContractAddress).payRevenueTON(payout)
    }
}`
    }
  ];

  const handleCopyCode = (index: number, codeText: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6 page-fade-enter pb-32">
      
      {/* HEADER SECTION WITH ACTON SYMBOLS */}
      <div className="p-4 bg-neutral-900/40 border border-white/5 rounded-3xl flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white/10 p-0.5 animate-pulse shrink-0">
          <div className="w-full h-full bg-neutral-900 rounded-2xl flex items-center justify-center">
            <Cpu className="w-6 h-6 text-white" />
          </div>
        </div>
        <div>
          <h2 className="font-display font-black text-white text-md tracking-tight uppercase flex items-center gap-1.5">
            MINT <span className="bg-white/10 text-white py-0.5 px-2 rounded-md text-[10px] font-mono border border-white/10">ACTON WEB3</span>
          </h2>
          <p className="text-[11px] text-neutral-400 font-mono">
            Sovereign Media smart contracts layout utilizing Actor architecture.
          </p>
        </div>
      </div>

      {/* SUB TAB SELECTOR */}
      <div className="grid grid-cols-3 gap-1 bg-[#1E1E1E] border border-white/5 p-1 rounded-2xl font-mono text-[10px]">
        <button
          onClick={() => setSubTab("sandbox")}
          className={`py-2 rounded-xl transition-all ${
            subTab === "sandbox" ? "bg-[#232323] text-white font-bold" : "text-neutral-300 hover:text-white"
          }`}
        >
          SANDBOX INTERACTIVE
        </button>
        <button
          onClick={() => setSubTab("blueprint")}
          className={`py-2 rounded-xl transition-all ${
            subTab === "blueprint" ? "bg-[#232323] text-white font-bold" : "text-neutral-300 hover:text-white"
          }`}
        >
          CONTRACT CODES
        </button>
        <button
          onClick={() => setSubTab("testSuite")}
          className={`py-2 rounded-xl transition-all ${
            subTab === "testSuite" ? "bg-[#232323] text-white font-bold" : "text-neutral-300 hover:text-white"
          }`}
        >
          DIAG_TESTS
        </button>
      </div>

      {/* 1. BLUEPRINT / CONTRACTS SOURCE CODES VIEW */}
      {subTab === "blueprint" && (
        <div className="space-y-4">
          <div className="p-4 bg-[#1E1E1E] border border-white/5 rounded-3xl space-y-3">
            <span className="text-[10px] font-mono text-neutral-500 block uppercase tracking-wider">SELECT ACTON SMART CONTRACT</span>
            
            <div className="flex gap-1.5 overflow-x-auto p-1.5 no-scrollbar bg-[#1E1E1E] border border-white/5 rounded-2xl scrollbar-none">
              {CONTRACTS_CODE.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedContractIndex(idx)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-mono whitespace-nowrap transition-all ${
                    selectedContractIndex === idx
                      ? "bg-[#232323] text-white font-bold border border-white/10"
                      : "bg-transparent border-transparent text-neutral-300 hover:text-white"
                  }`}
                >
                  {item.file}
                </button>
              ))}
            </div>

            <div className="space-y-1 bg-neutral-950/60 p-3 rounded-2xl border border-white/5">
              <h4 className="font-display font-bold text-xs text-white">{CONTRACTS_CODE[selectedContractIndex].name}</h4>
              <p className="text-[11px] text-neutral-400 font-mono leading-relaxed">{CONTRACTS_CODE[selectedContractIndex].desc}</p>
            </div>

            {/* Simulated code editor window */}
            <div className="relative rounded-2xl border border-white/5 bg-[#08080a] overflow-hidden">
              <div className="flex justify-between items-center px-4 py-2 bg-white/5 border-b border-white/5 font-mono text-[10px] text-neutral-400">
                <span>{CONTRACTS_CODE[selectedContractIndex].file}</span>
                <button
                  onClick={() => handleCopyCode(selectedContractIndex, CONTRACTS_CODE[selectedContractIndex].code)}
                  className="p-1 px-2.5 bg-white/5 hover:bg-white/10 rounded-md text-[9px] text-white transition-all flex items-center gap-1 font-mono"
                >
                  {copiedIndex === selectedContractIndex ? "COPIED" : <><Copy className="w-3 h-3" /> COPY CODE</>}
                </button>
              </div>
              <pre className="p-4 font-mono text-[10px] text-neutral-300 leading-relaxed overflow-x-auto max-h-72 select-all select-text">
                {CONTRACTS_CODE[selectedContractIndex].code}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* 2. LIVE SANDBOX SIMULATOR */}
      {subTab === "sandbox" && sdk && (
        <div className="space-y-4 font-mono">
          
          {/* TON Contracts Ledger Overview */}
          <div className="p-4 bg-[#1E1E1E] border border-white/5 rounded-3xl space-y-3.5">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">STATE LEDGER (REALTIME)</span>
              <span className="text-[9px] bg-white/10 text-white px-2 py-0.5 rounded border border-white/15">MINT ECOSYSTEM</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[10px]">
              <div className="p-2.5 bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="text-neutral-500 block">TOTAL SUPPLY</span>
                <span className="text-white font-bold block">{formatNumber(sdk.tokenState.totalSupply)}</span>
              </div>
              <div className="p-2.5 bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="text-neutral-500 block">CIRCULATING FLOAT</span>
                <span className="text-white font-bold block">{formatNumber(sdk.tokenState.circulatingSupply)}</span>
              </div>
              <div className="p-2.5 bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="text-neutral-400 block">RESERVES LIQUIDITY</span>
                <span className="text-white font-bold block">{formatNumber(sdk.reserveBalanceTON)} TON</span>
              </div>
              <div className="p-2.5 bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="text-neutral-500 block">STAKED TOKENS</span>
                <span className="text-white font-bold block">{formatNumber(sdk.stancePool.totalStakedTokens)} SHARES</span>
              </div>
              <div className="p-2.5 bg-white/[0.02] border border-white/5 rounded-xl col-span-2 flex justify-between">
                <div>
                  <span className="text-neutral-500 block">COLLECTED AMM EXIT TAXES</span>
                  <span className="text-white font-bold text-xs">{formatNumber(sdk.collectedTaxTON)} TON</span>
                </div>
                <button
                  onClick={handleDisperseTaxSim}
                  disabled={sdk.collectedTaxTON <= 0}
                  className="px-3 bg-white/10 hover:bg-white/20 disabled:opacity-40 border border-white/15 text-white rounded-xl text-[9px] transition-all"
                >
                  DISPERSE TAX TO STAKERS
                </button>
              </div>
            </div>
          </div>

          {/* ACTIVE SANDBOX OPERATION CENTERS */}
          <div className="space-y-4">
            
            {/* 1. TDA SUBSCRIBER */}
            <div className="p-4 bg-[#1E1E1E] border border-white/5 rounded-3xl space-y-3">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <Layers className="w-4 h-4 text-white" />
                <h3 className="font-display font-medium text-xs text-white">TDA SUBSCRIPTION MANAGER</h3>
                <span className={`text-[8px] px-1.5 py-0.5 rounded ml-auto ${
                  sdk.tdaState.status === "ACTIVE" ? "bg-white/10 text-white border border-white/10" : "bg-neutral-800 text-neutral-400"
                }`}>
                  {sdk.tdaState.status}
                </span>
              </div>

              <div className="space-y-3 text-[10px]">
                <div className="flex justify-between items-center text-neutral-400">
                  <span>Target Funding Goal:</span>
                  <span className="text-white">{formatNumber(sdk.tdaState.fundingGoalTON)} TON</span>
                </div>
                <div className="flex justify-between items-center text-neutral-400">
                  <span>Current Accumulated Deposits:</span>
                  <span className="text-white font-bold">{formatNumber(sdk.tdaState.totalDepositedTON)} TON</span>
                </div>

                {sdk.tdaState.status === "ACTIVE" && (
                  <div className="space-y-2 p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <span className="text-[9px] text-neutral-500 uppercase tracking-widest block">DEPOSIT SIMULATION INPUT</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={backerAddress}
                        onChange={(e) => setBackerAddress(e.target.value)}
                        placeholder="Backer Address"
                        className="w-1/2 px-2.5 py-1.5 bg-black border border-white/10 rounded-xl text-[10px] text-white focus:outline-none focus:border-white/50 font-mono"
                      />
                      <input
                        type="number"
                        value={depositAmountTON}
                        onChange={(e) => setDepositAmountTON(e.target.value)}
                        placeholder="TON Amount"
                        className="w-1/4 px-2.5 py-1.5 bg-black border border-white/10 rounded-xl text-[10px] text-white focus:outline-none focus:border-white/50 font-mono"
                      />
                      <button
                        onClick={handleTdaDeposit}
                        className="w-1/4 bg-white hover:bg-neutral-200 text-black font-bold rounded-xl text-[9px] transition-all"
                      >
                        DEPOSIT
                      </button>
                    </div>
                    <button
                      onClick={handleTdaFinalize}
                      className="w-full mt-1.5 py-2 bg-white/10 hover:bg-white/15 border border-white/10 active:scale-98 text-white text-[9px] font-bold rounded-xl transition-all"
                    >
                      FINALIZE TDA & RE-ALLOCATE FLOATS
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 2. AMM BONDING CURVE TRADING PORT */}
            <div className="p-4 bg-[#1E1E1E] border border-white/5 rounded-3xl space-y-3">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <TrendingUp className="w-4 h-4 text-white" />
                <h3 className="font-display font-medium text-xs text-white">AMM BONDING CURVE TRADING PORT</h3>
              </div>

              <div className="space-y-3 text-[10px]">
                <div className="flex justify-between text-neutral-400">
                  <span>Current Supply:</span>
                  <span className="text-white">{formatNumber(sdk.tokenState.circulatingSupply)} MINT-TECH</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Next Cost price per float:</span>
                  <span className="text-white font-bold">{formatNumber(sdk.getPriceForSupply(sdk.tokenState.circulatingSupply))} nanoTON</span>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                  {/* BUY BOX */}
                  <div className="space-y-1.5">
                    <span className="text-[8px] text-neutral-500 uppercase">BUY FLOATS</span>
                    <input
                      type="number"
                      value={buySharesAmount}
                      onChange={(e) => setBuySharesAmount(e.target.value)}
                      className="w-full px-2 py-1 bg-black border border-white/10 rounded-lg text-[10px] text-white focus:outline-none focus:border-white/30"
                    />
                    <div className="text-[9px] text-neutral-400">
                      Cost: <span className="text-white">{formatNumber(sdk.getBuyCost(parseInt(buySharesAmount) || 0))} nanoTON</span>
                    </div>
                    <button
                      onClick={handleBuy}
                      className="w-full py-1.5 bg-white hover:bg-neutral-200 text-black font-bold text-[9px] rounded-lg transition-all"
                    >
                      BUY SHARES
                    </button>
                  </div>

                  {/* SELL BOX */}
                  <div className="space-y-1.5">
                    <span className="text-[8px] text-neutral-500 uppercase">SELL BACK</span>
                    <input
                      type="number"
                      value={sellSharesAmount}
                      onChange={(e) => setSellSharesAmount(e.target.value)}
                      className="w-full px-2 py-1 bg-black border border-white/10 rounded-lg text-[10px] text-white focus:outline-none focus:border-white/30"
                    />
                    <div className="text-[9px] text-neutral-400">
                      Returns: <span className="text-white">{formatNumber(sdk.getSellReturn(parseInt(sellSharesAmount) || 0))} nanoTON</span>
                    </div>
                    <button
                      onClick={handleSell}
                      className="w-full py-1.5 bg-neutral-800 hover:bg-neutral-700 hover:text-white text-neutral-300 font-bold text-[9px] rounded-lg transition-all"
                    >
                      SELL WITH TAX
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. REVENUE STAKING POOL */}
            <div className="p-4 bg-[#1E1E1E] border border-white/5 rounded-3xl space-y-3">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <Coins className="w-4 h-4 text-white" />
                <h3 className="font-display font-medium text-xs text-white">REVENUE STAKING POOL</h3>
              </div>

              <div className="space-y-3 text-[10px]">
                <div className="flex justify-between text-neutral-400">
                  <span>Staked (DEMO):</span>
                  <span className="text-white">{formatNumber(sdk.stancePool.userStakes["DEMO_USER"] || 0)} MINT</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Outstanding yield claim:</span>
                  <span className="text-white font-bold">{formatNumber(sdk.stancePool.accruedUserPayments["DEMO_USER"] || 0)} TON</span>
                </div>

                <div className="space-y-2 p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <div className="flex gap-2">
                    <div className="w-1/2">
                      <span className="text-[8px] text-neutral-500 uppercase block mb-1">STAKE AMOUNT</span>
                      <div className="flex gap-1">
                        <input
                          type="number"
                          value={stakeSharesAmount}
                          onChange={(e) => setStakeSharesAmount(e.target.value)}
                          className="w-2/3 px-2 py-1 bg-black border border-white/10 rounded-lg text-[10px] text-white focus:outline-none"
                        />
                        <button
                          onClick={handleStake}
                          className="w-1/3 py-1 bg-white/10 hover:bg-white/15 outline-none rounded-lg text-white font-bold text-[9px] transition-all"
                        >
                          STAKE
                        </button>
                      </div>
                    </div>
                    <div className="w-1/2">
                      <span className="text-[8px] text-neutral-500 uppercase block mb-1">DEPLOY AD REVENUE</span>
                      <div className="flex gap-1">
                        <input
                          type="number"
                          value={adRevenueInput}
                          onChange={(e) => setAdRevenueInput(e.target.value)}
                          className="w-2/3 px-2 py-1 bg-black border border-white/10 rounded-lg text-[10px] text-white focus:outline-none"
                        />
                        <button
                          onClick={handleInjectAdRevenue}
                          className="w-1/3 py-1 bg-white hover:bg-neutral-200 text-black font-bold text-[9px] rounded-lg transition-all"
                        >
                          DEPLOY
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleClaimYieldSim}
                    className="w-full py-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white text-[9px] font-bold rounded-xl transition-all"
                  >
                    CLAIM HARVESTED TON YIELDS
                  </button>
                </div>
              </div>
            </div>

            {/* 4. DAO GOVERNANCE CONTROLS */}
            <div className="p-4 bg-[#1E1E1E] border border-white/5 rounded-3xl space-y-3">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <Vote className="w-4 h-4 text-white" />
                <h3 className="font-display font-medium text-xs text-white">DAO GOVERNANCE (SHIELD ACTIVE)</h3>
              </div>

              <div className="space-y-3 text-[10px]">
                {sdk.proposals.map((prop) => (
                  <div key={prop.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white uppercase text-[9px]">PROP #{prop.id}</span>
                      <span className={`text-[8px] px-1 py-0.5 rounded ${
                        prop.executed ? "bg-neutral-800 text-neutral-500" : "bg-white/5 text-neutral-300 border border-white/10"
                      }`}>
                        {prop.executed ? "EXECUTED" : "VOTING ACTIVE"}
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-400 leading-normal">{prop.title}</p>
                    <div className="flex justify-between text-neutral-500 text-[9px] font-mono">
                      <span>YEAS: <strong className="text-white">{formatNumber(prop.yeasCount)}</strong></span>
                      <span>NAYS: <strong className="text-white">{formatNumber(prop.naysCount)}</strong></span>
                    </div>

                    {!prop.executed && (
                      <div className="flex gap-2 pt-1 font-mono">
                        <button
                          onClick={() => handleVoteProposal(prop.id, true)}
                          className="w-1/2 py-1 bg-white/10 hover:bg-white/15 text-white rounded-lg text-[9px] font-semibold border border-white/10 transition-all"
                        >
                          VOTE YEA
                        </button>
                        <button
                          onClick={() => handleVoteProposal(prop.id, false)}
                          className="w-1/2 py-1 bg-white/5 hover:bg-white/10 text-neutral-400 rounded-lg text-[9px] font-semibold border border-white/5 transition-all"
                        >
                          VOTE NAY
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* SIMULATION CONSOLE LOGS TERMINAL */}
          <div className="p-4 bg-black border border-white/5 rounded-3xl space-y-2">
            <div className="flex items-center gap-1.5 border-b border-white/5 pb-2 text-neutral-400">
              <Terminal className="w-3.5 h-3.5" />
              <span className="text-[9px] font-mono select-none uppercase tracking-widest">ACTON CONSOLE TELEMETRY LOGS</span>
            </div>
            <div className="font-mono text-[9px] text-neutral-300 leading-normal space-y-1 max-h-40 overflow-y-auto select-text">
              {consoleLogs.length === 0 ? (
                <span className="text-neutral-500 italic">[Waiting for operations...]</span>
              ) : (
                consoleLogs.map((log, index) => (
                  <div key={index} className="truncate">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* 3. DIAGNOSTICS & INTEGRATION TESTS */}
      {subTab === "testSuite" && (
        <div className="space-y-4 font-mono">
          <div className="p-4 bg-[#1E1E1E] border border-white/5 rounded-3xl space-y-3">
            <span className="text-[10px] text-neutral-500 block uppercase tracking-wider">CONTRACT VERIFICATION ENGINE</span>
            <p className="text-[11px] text-neutral-400 leading-relaxed leading-normal">
              Execute test runs simulating actual TON transaction triggers across user balances, curve pricing limits, vesting cliffs, and anti-takeover parameters.
            </p>
            <button
              onClick={executeDiagnostics}
              disabled={testingInProcess}
              className="w-full py-2.5 bg-white hover:bg-neutral-200 text-black font-bold text-[10px] rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg tracking-wider"
            >
              {testingInProcess ? (
                <>RUNNING SECURE DIAGNOSTICS...</>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" /> EXECUTE SMART CONTRACT DIAGNOSTIC RUNS
                </>
              )}
            </button>
          </div>

          {/* TEST RESULTS CARDS */}
          {testResults.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider block px-1">DIAGNOSTIC ASSERTION LOGS:</span>
              <div className="space-y-2">
                {testResults.map((result, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border flex flex-col gap-1 transition-all ${
                      result.passed
                        ? "bg-white/5 border-white/15 text-white"
                        : "bg-white/5 border-white/5 text-neutral-400"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold leading-none">
                      <CheckCircle className="w-3.5 h-3.5 fill-current" />
                      <span>{result.testName}</span>
                      <span className="ml-auto text-[8px] bg-white/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        {result.passed ? "PASSED" : "FAILED"}
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-300 font-mono mt-0.5 line-clamp-2">{result.notes}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
