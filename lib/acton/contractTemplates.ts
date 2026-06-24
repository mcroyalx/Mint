// Pure generators for the Acton smart-contract code/ABI/config previews
// shown in the admin deploy interface. Stateless: depends only on its args.

export function getAdminActonContractAsset(name: string, handle: string, supply: number, price: number, tab: "code" | "abi" | "config") {
    const capsHandle = handle.replace("@", "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const className = (capsHandle || "CHANNEL") + "_TDA_Contract";

    if (tab === "code") {
      return `// Acton Smart Contract: ${capsHandle || "CHANNEL"}_TDA.act
// Real USDT digital asset compiled and deployed via Acton CLI

import usdt.contract.standard;
import usdt.contract.equity_manager;

contract ${className} {
    // TDA parameters injected from Chief Moderator configuration
    let totalShares: Int64 = ${supply};
    let initialPriceMicroUSDT: Int64 = ${Math.round(price * 1000000)}; // ${price} USDT per share
    let tickerName: String = "${(capsHandle || "CHNL").substring(0, 4)}";
    let telegramHandle: String = "${handle}";
    let entityName: String = "${name}";

    // Acton dynamic allocations
    let ownerAddress: Address = sender();
    let treasuryAllocated: Int64 = 0;
    let indexMap: map(Address => Int64);

    public init() {
        // 70% vesting to creator, 30% floating public offering
        let companyReserve: Int64 = (this.totalShares * 70) / 100;
        let publicLiquidity: Int64 = this.totalShares - companyReserve;

        this.indexMap[this.ownerAddress] = companyReserve;
        this.indexMap[@usdt_address("EQ_ACTON_TREASURY_BUFFER_0912")] = publicLiquidity;

        emit DeployedOnActon({
            contract_id: myAddress(),
            shares_issued: this.totalShares,
            listing_price: this.initialPriceMicroUSDT,
            symbol: this.tickerName
        });
    }

    // Smart contract core trading logic
    public receive(msg: BuySharesOrder) {
        let orderValue: Int64 = context.value;
        let calculatedShares: Int64 = orderValue / this.initialPriceMicroUSDT;
        
        require(this.indexMap[@usdt_address("EQ_ACTON_TREASURY_BUFFER_0912")] >= calculatedShares, "Not enough liquid shares in public pool");
        
        this.indexMap[@usdt_address("EQ_ACTON_TREASURY_BUFFER_0912")] -= calculatedShares;
        this.indexMap[sender()] += calculatedShares;
        
        emit SharesTransferred({
            recipient: sender(),
            amount: calculatedShares,
            paid_usdt: orderValue
        });
    }
}`;
    } else if (tab === "abi") {
      return `{
  "compiler": "Acton Toolchain v1.4.2",
  "contractName": "${className}",
  "interface": [
    { "name": "init", "inputs": [], "outputs": [] },
    { "name": "receive", "inputs": [{ "name": "msg", "type": "BuySharesOrder" }], "outputs": [] },
    { "name": "get_balance", "inputs": [{ "name": "address", "type": "Address" }], "outputs": [{ "type": "Int64" }] },
    { "name": "get_tda_details", "inputs": [], "outputs": [{ "type": "Tuple" }] }
  ],
  "storage": {
    "totalShares": "Int64",
    "initialPriceMicroUSDT": "Int64",
    "tickerName": "String",
    "telegramHandle": "String",
    "ownerAddress": "Address",
    "indexMap": "map(Address => Int64)"
  }
}`;
    } else {
      return `{
  "project": "${className}_Deploy",
  "toolchain": "Acton Smart Compiler",
  "target": "usdt-mainnet-v2",
  "optimization": {
    "level": "O3",
    "inline_depth": 5,
    "bytecode_shorten": true
  },
  "deployment": {
    "gas_limit": 15000000,
    "fee_estimation_micro": 420,
    "initial_balance_usdt": 0.05
  }
}`;
    }
}
