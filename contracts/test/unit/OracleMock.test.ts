import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("OracleMock", function () {
  async function deployOracle() {
    const [owner, alice] = await ethers.getSigners();

    const OracleMock = await ethers.getContractFactory("OracleMock");
    const oracle = await OracleMock.deploy(owner.address);
    await oracle.waitForDeployment();

    // Deploy a mock market for resolution tests
    const MockcUSDT = await ethers.getContractFactory("MockcUSDT");
    const cUSDT = await MockcUSDT.deploy();
    await cUSDT.waitForDeployment();

    const currentBlock = await ethers.provider.getBlockNumber();
    const NullCastMarket = await ethers.getContractFactory("NullCastMarket");
    const market = await NullCastMarket.deploy(
      0,
      "Test market",
      currentBlock + 5,
      1_000_000,
      await oracle.getAddress(), // oracle is the resolver
      owner.address,
      await cUSDT.getAddress(),
      0 // binary market
    );
    await market.waitForDeployment();

    return { oracle, market, cUSDT, owner, alice };
  }

  describe("Constructor", function () {
    it("should set owner correctly", async function () {
      const { oracle, owner } = await deployOracle();
      expect(await oracle.owner()).to.equal(owner.address);
    });
  });

  describe("registerMarket", function () {
    it("should register a market", async function () {
      const { oracle, market, owner } = await deployOracle();
      const marketAddr = await market.getAddress();

      await expect(oracle.connect(owner).registerMarket(0, marketAddr))
        .to.emit(oracle, "MarketRegistered")
        .withArgs(0, marketAddr);

      expect(await oracle.marketRegistry(0)).to.equal(marketAddr);
    });

    it("should revert if market already registered", async function () {
      const { oracle, market, owner } = await deployOracle();
      const marketAddr = await market.getAddress();

      await oracle.connect(owner).registerMarket(0, marketAddr);

      await expect(
        oracle.connect(owner).registerMarket(0, marketAddr)
      ).to.be.revertedWithCustomError(oracle, "MarketAlreadyRegistered");
    });

    it("should revert with ZeroAddress", async function () {
      const { oracle, owner } = await deployOracle();
      await expect(
        oracle.connect(owner).registerMarket(0, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(oracle, "ZeroAddress");
    });

    it("should revert if called by non-owner", async function () {
      const { oracle, market, alice } = await deployOracle();
      await expect(
        oracle.connect(alice).registerMarket(0, await market.getAddress())
      ).to.be.reverted;
    });
  });

  describe("submitResolution", function () {
    it("should resolve a registered market", async function () {
      const { oracle, market, owner } = await deployOracle();
      const marketAddr = await market.getAddress();

      await oracle.connect(owner).registerMarket(0, marketAddr);

      // Mine past expiry
      await hre.network.provider.send("hardhat_mine", ["0xA"]);

      await expect(oracle.connect(owner).submitResolution(0, 1, 95000))
        .to.emit(oracle, "MarketResolutionSubmitted");

      expect(await oracle.isResolved(0)).to.be.true;

      const [outcome, price] = await oracle.getResolution(0);
      expect(outcome).to.equal(1);
      expect(price).to.equal(95000);

      // Verify the market is actually resolved
      expect(await market.status()).to.equal(3); // RESOLVED
      expect(await market.resolvedOutcome()).to.equal(1);
    });

    it("should revert for unregistered market", async function () {
      const { oracle, owner } = await deployOracle();
      await expect(
        oracle.connect(owner).submitResolution(99, 1, 95000)
      ).to.be.revertedWithCustomError(oracle, "MarketNotRegistered");
    });

    it("should revert if called by non-owner", async function () {
      const { oracle, market, owner, alice } = await deployOracle();
      await oracle.connect(owner).registerMarket(0, await market.getAddress());
      await hre.network.provider.send("hardhat_mine", ["0xA"]);

      await expect(
        oracle.connect(alice).submitResolution(0, 1, 95000)
      ).to.be.reverted;
    });
  });
});
