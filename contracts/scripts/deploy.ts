import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error("Deployer account has no ETH. Fund it with Sepolia ETH first.");
  }

  // ── 1. Deploy MockcUSDT ─────────────────────────────────────────────
  console.log("\n1/5 Deploying MockcUSDT...");
  const MockcUSDT = await ethers.getContractFactory("MockcUSDT");
  const cUSDT = await MockcUSDT.deploy();
  await cUSDT.waitForDeployment();
  const cUSDTAddr = await cUSDT.getAddress();
  console.log("   MockcUSDT deployed to:", cUSDTAddr);

  // ── 2. Deploy OracleMock ────────────────────────────────────────────
  console.log("\n2/5 Deploying OracleMock...");
  const OracleMock = await ethers.getContractFactory("OracleMock");
  const oracle = await OracleMock.deploy(deployer.address);
  await oracle.waitForDeployment();
  const oracleAddr = await oracle.getAddress();
  console.log("   OracleMock deployed to:", oracleAddr);

  // ── 3. Deploy ReputationGate ────────────────────────────────────────
  console.log("\n3/5 Deploying ReputationGate...");
  const ReputationGate = await ethers.getContractFactory("ReputationGate");
  const reputation = await ReputationGate.deploy(deployer.address);
  await reputation.waitForDeployment();
  const reputationAddr = await reputation.getAddress();
  console.log("   ReputationGate deployed to:", reputationAddr);

  // ── 4. Deploy NullCastFactory ───────────────────────────────────────
  console.log("\n4/5 Deploying NullCastFactory...");
  const NullCastFactory = await ethers.getContractFactory("NullCastFactory");
  const factory = await NullCastFactory.deploy(cUSDTAddr, oracleAddr, deployer.address);
  await factory.waitForDeployment();
  const factoryAddr = await factory.getAddress();
  console.log("   NullCastFactory deployed to:", factoryAddr);

  // ── 5. Save deployment addresses ────────────────────────────────────
  const deployment = {
    network: "sepolia",
    chainId: 11155111,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contracts: {
      MockcUSDT: cUSDTAddr,
      OracleMock: oracleAddr,
      ReputationGate: reputationAddr,
      NullCastFactory: factoryAddr,
    },
  };

  const deployDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(deployDir, "sepolia.json"),
    JSON.stringify(deployment, null, 2)
  );

  console.log("\n5/5 Deployment addresses saved to deployments/sepolia.json");
  console.log("\n════════════════════════════════════════════");
  console.log("  NullCast Sepolia Deployment Complete");
  console.log("════════════════════════════════════════════");
  console.log("  MockcUSDT:        ", cUSDTAddr);
  console.log("  OracleMock:       ", oracleAddr);
  console.log("  ReputationGate:   ", reputationAddr);
  console.log("  NullCastFactory:  ", factoryAddr);
  console.log("════════════════════════════════════════════\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
