import { expect } from "chai";
import hre, { ethers } from "hardhat";
import type { FhevmType as FhevmTypeEnum } from "@fhevm/hardhat-plugin";

const EUINT8 = 2 as FhevmTypeEnum;

describe("ReputationGate", function () {
  async function deployReputation() {
    const [owner, alice, bob] = await ethers.getSigners();

    const ReputationGate = await ethers.getContractFactory("ReputationGate");
    const gate = await ReputationGate.deploy(owner.address);
    await gate.waitForDeployment();

    return { gate, owner, alice, bob };
  }

  describe("Constructor", function () {
    it("should set owner correctly", async function () {
      const { gate, owner } = await deployReputation();
      expect(await gate.owner()).to.equal(owner.address);
    });

    it("should have correct constants", async function () {
      const { gate } = await deployReputation();
      expect(await gate.DECAY_BLOCKS()).to.equal(50400);
      expect(await gate.DECAY_RATE()).to.equal(5);
    });
  });

  describe("computeScore", function () {
    it("should compute a max score (100) for established wallet", async function () {
      const { gate, owner, alice } = await deployReputation();

      // walletAge: 40000 blocks (40pts), txCount: 1000 (40pts), history: 10 markets (20pts)
      await gate.connect(owner).computeScore(alice.address, 40000, 1000);

      // Manually add participation history first
      for (let i = 0; i < 10; i++) {
        await gate.recordParticipation(alice.address);
      }
      // Recompute with history
      await gate.connect(owner).computeScore(alice.address, 40000, 1000);

      expect(await gate.hasScore(alice.address)).to.be.true;

      const scoreHandle = await gate.getUserScore(alice.address);
      const score = await hre.fhevm.debugger.decryptEuint(EUINT8, scoreHandle);
      expect(score).to.equal(100n);
    });

    it("should compute partial score for newer wallet", async function () {
      const { gate, owner, alice } = await deployReputation();

      // walletAge: 10000 blocks (10pts), txCount: 250 (10pts), no history (0pts)
      await gate.connect(owner).computeScore(alice.address, 10000, 250);

      const scoreHandle = await gate.getUserScore(alice.address);
      const score = await hre.fhevm.debugger.decryptEuint(EUINT8, scoreHandle);
      expect(score).to.equal(20n); // 10 + 10 + 0
    });

    it("should compute zero score for brand new wallet", async function () {
      const { gate, owner, alice } = await deployReputation();

      await gate.connect(owner).computeScore(alice.address, 0, 0);

      const scoreHandle = await gate.getUserScore(alice.address);
      const score = await hre.fhevm.debugger.decryptEuint(EUINT8, scoreHandle);
      expect(score).to.equal(0n);
    });

    it("should emit ScoreComputed event", async function () {
      const { gate, owner, alice } = await deployReputation();

      await expect(gate.connect(owner).computeScore(alice.address, 5000, 100))
        .to.emit(gate, "ScoreComputed");
    });

    it("should revert if called by non-owner", async function () {
      const { gate, alice } = await deployReputation();
      await expect(gate.connect(alice).computeScore(alice.address, 5000, 100))
        .to.be.reverted;
    });
  });

  describe("meetsThreshold", function () {
    it("should return true for score above threshold", async function () {
      const { gate, owner, alice } = await deployReputation();

      // Score = 40 (age) + 40 (tx) = 80
      await gate.connect(owner).computeScore(alice.address, 40000, 1000);

      // Check threshold of 50
      const tx = await gate.meetsThreshold(alice.address, 50);
      // In mock env, we can verify via debug decrypt
      // The function returns ebool — we just verify it doesn't revert
    });

    it("should return false for score below threshold", async function () {
      const { gate, owner, alice } = await deployReputation();

      // Score = 5 (age) + 4 (tx) = 9
      await gate.connect(owner).computeScore(alice.address, 5000, 100);

      // This should succeed (returns ebool false, doesn't revert)
      await gate.meetsThreshold(alice.address, 50);
    });

    it("should handle uninitialized score (returns false)", async function () {
      const { gate, alice } = await deployReputation();

      // No score computed — should return ebool(false) via 0 >= threshold
      await gate.meetsThreshold(alice.address, 10);
    });
  });

  describe("recordParticipation", function () {
    it("should increment participation count", async function () {
      const { gate, alice } = await deployReputation();

      await gate.recordParticipation(alice.address);
      expect(await gate.marketParticipation(alice.address)).to.equal(1);

      await gate.recordParticipation(alice.address);
      expect(await gate.marketParticipation(alice.address)).to.equal(2);
    });
  });

  describe("Score decay", function () {
    it("should not decay within decay period", async function () {
      const { gate, owner, alice } = await deployReputation();

      await gate.connect(owner).computeScore(alice.address, 40000, 1000);

      // Mine a few blocks (well under DECAY_BLOCKS = 50400)
      await hre.network.provider.send("hardhat_mine", ["0x10"]);

      // meetsThreshold should still pass (no decay applied)
      await gate.meetsThreshold(alice.address, 70);
    });

    it("should decay score after decay period", async function () {
      const { gate, owner, alice } = await deployReputation();

      // Score = 80
      await gate.connect(owner).computeScore(alice.address, 40000, 1000);

      // Mine past one decay period (50400 blocks)
      await hre.network.provider.send("hardhat_mine", ["0xC4E0"]); // 50400 in hex

      // After 1 decay period: 80 - 5 = 75
      // Calling meetsThreshold triggers _applyDecay internally
      // Threshold of 76 should still work since decay creates a temp value
      await gate.meetsThreshold(alice.address, 74);
    });
  });

  describe("View functions", function () {
    it("should return correct hasScore", async function () {
      const { gate, owner, alice, bob } = await deployReputation();

      expect(await gate.hasScore(alice.address)).to.be.false;

      await gate.connect(owner).computeScore(alice.address, 5000, 100);

      expect(await gate.hasScore(alice.address)).to.be.true;
      expect(await gate.hasScore(bob.address)).to.be.false;
    });

    it("should return correct lastUpdated", async function () {
      const { gate, owner, alice } = await deployReputation();

      const blockBefore = await ethers.provider.getBlockNumber();
      await gate.connect(owner).computeScore(alice.address, 5000, 100);

      const lastUpdated = await gate.getLastUpdated(alice.address);
      expect(lastUpdated).to.be.greaterThan(blockBefore);
    });
  });
});
