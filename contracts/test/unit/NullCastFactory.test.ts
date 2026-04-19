import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("NullCastFactory", function () {
  async function deployFactory() {
    const [owner, oracle, alice, bob] = await ethers.getSigners();

    const MockcUSDT = await ethers.getContractFactory("MockcUSDT");
    const cUSDT = await MockcUSDT.deploy();
    await cUSDT.waitForDeployment();

    const NullCastFactory = await ethers.getContractFactory("NullCastFactory");
    const factory = await NullCastFactory.deploy(
      await cUSDT.getAddress(),
      oracle.address,
      owner.address
    );
    await factory.waitForDeployment();

    return { factory, cUSDT, owner, oracle, alice, bob };
  }

  describe("Constructor", function () {
    it("should initialize with correct state", async function () {
      const { factory, cUSDT, oracle, owner } = await deployFactory();

      expect(await factory.cUSDT()).to.equal(await cUSDT.getAddress());
      expect(await factory.oracleAddress()).to.equal(oracle.address);
      expect(await factory.owner()).to.equal(owner.address);
      expect(await factory.marketCount()).to.equal(0);
    });

    it("should revert with ZeroAddress if cUSDT is zero", async function () {
      const [owner, oracle] = await ethers.getSigners();
      const NullCastFactory = await ethers.getContractFactory("NullCastFactory");
      await expect(
        NullCastFactory.deploy(ethers.ZeroAddress, oracle.address, owner.address)
      ).to.be.revertedWithCustomError(NullCastFactory, "ZeroAddress");
    });

    it("should revert with ZeroAddress if oracle is zero", async function () {
      const [owner] = await ethers.getSigners();
      const MockcUSDT = await ethers.getContractFactory("MockcUSDT");
      const cUSDT = await MockcUSDT.deploy();
      const NullCastFactory = await ethers.getContractFactory("NullCastFactory");
      await expect(
        NullCastFactory.deploy(await cUSDT.getAddress(), ethers.ZeroAddress, owner.address)
      ).to.be.revertedWithCustomError(NullCastFactory, "ZeroAddress");
    });
  });

  describe("createMarket", function () {
    it("should create a market and register it", async function () {
      const { factory, alice } = await deployFactory();
      const currentBlock = await ethers.provider.getBlockNumber();

      const tx = await factory
        .connect(alice)
        .createMarket("Will BTC hit $100k?", currentBlock + 1000, 1_000_000, 0);
      const receipt = await tx.wait();

      expect(await factory.marketCount()).to.equal(1);
      const marketAddr = await factory.getMarket(0);
      expect(marketAddr).to.not.equal(ethers.ZeroAddress);

      const allMarkets = await factory.getAllMarkets();
      expect(allMarkets.length).to.equal(1);
      expect(allMarkets[0]).to.equal(marketAddr);
    });

    it("should emit MarketCreated event", async function () {
      const { factory, alice } = await deployFactory();
      const currentBlock = await ethers.provider.getBlockNumber();

      await expect(
        factory.connect(alice).createMarket("ETH above $5k?", currentBlock + 500, 1_000_000, 0)
      ).to.emit(factory, "MarketCreated");
    });

    it("should create multiple markets with incrementing IDs", async function () {
      const { factory, alice, bob } = await deployFactory();
      const currentBlock = await ethers.provider.getBlockNumber();

      await factory.connect(alice).createMarket("Market A", currentBlock + 1000, 1_000_000, 0);
      await factory.connect(bob).createMarket("Market B", currentBlock + 2000, 2_000_000, 0);

      expect(await factory.marketCount()).to.equal(2);
      expect(await factory.getMarket(0)).to.not.equal(ethers.ZeroAddress);
      expect(await factory.getMarket(1)).to.not.equal(ethers.ZeroAddress);
      expect(await factory.getMarket(0)).to.not.equal(await factory.getMarket(1));
    });

    it("should revert with EmptyQuestion for empty string", async function () {
      const { factory, alice } = await deployFactory();
      const currentBlock = await ethers.provider.getBlockNumber();

      await expect(
        factory.connect(alice).createMarket("", currentBlock + 1000, 1_000_000, 0)
      ).to.be.revertedWithCustomError(factory, "EmptyQuestion");
    });

    it("should revert with ExpiryInPast for past expiry block", async function () {
      const { factory, alice } = await deployFactory();

      await expect(
        factory.connect(alice).createMarket("Too late?", 1, 1_000_000, 0)
      ).to.be.revertedWithCustomError(factory, "ExpiryInPast");
    });

    it("should revert when factory is paused", async function () {
      const { factory, owner, alice } = await deployFactory();
      await factory.connect(owner).pause();
      const currentBlock = await ethers.provider.getBlockNumber();

      await expect(
        factory.connect(alice).createMarket("Paused?", currentBlock + 1000, 1_000_000, 0)
      ).to.be.revertedWithCustomError(factory, "EnforcedPause");
    });

    it("should deploy a functional NullCastMarket", async function () {
      const { factory, cUSDT, oracle, alice } = await deployFactory();
      const currentBlock = await ethers.provider.getBlockNumber();

      await factory.connect(alice).createMarket("Functional?", currentBlock + 1000, 1_000_000, 0);
      const marketAddr = await factory.getMarket(0);

      const NullCastMarket = await ethers.getContractFactory("NullCastMarket");
      const market = NullCastMarket.attach(marketAddr);

      expect(await market.question()).to.equal("Functional?");
      expect(await market.minimumBet()).to.equal(1_000_000);
      expect(await market.oracle()).to.equal(oracle.address);
      expect(await market.status()).to.equal(0); // OPEN
    });
  });

  describe("Admin", function () {
    it("should allow owner to pause and unpause", async function () {
      const { factory, owner } = await deployFactory();

      await factory.connect(owner).pause();
      expect(await factory.paused()).to.be.true;

      await factory.connect(owner).unpause();
      expect(await factory.paused()).to.be.false;
    });

    it("should revert pause from non-owner", async function () {
      const { factory, alice } = await deployFactory();
      await expect(factory.connect(alice).pause()).to.be.reverted;
    });

    it("should allow owner to update oracle address", async function () {
      const { factory, owner, alice } = await deployFactory();
      await factory.connect(owner).setOracle(alice.address);
      expect(await factory.oracleAddress()).to.equal(alice.address);
    });

    it("should revert setOracle with zero address", async function () {
      const { factory, owner } = await deployFactory();
      await expect(
        factory.connect(owner).setOracle(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(factory, "ZeroAddress");
    });

    it("should revert setOracle from non-owner", async function () {
      const { factory, alice } = await deployFactory();
      await expect(factory.connect(alice).setOracle(alice.address)).to.be.reverted;
    });
  });
});
