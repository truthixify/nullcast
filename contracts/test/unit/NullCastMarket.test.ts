import { expect } from "chai";
import hre, { ethers } from "hardhat";
import type { FhevmType as FhevmTypeEnum } from "@fhevm/hardhat-plugin";

// FhevmType.euint64 = 5
const EUINT64 = 5 as FhevmTypeEnum;

describe("NullCastMarket", function () {
  let market: Awaited<ReturnType<typeof deployMarket>>;

  // Reusable deployment fixture
  async function deployMarket(overrides?: {
    expiryBlock?: number;
    minimumBet?: number;
  }) {
    const [owner, oracle, alice, bob, charlie] = await ethers.getSigners();

    // Deploy mock cUSDT
    const MockcUSDT = await ethers.getContractFactory("MockcUSDT");
    const cUSDT = await MockcUSDT.deploy();
    await cUSDT.waitForDeployment();

    const currentBlock = await ethers.provider.getBlockNumber();
    const expiryBlock = overrides?.expiryBlock ?? currentBlock + 1000;
    const minimumBet = overrides?.minimumBet ?? 1_000_000; // 1 cUSDT (6 decimals)

    // Deploy market
    const NullCastMarket = await ethers.getContractFactory("NullCastMarket");
    const marketContract = await NullCastMarket.deploy(
      1, // marketId
      "Will BTC be above $90k on May 10, 2026?",
      expiryBlock,
      minimumBet,
      oracle.address,
      owner.address,
      await cUSDT.getAddress(),
      0, // binary market
      ethers.ZeroAddress // no reputation gate
    );
    await marketContract.waitForDeployment();

    // Mint cUSDT to test users
    const mintAmount = 10_000_000_000; // 10,000 cUSDT
    await cUSDT.mint(alice.address, mintAmount);
    await cUSDT.mint(bob.address, mintAmount);
    await cUSDT.mint(charlie.address, mintAmount);

    // Approve market to spend cUSDT for each user
    const marketAddress = await marketContract.getAddress();
    for (const user of [alice, bob, charlie]) {
      const approveAmount = await hre.fhevm.encryptUint(
        EUINT64,
        mintAmount,
        await cUSDT.getAddress(),
        user.address
      );
      await cUSDT
        .connect(user)
        .approve(marketAddress, approveAmount.externalEuint, approveAmount.inputProof);
    }

    return {
      market: marketContract,
      cUSDT,
      owner,
      oracle,
      alice,
      bob,
      charlie,
      expiryBlock,
      minimumBet,
      marketAddress,
    };
  }

  // ── Constructor Tests ─────────────────────────────────────────────────

  describe("Constructor", function () {
    it("should initialize with correct state", async function () {
      const m = await deployMarket();

      expect(await m.market.marketId()).to.equal(1);
      expect(await m.market.question()).to.equal(
        "Will BTC be above $90k on May 10, 2026?"
      );
      expect(await m.market.marketType()).to.equal(0); // BINARY
      expect(await m.market.status()).to.equal(0); // OPEN
      expect(await m.market.expiryBlock()).to.equal(m.expiryBlock);
      expect(await m.market.minimumBet()).to.equal(m.minimumBet);
      expect(await m.market.oracle()).to.equal(m.oracle.address);
      expect(await m.market.owner()).to.equal(m.owner.address);
    });

    it("should return 50/50 odds for a fresh market", async function () {
      const m = await deployMarket();
      const [yesOdds, noOdds] = await m.market.getCurrentOdds();
      expect(yesOdds).to.equal(50);
      expect(noOdds).to.equal(50);
    });

    it("should revert with ZeroAddress if oracle is zero", async function () {
      const [owner] = await ethers.getSigners();
      const MockcUSDT = await ethers.getContractFactory("MockcUSDT");
      const cUSDT = await MockcUSDT.deploy();

      const NullCastMarket = await ethers.getContractFactory("NullCastMarket");
      await expect(
        NullCastMarket.deploy(
          1,
          "Test",
          99999,
          1000000,
          ethers.ZeroAddress,
          owner.address,
          await cUSDT.getAddress(),
          0,
          ethers.ZeroAddress
        )
      ).to.be.revertedWithCustomError(NullCastMarket, "ZeroAddress");
    });

    it("should revert with ZeroAddress if owner is zero", async function () {
      const [, oracle] = await ethers.getSigners();
      const MockcUSDT = await ethers.getContractFactory("MockcUSDT");
      const cUSDT = await MockcUSDT.deploy();

      const NullCastMarket = await ethers.getContractFactory("NullCastMarket");
      await expect(
        NullCastMarket.deploy(
          1,
          "Test",
          99999,
          1000000,
          oracle.address,
          ethers.ZeroAddress,
          await cUSDT.getAddress(),
          0,
          ethers.ZeroAddress
        )
      ).to.be.revertedWithCustomError(NullCastMarket, "ZeroAddress");
    });

    it("should revert with ZeroAddress if cUSDT is zero", async function () {
      const [owner, oracle] = await ethers.getSigners();
      const NullCastMarket = await ethers.getContractFactory("NullCastMarket");
      await expect(
        NullCastMarket.deploy(
          1,
          "Test",
          99999,
          1000000,
          oracle.address,
          owner.address,
          ethers.ZeroAddress,
          0,
          ethers.ZeroAddress
        )
      ).to.be.revertedWithCustomError(NullCastMarket, "ZeroAddress");
    });
  });

  // ── placeBet Tests ────────────────────────────────────────────────────

  describe("placeBet", function () {
    it("should accept a YES bet and track the position", async function () {
      const m = await deployMarket();
      const betAmount = 100_000_000; // 100 cUSDT

      const encrypted = await hre.fhevm.encryptUint(
        EUINT64,
        betAmount,
        m.marketAddress,
        m.alice.address
      );

      const tx = await m.market
        .connect(m.alice)
        .placeBet(encrypted.externalEuint, encrypted.inputProof, true);
      await tx.wait();

      expect(await m.market.hasPosition(m.alice.address)).to.be.true;

      // Verify encrypted position via debug decrypt
      const posHandle = await m.market.getUserYesPosition(m.alice.address);
      const posValue = await hre.fhevm.debugger.decryptEuint(
        EUINT64,
        posHandle
      );
      expect(posValue).to.equal(BigInt(betAmount));
    });

    it("should accept a NO bet and track the position", async function () {
      const m = await deployMarket();
      const betAmount = 50_000_000; // 50 cUSDT

      const encrypted = await hre.fhevm.encryptUint(
        EUINT64,
        betAmount,
        m.marketAddress,
        m.bob.address
      );

      await m.market
        .connect(m.bob)
        .placeBet(encrypted.externalEuint, encrypted.inputProof, false);

      const posHandle = await m.market.getUserNoPosition(m.bob.address);
      const posValue = await hre.fhevm.debugger.decryptEuint(
        EUINT64,
        posHandle
      );
      expect(posValue).to.equal(BigInt(betAmount));
    });

    it("should emit BetPlaced event", async function () {
      const m = await deployMarket();

      const encrypted = await hre.fhevm.encryptUint(
        EUINT64,
        100_000_000,
        m.marketAddress,
        m.alice.address
      );

      await expect(
        m.market
          .connect(m.alice)
          .placeBet(encrypted.externalEuint, encrypted.inputProof, true)
      )
        .to.emit(m.market, "BetPlaced")
        .withArgs(m.alice.address, 1, true);
    });

    it("should accumulate multiple bets from the same user", async function () {
      const m = await deployMarket();

      // First bet: 100 cUSDT YES
      const enc1 = await hre.fhevm.encryptUint(
        EUINT64,
        100_000_000,
        m.marketAddress,
        m.alice.address
      );
      await m.market
        .connect(m.alice)
        .placeBet(enc1.externalEuint, enc1.inputProof, true);

      // Second bet: 50 cUSDT YES
      const enc2 = await hre.fhevm.encryptUint(
        EUINT64,
        50_000_000,
        m.marketAddress,
        m.alice.address
      );
      await m.market
        .connect(m.alice)
        .placeBet(enc2.externalEuint, enc2.inputProof, true);

      // Total should be 150 cUSDT
      const posHandle = await m.market.getUserYesPosition(m.alice.address);
      const posValue = await hre.fhevm.debugger.decryptEuint(
        EUINT64,
        posHandle
      );
      expect(posValue).to.equal(BigInt(150_000_000));
    });

    it("should update total pool on each bet", async function () {
      const m = await deployMarket();

      // Alice bets 100 YES
      const enc1 = await hre.fhevm.encryptUint(
        EUINT64,
        100_000_000,
        m.marketAddress,
        m.alice.address
      );
      await m.market
        .connect(m.alice)
        .placeBet(enc1.externalEuint, enc1.inputProof, true);

      // Bob bets 50 NO
      const enc2 = await hre.fhevm.encryptUint(
        EUINT64,
        50_000_000,
        m.marketAddress,
        m.bob.address
      );
      await m.market
        .connect(m.bob)
        .placeBet(enc2.externalEuint, enc2.inputProof, false);

      // Verify encrypted pool totals via debug
      const yesHandle = await m.market.getTotalYesPoolHandle();
      const noHandle = await m.market.getTotalNoPoolHandle();

      const yesPool = await hre.fhevm.debugger.decryptEuint(
        EUINT64,
        yesHandle
      );
      const noPool = await hre.fhevm.debugger.decryptEuint(
        EUINT64,
        noHandle
      );

      expect(yesPool).to.equal(BigInt(100_000_000));
      expect(noPool).to.equal(BigInt(50_000_000));
    });

    it("should zero out bet below minimum (no revert on encrypted check)", async function () {
      const m = await deployMarket({ minimumBet: 10_000_000 }); // 10 cUSDT min

      // Bet only 1 cUSDT — below minimum
      const encrypted = await hre.fhevm.encryptUint(
        EUINT64,
        1_000_000,
        m.marketAddress,
        m.alice.address
      );

      // Should not revert, but effective bet is zero
      await m.market
        .connect(m.alice)
        .placeBet(encrypted.externalEuint, encrypted.inputProof, true);

      const posHandle = await m.market.getUserYesPosition(m.alice.address);
      const posValue = await hre.fhevm.debugger.decryptEuint(
        EUINT64,
        posHandle
      );
      expect(posValue).to.equal(0n);
    });

    it("should revert when market is paused", async function () {
      const m = await deployMarket();
      await m.market.connect(m.owner).pause();

      const encrypted = await hre.fhevm.encryptUint(
        EUINT64,
        100_000_000,
        m.marketAddress,
        m.alice.address
      );

      await expect(
        m.market
          .connect(m.alice)
          .placeBet(encrypted.externalEuint, encrypted.inputProof, true)
      ).to.be.revertedWithCustomError(m.market, "EnforcedPause");
    });

    it("should revert with MarketNotOpen after expiry", async function () {
      const currentBlock = await ethers.provider.getBlockNumber();
      const m = await deployMarket({ expiryBlock: currentBlock + 2 });

      // Mine blocks past expiry
      await hre.network.provider.send("hardhat_mine", ["0x5"]);

      const encrypted = await hre.fhevm.encryptUint(
        EUINT64,
        100_000_000,
        m.marketAddress,
        m.alice.address
      );

      await expect(
        m.market
          .connect(m.alice)
          .placeBet(encrypted.externalEuint, encrypted.inputProof, true)
      ).to.be.revertedWithCustomError(m.market, "MarketNotOpen");
    });
  });

  // ── resolveMarket Tests ───────────────────────────────────────────────

  describe("resolveMarket", function () {
    it("should allow oracle to resolve after expiry", async function () {
      const currentBlock = await ethers.provider.getBlockNumber();
      const m = await deployMarket({ expiryBlock: currentBlock + 2 });

      // Mine past expiry
      await hre.network.provider.send("hardhat_mine", ["0x5"]);

      await expect(m.market.connect(m.oracle).resolveMarket(1))
        .to.emit(m.market, "MarketResolved")
        .withArgs(1, 1, await ethers.provider.getBlockNumber().then(b => b + 1));

      expect(await m.market.status()).to.equal(3); // RESOLVED
      expect(await m.market.resolvedOutcome()).to.equal(1);
    });

    it("should revert if called by non-oracle", async function () {
      const currentBlock = await ethers.provider.getBlockNumber();
      const m = await deployMarket({ expiryBlock: currentBlock + 2 });
      await hre.network.provider.send("hardhat_mine", ["0x5"]);

      await expect(
        m.market.connect(m.alice).resolveMarket(1)
      ).to.be.revertedWithCustomError(m.market, "OnlyOracle");
    });

    it("should revert if market not expired yet", async function () {
      const m = await deployMarket();

      await expect(
        m.market.connect(m.oracle).resolveMarket(1)
      ).to.be.revertedWithCustomError(m.market, "MarketNotExpired");
    });

    it("should revert if market already resolved", async function () {
      const currentBlock = await ethers.provider.getBlockNumber();
      const m = await deployMarket({ expiryBlock: currentBlock + 2 });
      await hre.network.provider.send("hardhat_mine", ["0x5"]);

      await m.market.connect(m.oracle).resolveMarket(1);

      await expect(
        m.market.connect(m.oracle).resolveMarket(0)
      ).to.be.revertedWithCustomError(m.market, "MarketAlreadyResolved");
    });
  });

  // ── claimWinnings Tests ───────────────────────────────────────────────

  describe("claimWinnings", function () {
    async function setupResolvedMarket(outcome: number) {
      const currentBlock = await ethers.provider.getBlockNumber();
      const m = await deployMarket({ expiryBlock: currentBlock + 20 });

      // Alice bets 100 cUSDT YES
      const enc1 = await hre.fhevm.encryptUint(
        EUINT64,
        100_000_000,
        m.marketAddress,
        m.alice.address
      );
      await m.market
        .connect(m.alice)
        .placeBet(enc1.externalEuint, enc1.inputProof, true);

      // Bob bets 50 cUSDT NO
      const enc2 = await hre.fhevm.encryptUint(
        EUINT64,
        50_000_000,
        m.marketAddress,
        m.bob.address
      );
      await m.market
        .connect(m.bob)
        .placeBet(enc2.externalEuint, enc2.inputProof, false);

      // Public decrypt the pools for odds (needed for claimWinnings division)
      const yesHandle = await m.market.getTotalYesPoolHandle();
      const noHandle = await m.market.getTotalNoPoolHandle();

      // Use publicDecrypt which returns clearValues keyed by handle + decryptionProof
      const decryptResult = await hre.fhevm.publicDecrypt([yesHandle, noHandle]);
      const clearYes = decryptResult.clearValues[yesHandle as `0x${string}`] as bigint;
      const clearNo = decryptResult.clearValues[noHandle as `0x${string}`] as bigint;

      // Mine a block to allow oncePerBlock
      await hre.network.provider.send("hardhat_mine", ["0x1"]);
      await m.market.submitOddsUpdate(
        clearYes,
        clearNo,
        decryptResult.decryptionProof
      );

      // Mine past expiry and resolve
      await hre.network.provider.send("hardhat_mine", ["0x20"]);
      await m.market.connect(m.oracle).resolveMarket(outcome);

      return m;
    }

    it("should allow winner to claim winnings when YES wins", async function () {
      const m = await setupResolvedMarket(1); // YES wins

      await expect(m.market.connect(m.alice).claimWinnings())
        .to.emit(m.market, "WinningsClaimed")
        .withArgs(m.alice.address, 1);

      expect(await m.market.hasClaimed(m.alice.address)).to.be.true;

      // Verify winnings were computed
      const winningsHandle = await m.market.getUserWinnings(m.alice.address);
      const winnings = await hre.fhevm.debugger.decryptEuint(
        EUINT64,
        winningsHandle
      );
      // Alice should get ~98% of total pool (150M) = ~147M (after 2% fee)
      // winnings = (100M * 150M / 100M) * 0.98 = 147M
      expect(winnings).to.be.greaterThan(0n);
    });

    it("should revert if market not resolved", async function () {
      const m = await deployMarket();

      const encrypted = await hre.fhevm.encryptUint(
        EUINT64,
        100_000_000,
        m.marketAddress,
        m.alice.address
      );
      await m.market
        .connect(m.alice)
        .placeBet(encrypted.externalEuint, encrypted.inputProof, true);

      await expect(
        m.market.connect(m.alice).claimWinnings()
      ).to.be.revertedWithCustomError(m.market, "MarketNotResolved");
    });

    it("should revert if user has no position", async function () {
      const m = await setupResolvedMarket(1);

      await expect(
        m.market.connect(m.charlie).claimWinnings()
      ).to.be.revertedWithCustomError(m.market, "NoPosition");
    });

    it("should revert on double claim", async function () {
      const m = await setupResolvedMarket(1);

      await m.market.connect(m.alice).claimWinnings();

      await expect(
        m.market.connect(m.alice).claimWinnings()
      ).to.be.revertedWithCustomError(m.market, "AlreadyClaimed");
    });
  });

  // ── Admin Tests ───────────────────────────────────────────────────────

  describe("Admin", function () {
    it("should allow owner to pause and unpause", async function () {
      const m = await deployMarket();

      await m.market.connect(m.owner).pause();
      expect(await m.market.paused()).to.be.true;

      await m.market.connect(m.owner).unpause();
      expect(await m.market.paused()).to.be.false;
    });

    it("should revert pause from non-owner", async function () {
      const m = await deployMarket();
      await expect(
        m.market.connect(m.alice).pause()
      ).to.be.revertedWithCustomError(m.market, "OnlyOwner");
    });

    it("should allow owner to cancel market", async function () {
      const m = await deployMarket();

      await expect(m.market.connect(m.owner).cancelMarket("Oracle failure"))
        .to.emit(m.market, "MarketCancelled")
        .withArgs(1, "Oracle failure");

      expect(await m.market.status()).to.equal(4); // CANCELLED
    });

    it("should revert cancel from non-owner", async function () {
      const m = await deployMarket();
      await expect(
        m.market.connect(m.alice).cancelMarket("Hack attempt")
      ).to.be.revertedWithCustomError(m.market, "OnlyOwner");
    });
  });

  // ── View Functions Tests ──────────────────────────────────────────────

  describe("View Functions", function () {
    it("should return correct odds after public pool update", async function () {
      const m = await deployMarket();

      // Manually set public pools (simulating submitOddsUpdate)
      // We do this via placing bets and then submitting odds
      const enc1 = await hre.fhevm.encryptUint(
        EUINT64,
        75_000_000,
        m.marketAddress,
        m.alice.address
      );
      await m.market
        .connect(m.alice)
        .placeBet(enc1.externalEuint, enc1.inputProof, true);

      const enc2 = await hre.fhevm.encryptUint(
        EUINT64,
        25_000_000,
        m.marketAddress,
        m.bob.address
      );
      await m.market
        .connect(m.bob)
        .placeBet(enc2.externalEuint, enc2.inputProof, false);

      // Decrypt pools and submit odds update
      const yesHandle = await m.market.getTotalYesPoolHandle();
      const noHandle = await m.market.getTotalNoPoolHandle();

      const decryptResult = await hre.fhevm.publicDecrypt([yesHandle, noHandle]);
      const clearYes = decryptResult.clearValues[yesHandle as `0x${string}`] as bigint;
      const clearNo = decryptResult.clearValues[noHandle as `0x${string}`] as bigint;

      await hre.network.provider.send("hardhat_mine", ["0x1"]);
      await m.market.submitOddsUpdate(clearYes, clearNo, decryptResult.decryptionProof);

      const [yesOdds, noOdds] = await m.market.getCurrentOdds();
      expect(yesOdds).to.equal(75); // 75M / 100M * 100 = 75%
      expect(noOdds).to.equal(25);
    });

    it("should return correct hasPosition state", async function () {
      const m = await deployMarket();

      expect(await m.market.hasPosition(m.alice.address)).to.be.false;

      const encrypted = await hre.fhevm.encryptUint(
        EUINT64,
        100_000_000,
        m.marketAddress,
        m.alice.address
      );
      await m.market
        .connect(m.alice)
        .placeBet(encrypted.externalEuint, encrypted.inputProof, true);

      expect(await m.market.hasPosition(m.alice.address)).to.be.true;
      expect(await m.market.hasPosition(m.bob.address)).to.be.false;
    });
  });
});
