import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const deploymentPath = path.join(__dirname, "..", "deployments", "sepolia.json");

  if (!fs.existsSync(deploymentPath)) {
    throw new Error("Deployment file not found at " + deploymentPath);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const reputationAddr = deployment.contracts.ReputationGate;

  if (!reputationAddr) {
    throw new Error("ReputationGate address not found in deployment file");
  }

  console.log("════════════════════════════════════════════");
  console.log("  NullCast — Reputation Score Keeper");
  console.log("════════════════════════════════════════════");
  console.log("  Deployer:        ", deployer.address);
  console.log("  ReputationGate:  ", reputationAddr);
  console.log("════════════════════════════════════════════\n");

  const reputation = await ethers.getContractAt("ReputationGate", reputationAddr);

  // Parse --users from CLI args, or default to deployer address
  const usersArgIndex = process.argv.findIndex((arg) => arg === "--users");
  let users: string[];

  if (usersArgIndex !== -1 && process.argv[usersArgIndex + 1]) {
    users = process.argv[usersArgIndex + 1].split(",").map((addr) => addr.trim());
  } else {
    users = [deployer.address];
  }

  const currentBlock = await ethers.provider.getBlockNumber();
  console.log("Current block:", currentBlock);
  console.log("Computing scores for", users.length, "user(s)...\n");

  for (const user of users) {
    if (!ethers.isAddress(user)) {
      console.log(`  Skipping invalid address: ${user}`);
      continue;
    }

    // Demo defaults: reasonable approximations for Sepolia testnet
    const walletAgeBlocks = 50000;
    const txCount = 100;

    const participation = await reputation.marketParticipation(user);
    console.log(`  User: ${user}`);
    console.log(`    Participation:    ${participation}`);
    console.log(`    Wallet age:       ${walletAgeBlocks} blocks (demo default)`);
    console.log(`    Tx count:         ${txCount} (demo default)`);

    const tx = await reputation.computeScore(user, walletAgeBlocks, txCount);
    const receipt = await tx.wait();
    console.log(`    Score computed    tx: ${receipt?.hash}`);

    const hasScore = await reputation.hasScore(user);
    const lastUpdated = await reputation.getLastUpdated(user);
    console.log(`    Has score:        ${hasScore}`);
    console.log(`    Last updated:     block ${lastUpdated}\n`);
  }

  console.log("Done. Scores are encrypted on-chain (euint8).");
  console.log("Users can decrypt their own score via the frontend.\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
