import { expect } from "chai";
import hre, { ethers } from "hardhat";
import type { FhevmType as FhevmTypeEnum } from "@fhevm/hardhat-plugin";

const EUINT64 = 5 as FhevmTypeEnum;

describe("StrategyVault", function () {
  async function deployVault() {
    const [owner, manager, alice, bob, nonManager] = await ethers.getSigners();

    const MockcUSDT = await ethers.getContractFactory("MockcUSDT");
    const cUSDT = await MockcUSDT.deploy();
    await cUSDT.waitForDeployment();
    const cUSDTAddr = await cUSDT.getAddress();

    const VaultFactory = await ethers.getContractFactory("VaultFactory");
    const vaultFactory = await VaultFactory.deploy(cUSDTAddr, owner.address);
    await vaultFactory.waitForDeployment();

    // Manager creates a vault via the factory
    await vaultFactory
      .connect(manager)
      .createVault("Alpha Vault", "High-risk crypto bets", 0, 100);

    const vaultAddr = await vaultFactory.getVault(0);
    const StrategyVault = await ethers.getContractFactory("StrategyVault");
    const vault = StrategyVault.attach(vaultAddr);

    // Mint cUSDT to followers
    const mintAmount = 10_000_000_000; // 10,000 cUSDT
    await cUSDT.mint(alice.address, mintAmount);
    await cUSDT.mint(bob.address, mintAmount);

    // Approve vault to spend cUSDT for each follower
    for (const user of [alice, bob]) {
      const approveEnc = await hre.fhevm.encryptUint(
        EUINT64,
        mintAmount,
        cUSDTAddr,
        user.address
      );
      await cUSDT
        .connect(user)
        .approve(vaultAddr, approveEnc.externalEuint, approveEnc.inputProof);
    }

    return { vault, vaultFactory, cUSDT, cUSDTAddr, owner, manager, alice, bob, nonManager, vaultAddr };
  }

  describe("Constructor", function () {
    it("should initialize with correct state", async function () {
      const { vault, cUSDTAddr, manager } = await deployVault();

      expect(await vault.vaultId()).to.equal(0);
      expect(await vault.name()).to.equal("Alpha Vault");
      expect(await vault.description()).to.equal("High-risk crypto bets");
      expect(await vault.manager()).to.equal(manager.address);
      expect(await vault.requiredTier()).to.equal(0);
      expect(await vault.performanceFeeBps()).to.equal(100);
      expect(await vault.cUSDT()).to.equal(cUSDTAddr);
      expect(await vault.closed()).to.be.false;
    });

    it("should revert with ZeroAddress if manager is zero", async function () {
      const [owner] = await ethers.getSigners();
      const MockcUSDT = await ethers.getContractFactory("MockcUSDT");
      const cUSDT = await MockcUSDT.deploy();

      const SV = await ethers.getContractFactory("StrategyVault");
      await expect(
        SV.deploy(0, "Test", "Desc", ethers.ZeroAddress, 0, 100, await cUSDT.getAddress(), owner.address)
      ).to.be.revertedWithCustomError(SV, "ZeroAddress");
    });

    it("should revert with ZeroAddress if cUSDT is zero", async function () {
      const [owner, manager] = await ethers.getSigners();

      const SV = await ethers.getContractFactory("StrategyVault");
      await expect(
        SV.deploy(0, "Test", "Desc", manager.address, 0, 100, ethers.ZeroAddress, owner.address)
      ).to.be.revertedWithCustomError(SV, "ZeroAddress");
    });
  });

  describe("deposit", function () {
    it("should accept a deposit and track the follower", async function () {
      const { vault, alice, vaultAddr } = await deployVault();
      const depositAmount = 500_000_000; // 500 cUSDT

      const enc = await hre.fhevm.encryptUint(EUINT64, depositAmount, vaultAddr, alice.address);
      await vault.connect(alice).deposit(enc.externalEuint, enc.inputProof);

      expect(await vault.isFollower(alice.address)).to.be.true;
      expect(await vault.followerCount()).to.equal(1);

      const depositHandle = await vault.getDeposit(alice.address);
      const depositValue = await hre.fhevm.debugger.decryptEuint(EUINT64, depositHandle);
      expect(depositValue).to.equal(BigInt(depositAmount));
    });

    it("should emit Deposit event", async function () {
      const { vault, alice, vaultAddr } = await deployVault();

      const enc = await hre.fhevm.encryptUint(EUINT64, 100_000_000, vaultAddr, alice.address);

      await expect(vault.connect(alice).deposit(enc.externalEuint, enc.inputProof))
        .to.emit(vault, "Deposit")
        .withArgs(alice.address, 0);
    });

    it("should accumulate multiple deposits from the same follower", async function () {
      const { vault, alice, vaultAddr } = await deployVault();

      const enc1 = await hre.fhevm.encryptUint(EUINT64, 100_000_000, vaultAddr, alice.address);
      await vault.connect(alice).deposit(enc1.externalEuint, enc1.inputProof);

      const enc2 = await hre.fhevm.encryptUint(EUINT64, 200_000_000, vaultAddr, alice.address);
      await vault.connect(alice).deposit(enc2.externalEuint, enc2.inputProof);

      const depositHandle = await vault.getDeposit(alice.address);
      const depositValue = await hre.fhevm.debugger.decryptEuint(EUINT64, depositHandle);
      expect(depositValue).to.equal(BigInt(300_000_000));
      expect(await vault.followerCount()).to.equal(1); // still 1 follower
    });

    it("should track multiple followers", async function () {
      const { vault, alice, bob, vaultAddr } = await deployVault();

      const enc1 = await hre.fhevm.encryptUint(EUINT64, 100_000_000, vaultAddr, alice.address);
      await vault.connect(alice).deposit(enc1.externalEuint, enc1.inputProof);

      const enc2 = await hre.fhevm.encryptUint(EUINT64, 200_000_000, vaultAddr, bob.address);
      await vault.connect(bob).deposit(enc2.externalEuint, enc2.inputProof);

      expect(await vault.followerCount()).to.equal(2);
      expect(await vault.isFollower(alice.address)).to.be.true;
      expect(await vault.isFollower(bob.address)).to.be.true;
    });

    it("should revert deposit when vault is closed", async function () {
      const { vault, manager, alice, vaultAddr } = await deployVault();
      await vault.connect(manager).closeVault();

      const enc = await hre.fhevm.encryptUint(EUINT64, 100_000_000, vaultAddr, alice.address);

      await expect(
        vault.connect(alice).deposit(enc.externalEuint, enc.inputProof)
      ).to.be.revertedWithCustomError(vault, "VaultClosed");
    });
  });

  describe("withdraw", function () {
    it("should allow follower to withdraw after vault is closed", async function () {
      const { vault, manager, alice, vaultAddr } = await deployVault();

      const enc = await hre.fhevm.encryptUint(EUINT64, 100_000_000, vaultAddr, alice.address);
      await vault.connect(alice).deposit(enc.externalEuint, enc.inputProof);

      await vault.connect(manager).closeVault();

      await expect(vault.connect(alice).withdraw())
        .to.emit(vault, "Withdrawal")
        .withArgs(alice.address, 0);
    });

    it("should revert withdraw if vault is not closed", async function () {
      const { vault, alice, vaultAddr } = await deployVault();

      const enc = await hre.fhevm.encryptUint(EUINT64, 100_000_000, vaultAddr, alice.address);
      await vault.connect(alice).deposit(enc.externalEuint, enc.inputProof);

      await expect(
        vault.connect(alice).withdraw()
      ).to.be.revertedWithCustomError(vault, "VaultNotClosed");
    });

    it("should revert withdraw if not a follower", async function () {
      const { vault, manager, bob } = await deployVault();
      await vault.connect(manager).closeVault();

      await expect(
        vault.connect(bob).withdraw()
      ).to.be.revertedWithCustomError(vault, "NoDeposit");
    });

    it("should revert on double withdrawal", async function () {
      const { vault, manager, alice, vaultAddr } = await deployVault();

      const enc = await hre.fhevm.encryptUint(EUINT64, 100_000_000, vaultAddr, alice.address);
      await vault.connect(alice).deposit(enc.externalEuint, enc.inputProof);

      await vault.connect(manager).closeVault();
      await vault.connect(alice).withdraw();

      await expect(
        vault.connect(alice).withdraw()
      ).to.be.revertedWithCustomError(vault, "AlreadyWithdrawn");
    });
  });

  describe("closeVault", function () {
    it("should allow manager to close the vault", async function () {
      const { vault, manager } = await deployVault();

      await expect(vault.connect(manager).closeVault())
        .to.emit(vault, "VaultClosed_")
        .withArgs(0);

      expect(await vault.closed()).to.be.true;
    });

    it("should revert closeVault from non-manager", async function () {
      const { vault, alice } = await deployVault();

      await expect(
        vault.connect(alice).closeVault()
      ).to.be.revertedWithCustomError(vault, "OnlyManager");
    });
  });

  describe("placeBetFromVault", function () {
    it("should revert when called by non-manager", async function () {
      const { vault, nonManager } = await deployVault();

      // Trying to call placeBetFromVault with a non-manager should revert
      const enc = await hre.fhevm.encryptUint(
        EUINT64,
        100_000_000,
        await vault.getAddress(),
        nonManager.address
      );

      await expect(
        vault.connect(nonManager).placeBetFromVault(
          ethers.ZeroAddress,
          enc.externalEuint,
          enc.inputProof,
          true
        )
      ).to.be.revertedWithCustomError(vault, "OnlyManager");
    });

    it("should revert when vault is closed", async function () {
      const { vault, manager } = await deployVault();
      await vault.connect(manager).closeVault();

      const enc = await hre.fhevm.encryptUint(
        EUINT64,
        100_000_000,
        await vault.getAddress(),
        manager.address
      );

      await expect(
        vault.connect(manager).placeBetFromVault(
          ethers.ZeroAddress,
          enc.externalEuint,
          enc.inputProof,
          true
        )
      ).to.be.revertedWithCustomError(vault, "VaultClosed");
    });
  });

  describe("View Functions", function () {
    it("should return correct isFollower state", async function () {
      const { vault, alice, bob, vaultAddr } = await deployVault();

      expect(await vault.isFollower(alice.address)).to.be.false;

      const enc = await hre.fhevm.encryptUint(EUINT64, 100_000_000, vaultAddr, alice.address);
      await vault.connect(alice).deposit(enc.externalEuint, enc.inputProof);

      expect(await vault.isFollower(alice.address)).to.be.true;
      expect(await vault.isFollower(bob.address)).to.be.false;
    });

    it("should return correct followerCount", async function () {
      const { vault, alice, bob, vaultAddr } = await deployVault();

      expect(await vault.followerCount()).to.equal(0);

      const enc1 = await hre.fhevm.encryptUint(EUINT64, 100_000_000, vaultAddr, alice.address);
      await vault.connect(alice).deposit(enc1.externalEuint, enc1.inputProof);
      expect(await vault.followerCount()).to.equal(1);

      const enc2 = await hre.fhevm.encryptUint(EUINT64, 100_000_000, vaultAddr, bob.address);
      await vault.connect(bob).deposit(enc2.externalEuint, enc2.inputProof);
      expect(await vault.followerCount()).to.equal(2);
    });
  });
});
