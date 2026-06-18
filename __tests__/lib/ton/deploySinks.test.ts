import { deployMintEcosystem, DeploymentReceipt } from "@/lib/ton/deploySinks";

describe("deployMintEcosystem", () => {
  let receipt: DeploymentReceipt;

  beforeAll(() => {
    // Suppress console.log from the deploy function during tests
    jest.spyOn(console, "log").mockImplementation(() => {});
    receipt = deployMintEcosystem("news_hub", "EQ_FOUNDER_X", 2_000_000);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("returns SUCCESS status", () => {
    expect(receipt.status).toBe("SUCCESS");
  });

  it("includes a valid ISO timestamp", () => {
    expect(new Date(receipt.timestamp).toISOString()).toBe(receipt.timestamp);
  });

  it("populates all 7 contract addresses", () => {
    const addrs = receipt.contractAddresses;
    expect(addrs.tokenContract).toContain("NEWS_HUB");
    expect(addrs.tdaContract).toContain("NEWS_HUB");
    expect(addrs.vestingContract).toContain("NEWS_HUB");
    expect(addrs.revenueContract).toContain("NEWS_HUB");
    expect(addrs.tradingContract).toContain("NEWS_HUB");
    expect(addrs.governanceContract).toContain("NEWS_HUB");
    expect(addrs.taxContract).toContain("NEWS_HUB");
  });

  it("sets genesis parameters correctly", () => {
    const params = receipt.genesisParameters;
    expect(params.symbol).toBe("MINT-NEWS_HUB");
    expect(params.goalTON).toBe(150_000);
    expect(params.sharesDistributed + params.founderVestedPool).toBeLessThanOrEqual(2_000_000);
    expect(params.founderVestedPool).toBe(
      Math.floor(Math.floor(2_000_000 * 0.35) * 0.8)
    );
  });

  it("uses default totalSupply of 10_000_000 when not provided", () => {
    const defaultReceipt = deployMintEcosystem("ch", "EQ_ADDR");
    expect(
      defaultReceipt.genesisParameters.sharesDistributed +
        defaultReceipt.genesisParameters.founderVestedPool
    ).toBeLessThanOrEqual(10_000_000);
  });
});
