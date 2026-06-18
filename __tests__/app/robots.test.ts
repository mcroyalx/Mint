import robots from "@/app/robots";

describe("robots", () => {
  it("allows all user agents on /", () => {
    const config = robots();
    expect(config.rules).toEqual({
      userAgent: "*",
      allow: "/",
    });
  });

  it("includes a sitemap URL", () => {
    const config = robots();
    expect(config.sitemap).toBe("https://mint-web3.app/sitemap.xml");
  });
});
