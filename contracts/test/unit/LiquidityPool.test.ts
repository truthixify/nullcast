import { expect } from "chai";
import hre, { ethers } from "hardhat";
import type { FhevmType as FhevmTypeEnum } from "@fhevm/hardhat-plugin";

const EUINT64 = 5 as FhevmTypeEnum;

describe("LiquidityPool", function () {
  async function deployPool() {
    const [owner, marketSigner, alice, bob] = await ethers.getSigners();

    const MockcUSDT = await ethers.getContractFactory("MockcUSDT");
    const cUSDT = await MockcUSDT.deploy();
    await cUSDT.waitForDeployment();

    const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
    const pool = await LiquidityPool.deploy(
      0,
      marketSigner.address,
      owner.address,
      await cUSDT.getAddress()
    );
    await pool.waitForDeployment();

    // Mint cUSDT to LPs
    const mintAmount = 10_000_000_000; // 10,000 cUSDT
    await cUSDT.mint(alice.address, mintAmount);
    await cUSDT.mint(bob.address, mintAmount);

    // Approve pool
    const poolAddress = await pool.getAddress();
    for (const user of [alice, bob]) {
      const approveEnc = await hre.fhevm.encryptUint(
        EUINT64,
        mintAmount,
        await cUSDT.getAddress(),
        user.address
      );
      await cUSDT
        .connect(user)
        .approve(poolAddress, approveEnc.externalEuint, approveEnc.inputProof);
    }

    return { pool, cUSDT, owner, marketSigner, alice, bob, poolAddress };
  }

  describe("Constructor", function () {
    it("should initialize with correct state", async function () {
      const { pool, cUSDT, owner, marketSigner } = await deployPool();
      expect(await pool.marketId()).to.equal(0);
      expect(await pool.market()).to.equal(marketSigner.address);
      expect(await pool.owner()).to.equal(owner.address);
      expect(await pool.cUSDT()).to.equal(await cUSDT.getAddress());
    });

    it("should revert with ZeroAddress for invalid params", async function () {
      const [owner, market] = await ethers.getSigners();
      const MockcUSDT = await ethers.getContractFactory("MockcUSDT");
      const cUSDT = await MockcUSDT.deploy();

      const LP = await ethers.getContractFactory("LiquidityPool");
      await expect(LP.deploy(0, ethers.ZeroAddress, owner.address, await cUSDT.getAddress()))
        .to.be.revertedWithCustomError(LP, "ZeroAddress");
      await expect(LP.deploy(0, market.address, ethers.ZeroAddress, await cUSDT.getAddress()))
        .to.be.revertedWithCustomError(LP, "ZeroAddress");
      await expect(LP.deploy(0, market.address, owner.address, ethers.ZeroAddress))
        .to.be.revertedWithCustomError(LP, "ZeroAddress");
    });
  });

  describe("addLiquidity", function () {
    it("should accept liquidity and track LP share", async function () {
      const { pool, alice, poolAddress } = await deployPool();
      const depositAmount = 500_000_000; // 500 cUSDT

      const enc = await hre.fhevm.encryptUint(EUINT64, depositAmount, poolAddress, alice.address);
      await pool.connect(alice).addLiquidity(enc.externalEuint, enc.inputProof);

      expect(await pool.isLP(alice.address)).to.be.true;
      expect(await pool.getLPCount()).to.equal(1);

      const sharesHandle = await pool.getLPShares(alice.address);
      const shares = await hre.fhevm.debugger.decryptEuint(EUINT64, sharesHandle);
      expect(shares).to.equal(BigInt(depositAmount));
    });

    it("should emit LiquidityAdded event", async function () {
      const { pool, alice, poolAddress } = await deployPool();
      const enc = await hre.fhevm.encryptUint(EUINT64, 100_000_000, poolAddress, alice.address);

      await expect(pool.connect(alice).addLiquidity(enc.externalEuint, enc.inputProof))
        .to.emit(pool, "LiquidityAdded")
        .withArgs(alice.address, 0);
    });

    it("should accumulate multiple deposits from same LP", async function () {
      const { pool, alice, poolAddress } = await deployPool();

      const enc1 = await hre.fhevm.encryptUint(EUINT64, 100_000_000, poolAddress, alice.address);
      await pool.connect(alice).addLiquidity(enc1.externalEuint, enc1.inputProof);

      const enc2 = await hre.fhevm.encryptUint(EUINT64, 200_000_000, poolAddress, alice.address);
      await pool.connect(alice).addLiquidity(enc2.externalEuint, enc2.inputProof);

      const sharesHandle = await pool.getLPShares(alice.address);
      const shares = await hre.fhevm.debugger.decryptEuint(EUINT64, sharesHandle);
      expect(shares).to.equal(BigInt(300_000_000));
      expect(await pool.getLPCount()).to.equal(1); // still 1 LP
    });

    it("should track multiple LPs", async function () {
      const { pool, alice, bob, poolAddress } = await deployPool();

      const enc1 = await hre.fhevm.encryptUint(EUINT64, 100_000_000, poolAddress, alice.address);
      await pool.connect(alice).addLiquidity(enc1.externalEuint, enc1.inputProof);

      const enc2 = await hre.fhevm.encryptUint(EUINT64, 200_000_000, poolAddress, bob.address);
      await pool.connect(bob).addLiquidity(enc2.externalEuint, enc2.inputProof);

      expect(await pool.getLPCount()).to.equal(2);
      expect(await pool.isLP(alice.address)).to.be.true;
      expect(await pool.isLP(bob.address)).to.be.true;
    });
  });

  describe("withdrawLiquidity", function () {
    it("should allow LP to withdraw principal", async function () {
      const { pool, alice, poolAddress } = await deployPool();

      const enc = await hre.fhevm.encryptUint(EUINT64, 100_000_000, poolAddress, alice.address);
      await pool.connect(alice).addLiquidity(enc.externalEuint, enc.inputProof);

      await expect(pool.connect(alice).withdrawLiquidity())
        .to.emit(pool, "LiquidityRemoved")
        .withArgs(alice.address, 0);

      // Shares should be zero after withdrawal
      const sharesHandle = await pool.getLPShares(alice.address);
      const shares = await hre.fhevm.debugger.decryptEuint(EUINT64, sharesHandle);
      expect(shares).to.equal(0n);
    });

    it("should revert if not an LP", async function () {
      const { pool, bob } = await deployPool();
      await expect(pool.connect(bob).withdrawLiquidity())
        .to.be.revertedWithCustomError(pool, "NoShares");
    });
  });
});
