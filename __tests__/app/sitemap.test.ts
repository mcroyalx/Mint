import sitemap from "@/app/sitemap";

describe("sitemap", () => {
  it("returns an array with at least one entry", () => {
    const result = sitemap();
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("includes the root URL with daily frequency", () => {
    const result = sitemap();
    const root = result[0];
    expect(root.url).toBe("https://mint-web3.app");
    expect(root.changeFrequency).toBe("daily");
    expect(root.priority).toBe(1);
  });

  it("sets lastModified to a valid Date", () => {
    const result = sitemap();
    expect(result[0].lastModified).toBeInstanceOf(Date);
  });
});
