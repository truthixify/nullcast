import { expect } from "chai";
import hre, { ethers } from "hardhat";
import type { FhevmType as FhevmTypeEnum } from "@fhevm/hardhat-plugin";

const EUINT64 = 5 as FhevmTypeEnum;

describe("StrategyVault", function () {
  async function deployVault() {
    const [owner, manager, alice, bob] = await ethers.getSigners();

    const MockcUSDT = await ethers.getContractFactory("MockcUSDT");
    const cUSDT = await MockcUSDT.deploy();
    await cUSDT.waitForDeployment();
    const cUSDTAddr = await cUSDT.getAddress();

    const VaultFactory = await ethers.getContractFactory("VaultFactory");
    const vaultFactory = await VaultFactory.deploy(cUSDTAddr, owner.address);
    await vaultFactory.waitForDeployment();

    // Manager creates a vault: 10% performance fee, open to all
    await vaultFactory.connect(manager).createVault("Alpha Vault", "High-risk crypto", 0, 1000);

    const vaultAddr = await vaultFactory.getVault(0);
    const StrategyVault = await ethers.getContractFactory("StrategyVault");
    const vault = StrategyVault.attach(vaultAddr);

    // Mint cUSDT to followers
    const mintAmount = 10_000_000_000;
    await cUSDT.mint(alice.address, mintAmount);
    await cUSDT.mint(bob.address, mintAmount);

    // Approve vault
    for (const user of [alice, bob]) {
      const enc = await hre.fhevm.encryptUint(EUINT64, mintAmount, cUSDTAddr, user.address);
      await cUSDT.connect(user).approve(vaultAddr, enc.externalEuint, enc.inputProof);
    }

    return { vault, vaultFactory, cUSDT, cUSDTAddr, owner, manager, alice, bob, vaultAddr };
  }

  describe("Constructor", function () {
    it("should initialize with correct state", async function () {
      const { vault, manager } = await deployVault();
      expect(await vault.name()).to.equal("Alpha Vault");
      expect(await vault.manager()).to.equal(manager.address);
      expect(await vault.performanceFeeBps()).to.equal(1000);
      expect(await vault.requiredTier()).to.equal(0);
      expect(await vault.closed()).to.equal(false);
      expect(await vault.followerCount()).to.equal(0);
    });

    it("should revert with ZeroAddress for invalid manager", async function () {
      const [owner] = await ethers.getSigners();
      const MockcUSDT = await ethers.getContractFactory("MockcUSDT");
      const cUSDT = await MockcUSDT.deploy();
      const StrategyVault = await ethers.getContractFactory("StrategyVault");
      await expect(
        StrategyVault.deploy(0, "X", "Y", ethers.ZeroAddress, 0, 1000, await cUSDT.getAddress(), owner.address)
      ).to.be.revertedWithCustomError(StrategyVault, "ZeroAddress");
    });
  });

  describe("Deposit", function () {
    it("should accept a deposit and track follower", async function () {
      const { vault, alice, vaultAddr } = await deployVault();

      const enc = await hre.fhevm.encryptUint(EUINT64, 100_000_000, vaultAddr, alice.address);
      await vault.connect(alice).deposit(enc.externalEuint, enc.inputProof);

      expect(await vault.isFollower(alice.address)).to.be.true;
      expect(await vault.followerCount()).to.equal(1);
    });

    it("should emit Deposit event", async function () {
      const { vault, alice, vaultAddr } = await deployVault();

      const enc = await hre.fhevm.encryptUint(EUINT64, 100_000_000, vaultAddr, alice.address);
      await expect(vault.connect(alice).deposit(enc.externalEuint, enc.inputProof))
        .to.emit(vault, "Deposit")
        .withArgs(alice.address, 0);
    });

    it("should track multiple followers", async function () {
      const { vault, alice, bob, vaultAddr } = await deployVault();

      const enc1 = await hre.fhevm.encryptUint(EUINT64, 100_000_000, vaultAddr, alice.address);
      await vault.connect(alice).deposit(enc1.externalEuint, enc1.inputProof);

      const enc2 = await hre.fhevm.encryptUint(EUINT64, 200_000_000, vaultAddr, bob.address);
      await vault.connect(bob).deposit(enc2.externalEuint, enc2.inputProof);

      expect(await vault.followerCount()).to.equal(2);
    });

    it("should revert when vault is closed", async function () {
      const { vault, manager, alice, vaultAddr } = await deployVault();
      await vault.connect(manager).closeVault();

      const enc = await hre.fhevm.encryptUint(EUINT64, 100_000_000, vaultAddr, alice.address);
      await expect(
        vault.connect(alice).deposit(enc.externalEuint, enc.inputProof)
      ).to.be.revertedWithCustomError(vault, "VaultClosed");
    });
  });

  describe("Withdraw", function () {
    it("should allow follower to withdraw with shares", async function () {
      const { vault, owner, alice, vaultAddr } = await deployVault();

      // Deposit
      const enc = await hre.fhevm.encryptUint(EUINT64, 100_000_000, vaultAddr, alice.address);
      await vault.connect(alice).deposit(enc.externalEuint, enc.inputProof);

      // Set public values (simulating keeper)
      await vault.connect(owner).setPublicTotalDeposits(100_000_000);
      await vault.connect(owner).setPublicTotalShares(100_000_000);

      // Withdraw
      await expect(vault.connect(alice).withdraw())
        .to.emit(vault, "Withdrawal")
        .withArgs(alice.address, 0);
    });

    it("should revert if not a follower", async function () {
      const { vault, bob } = await deployVault();
      await expect(vault.connect(bob).withdraw())
        .to.be.revertedWithCustomError(vault, "NoShares");
    });
  });

  describe("Manager", function () {
    it("should allow manager to close vault", async function () {
      const { vault, manager } = await deployVault();
      await vault.connect(manager).closeVault();
      expect(await vault.closed()).to.be.true;
    });

    it("should revert close from non-manager", async function () {
      const { vault, alice } = await deployVault();
      await expect(vault.connect(alice).closeVault())
        .to.be.revertedWithCustomError(vault, "OnlyManager");
    });

    it("should revert placeBetFromVault from non-manager", async function () {
      const { vault, alice, vaultAddr } = await deployVault();
      const enc = await hre.fhevm.encryptUint(EUINT64, 100_000_000, vaultAddr, alice.address);
      await expect(
        vault.connect(alice).placeBetFromVault(ethers.ZeroAddress, enc.externalEuint, enc.inputProof, true)
      ).to.be.revertedWithCustomError(vault, "OnlyManager");
    });

    it("should revert claimFees when no fees accrued", async function () {
      const { vault, manager } = await deployVault();
      await expect(vault.connect(manager).claimFees())
        .to.be.revertedWithCustomError(vault, "NoFees");
    });
  });

  describe("View functions", function () {
    it("should return follower status correctly", async function () {
      const { vault, alice, bob, vaultAddr } = await deployVault();

      expect(await vault.isFollower(alice.address)).to.be.false;

      const enc = await hre.fhevm.encryptUint(EUINT64, 100_000_000, vaultAddr, alice.address);
      await vault.connect(alice).deposit(enc.externalEuint, enc.inputProof);

      expect(await vault.isFollower(alice.address)).to.be.true;
      expect(await vault.isFollower(bob.address)).to.be.false;
    });

    it("should return followers list", async function () {
      const { vault, alice, bob, vaultAddr } = await deployVault();

      const enc1 = await hre.fhevm.encryptUint(EUINT64, 100_000_000, vaultAddr, alice.address);
      await vault.connect(alice).deposit(enc1.externalEuint, enc1.inputProof);

      const enc2 = await hre.fhevm.encryptUint(EUINT64, 50_000_000, vaultAddr, bob.address);
      await vault.connect(bob).deposit(enc2.externalEuint, enc2.inputProof);

      const followers = await vault.getFollowers();
      expect(followers.length).to.equal(2);
    });
  });
});
