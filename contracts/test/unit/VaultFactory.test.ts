import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultFactory", function () {
  async function deployFactory() {
    const [owner, manager, alice] = await ethers.getSigners();

    const MockcUSDT = await ethers.getContractFactory("MockcUSDT");
    const cUSDT = await MockcUSDT.deploy();
    await cUSDT.waitForDeployment();
    const cUSDTAddr = await cUSDT.getAddress();

    const VaultFactory = await ethers.getContractFactory("VaultFactory");
    const factory = await VaultFactory.deploy(cUSDTAddr, owner.address);
    await factory.waitForDeployment();

    return { factory, cUSDT, cUSDTAddr, owner, manager, alice };
  }

  describe("Constructor", function () {
    it("should initialize with correct state", async function () {
      const { factory, cUSDTAddr, owner } = await deployFactory();

      expect(await factory.cUSDT()).to.equal(cUSDTAddr);
      expect(await factory.owner()).to.equal(owner.address);
      expect(await factory.vaultCount()).to.equal(0);
    });

    it("should revert with ZeroAddress if cUSDT is zero", async function () {
      const [owner] = await ethers.getSigners();
      const VF = await ethers.getContractFactory("VaultFactory");
      await expect(
        VF.deploy(ethers.ZeroAddress, owner.address)
      ).to.be.revertedWithCustomError(VF, "ZeroAddress");
    });
  });

  describe("createVault", function () {
    it("should create a vault and register it", async function () {
      const { factory, manager } = await deployFactory();

      const tx = await factory
        .connect(manager)
        .createVault("Alpha Fund", "Aggressive crypto strategy", 0, 100);
      await tx.wait();

      expect(await factory.vaultCount()).to.equal(1);
      const vaultAddr = await factory.getVault(0);
      expect(vaultAddr).to.not.equal(ethers.ZeroAddress);

      const allVaults = await factory.getAllVaults();
      expect(allVaults.length).to.equal(1);
      expect(allVaults[0]).to.equal(vaultAddr);
    });

    it("should emit VaultCreated event", async function () {
      const { factory, manager } = await deployFactory();

      await expect(
        factory.connect(manager).createVault("Beta Fund", "Conservative bets", 0, 50)
      ).to.emit(factory, "VaultCreated");
    });

    it("should increment vault count for multiple vaults", async function () {
      const { factory, manager, alice } = await deployFactory();

      await factory.connect(manager).createVault("Vault A", "Desc A", 0, 100);
      await factory.connect(alice).createVault("Vault B", "Desc B", 0, 200);

      expect(await factory.vaultCount()).to.equal(2);
      expect(await factory.getVault(0)).to.not.equal(ethers.ZeroAddress);
      expect(await factory.getVault(1)).to.not.equal(ethers.ZeroAddress);
      expect(await factory.getVault(0)).to.not.equal(await factory.getVault(1));
    });

    it("should revert with EmptyName for empty vault name", async function () {
      const { factory, manager } = await deployFactory();

      await expect(
        factory.connect(manager).createVault("", "Some description", 0, 100)
      ).to.be.revertedWithCustomError(factory, "EmptyName");
    });

    it("should set manager as the caller", async function () {
      const { factory, manager } = await deployFactory();

      await factory.connect(manager).createVault("Manager Test", "Testing manager", 0, 100);

      const vaultAddr = await factory.getVault(0);
      const StrategyVault = await ethers.getContractFactory("StrategyVault");
      const vault = StrategyVault.attach(vaultAddr);

      expect(await vault.manager()).to.equal(manager.address);
    });
  });

  describe("View Functions", function () {
    it("should return correct vault by ID via getVault", async function () {
      const { factory, manager } = await deployFactory();

      await factory.connect(manager).createVault("Vault 0", "Desc", 0, 100);
      await factory.connect(manager).createVault("Vault 1", "Desc", 0, 200);

      const vault0 = await factory.getVault(0);
      const vault1 = await factory.getVault(1);

      expect(vault0).to.not.equal(ethers.ZeroAddress);
      expect(vault1).to.not.equal(ethers.ZeroAddress);
      expect(vault0).to.not.equal(vault1);
    });

    it("should return all vaults via getAllVaults", async function () {
      const { factory, manager, alice } = await deployFactory();

      await factory.connect(manager).createVault("V1", "D1", 0, 100);
      await factory.connect(alice).createVault("V2", "D2", 0, 200);
      await factory.connect(manager).createVault("V3", "D3", 0, 250);

      const all = await factory.getAllVaults();
      expect(all.length).to.equal(3);
    });

    it("should return correct vault count via getVaultCount", async function () {
      const { factory, manager } = await deployFactory();

      expect(await factory.getVaultCount()).to.equal(0);

      await factory.connect(manager).createVault("V1", "D1", 0, 100);
      expect(await factory.getVaultCount()).to.equal(1);

      await factory.connect(manager).createVault("V2", "D2", 0, 200);
      expect(await factory.getVaultCount()).to.equal(2);
    });

    it("should return zero address for non-existent vault ID", async function () {
      const { factory } = await deployFactory();
      expect(await factory.getVault(999)).to.equal(ethers.ZeroAddress);
    });
  });
});
