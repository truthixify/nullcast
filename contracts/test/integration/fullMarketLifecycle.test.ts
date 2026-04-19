import { expect } from "chai";
import hre, { ethers } from "hardhat";
import type { FhevmType as FhevmTypeEnum } from "@fhevm/hardhat-plugin";

const EUINT64 = 5 as FhevmTypeEnum;

describe("Full Market Lifecycle Integration", function () {
  it("should complete: factory create → LP deposit → bet → resolve → claim", async function () {
    const [owner, alice, bob, charlie] = await ethers.getSigners();

    // ── 1. Deploy infrastructure ──────────────────────────────────

    const MockcUSDT = await ethers.getContractFactory("MockcUSDT");
    const cUSDT = await MockcUSDT.deploy();
    await cUSDT.waitForDeployment();
    const cUSDTAddr = await cUSDT.getAddress();

    const OracleMock = await ethers.getContractFactory("OracleMock");
    const oracle = await OracleMock.deploy(owner.address);
    await oracle.waitForDeployment();
    const oracleAddr = await oracle.getAddress();

    const NullCastFactory = await ethers.getContractFactory("NullCastFactory");
    const factory = await NullCastFactory.deploy(cUSDTAddr, oracleAddr, owner.address);
    await factory.waitForDeployment();

    // ── 2. Create a market via factory ─────────────────────────────

    const currentBlock = await ethers.provider.getBlockNumber();
    const expiryBlock = currentBlock + 30;

    await factory.connect(alice).createMarket(
      "Will BTC be above $90k on May 10?",
      expiryBlock,
      1_000_000,
      0
    );

    const marketAddr = await factory.getMarket(0);
    const NullCastMarket = await ethers.getContractFactory("NullCastMarket");
    const market = NullCastMarket.attach(marketAddr);

    expect(await market.question()).to.equal("Will BTC be above $90k on May 10?");
    expect(await market.status()).to.equal(0); // OPEN

    // Register market in oracle
    await oracle.connect(owner).registerMarket(0, marketAddr);

    // ── 3. Mint cUSDT and approve ─────────────────────────────────

    const mintAmount = 10_000_000_000;
    await cUSDT.mint(alice.address, mintAmount);
    await cUSDT.mint(bob.address, mintAmount);
    await cUSDT.mint(charlie.address, mintAmount);

    for (const user of [alice, bob, charlie]) {
      const enc = await hre.fhevm.encryptUint(EUINT64, mintAmount, cUSDTAddr, user.address);
      await cUSDT.connect(user).approve(marketAddr, enc.externalEuint, enc.inputProof);
    }

    // ── 4. Place bets ─────────────────────────────────────────────

    // Alice bets 200 cUSDT YES
    const aliceBet = await hre.fhevm.encryptUint(EUINT64, 200_000_000, marketAddr, alice.address);
    await market.connect(alice).placeBet(aliceBet.externalEuint, aliceBet.inputProof, true);

    // Bob bets 100 cUSDT NO
    const bobBet = await hre.fhevm.encryptUint(EUINT64, 100_000_000, marketAddr, bob.address);
    await market.connect(bob).placeBet(bobBet.externalEuint, bobBet.inputProof, false);

    // Charlie bets 50 cUSDT YES
    const charlieBet = await hre.fhevm.encryptUint(EUINT64, 50_000_000, marketAddr, charlie.address);
    await market.connect(charlie).placeBet(charlieBet.externalEuint, charlieBet.inputProof, true);

    // Verify positions
    expect(await market.hasPosition(alice.address)).to.be.true;
    expect(await market.hasPosition(bob.address)).to.be.true;
    expect(await market.hasPosition(charlie.address)).to.be.true;

    // ── 5. Public decrypt and submit odds ──────────────────────────

    const yesHandle = await market.getTotalYesPoolHandle();
    const noHandle = await market.getTotalNoPoolHandle();

    const decryptResult = await hre.fhevm.publicDecrypt([yesHandle, noHandle]);
    const clearYes = decryptResult.clearValues[yesHandle as `0x${string}`] as bigint;
    const clearNo = decryptResult.clearValues[noHandle as `0x${string}`] as bigint;

    expect(clearYes).to.equal(250_000_000n); // 200M + 50M
    expect(clearNo).to.equal(100_000_000n);

    await hre.network.provider.send("hardhat_mine", ["0x1"]);
    await market.submitOddsUpdate(clearYes, clearNo, decryptResult.decryptionProof);

    // Verify odds: 250/(250+100) = 71.4% → 71 (integer)
    const [yesOdds, noOdds] = await market.getCurrentOdds();
    expect(yesOdds).to.equal(71);
    expect(noOdds).to.equal(29);

    // ── 6. Resolve market (YES wins) ──────────────────────────────

    await hre.network.provider.send("hardhat_mine", ["0x30"]); // past expiry
    await oracle.connect(owner).submitResolution(0, 1, 95000);

    expect(await market.status()).to.equal(3); // RESOLVED
    expect(await market.resolvedOutcome()).to.equal(1);

    // ── 7. Winners claim ──────────────────────────────────────────

    // Alice (YES winner) claims
    await expect(market.connect(alice).claimWinnings())
      .to.emit(market, "WinningsClaimed")
      .withArgs(alice.address, 0);

    const aliceWinningsHandle = await market.getUserWinnings(alice.address);
    const aliceWinnings = await hre.fhevm.debugger.decryptEuint(EUINT64, aliceWinningsHandle);
    expect(aliceWinnings).to.be.greaterThan(0n);

    // Charlie (YES winner) claims
    await market.connect(charlie).claimWinnings();

    const charlieWinningsHandle = await market.getUserWinnings(charlie.address);
    const charlieWinnings = await hre.fhevm.debugger.decryptEuint(EUINT64, charlieWinningsHandle);
    expect(charlieWinnings).to.be.greaterThan(0n);

    // Alice got more than Charlie (4:1 ratio of bets)
    expect(aliceWinnings).to.be.greaterThan(charlieWinnings);

    // Bob (NO loser) should get NoPosition since he bet on losing side
    // Bob has a position but on the losing side — his YES position is uninitialized
    await expect(market.connect(bob).claimWinnings()).to.be.revertedWithCustomError(
      market,
      "NoPosition"
    );

    // ── 8. Double-claim prevention ────────────────────────────────

    await expect(market.connect(alice).claimWinnings()).to.be.revertedWithCustomError(
      market,
      "AlreadyClaimed"
    );
  });

  it("should complete: factory create → oracle resolves NO → NO bettor wins", async function () {
    const [owner, alice, bob] = await ethers.getSigners();

    const MockcUSDT = await ethers.getContractFactory("MockcUSDT");
    const cUSDT = await MockcUSDT.deploy();
    await cUSDT.waitForDeployment();
    const cUSDTAddr = await cUSDT.getAddress();

    const OracleMock = await ethers.getContractFactory("OracleMock");
    const oracle = await OracleMock.deploy(owner.address);
    await oracle.waitForDeployment();

    const NullCastFactory = await ethers.getContractFactory("NullCastFactory");
    const factory = await NullCastFactory.deploy(
      cUSDTAddr,
      await oracle.getAddress(),
      owner.address
    );
    await factory.waitForDeployment();

    const currentBlock = await ethers.provider.getBlockNumber();
    await factory.connect(alice).createMarket("ETH above $5k?", currentBlock + 20, 1_000_000, 0);

    const marketAddr = await factory.getMarket(0);
    const NullCastMarket = await ethers.getContractFactory("NullCastMarket");
    const market = NullCastMarket.attach(marketAddr);

    await oracle.connect(owner).registerMarket(0, marketAddr);

    // Fund and approve
    await cUSDT.mint(alice.address, 10_000_000_000);
    await cUSDT.mint(bob.address, 10_000_000_000);

    for (const user of [alice, bob]) {
      const enc = await hre.fhevm.encryptUint(EUINT64, 10_000_000_000, cUSDTAddr, user.address);
      await cUSDT.connect(user).approve(marketAddr, enc.externalEuint, enc.inputProof);
    }

    // Alice bets YES, Bob bets NO
    const aliceBet = await hre.fhevm.encryptUint(EUINT64, 100_000_000, marketAddr, alice.address);
    await market.connect(alice).placeBet(aliceBet.externalEuint, aliceBet.inputProof, true);

    const bobBet = await hre.fhevm.encryptUint(EUINT64, 150_000_000, marketAddr, bob.address);
    await market.connect(bob).placeBet(bobBet.externalEuint, bobBet.inputProof, false);

    // Submit odds
    const yesH = await market.getTotalYesPoolHandle();
    const noH = await market.getTotalNoPoolHandle();
    const dr = await hre.fhevm.publicDecrypt([yesH, noH]);
    await hre.network.provider.send("hardhat_mine", ["0x1"]);
    await market.submitOddsUpdate(
      dr.clearValues[yesH as `0x${string}`] as bigint,
      dr.clearValues[noH as `0x${string}`] as bigint,
      dr.decryptionProof
    );

    // Resolve NO (outcome = 0)
    await hre.network.provider.send("hardhat_mine", ["0x20"]);
    await oracle.connect(owner).submitResolution(0, 0, 4500);

    // Bob (NO) wins
    await market.connect(bob).claimWinnings();
    const bobWinnings = await hre.fhevm.debugger.decryptEuint(
      EUINT64,
      await market.getUserWinnings(bob.address)
    );
    expect(bobWinnings).to.be.greaterThan(0n);

    // Alice (YES) loses
    await expect(market.connect(alice).claimWinnings()).to.be.revertedWithCustomError(
      market,
      "NoPosition"
    );
  });
});
