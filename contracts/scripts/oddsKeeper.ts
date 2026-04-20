import hre, { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Odds Keeper — decrypts aggregate pool totals and submits on-chain odds updates.
 *
 * Usage:
 *   npx hardhat run scripts/oddsKeeper.ts --network sepolia
 *
 * Note: This script uses `hre.fhevm.publicDecrypt()` which is provided by
 * @fhevm/hardhat-plugin. On Sepolia this calls the Zama KMS relayer under the hood.
 * If `hre.fhevm` is not available (e.g. older plugin versions), you would need
 * to call the Zama relayer SDK directly instead.
 */

const ZERO_HANDLE = "0x" + "0".repeat(64);

async function main() {
  const [signer] = await ethers.getSigners();
  const deploymentPath = path.join(__dirname, "..", "deployments", "sepolia.json");

  if (!fs.existsSync(deploymentPath)) {
    throw new Error("deployments/sepolia.json not found. Run deploy.ts first.");
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const factoryAddr = deployment.contracts.NullCastFactory;

  if (!factoryAddr) {
    throw new Error("NullCastFactory address not found in deployment file");
  }

  console.log("════════════════════════════════════════════");
  console.log("  NullCast — Odds Keeper");
  console.log("════════════════════════════════════════════");
  console.log("  Signer:          ", signer.address);
  console.log("  NullCastFactory: ", factoryAddr);
  console.log("════════════════════════════════════════════\n");

  const factory = await ethers.getContractAt("NullCastFactory", factoryAddr);
  const allMarkets: string[] = await factory.getAllMarkets();

  console.log(`Processing ${allMarkets.length} market(s)...\n`);

  if (allMarkets.length === 0) {
    console.log("  No markets found. Create markets first.");
    console.log("\nDone.");
    return;
  }

  let updated = 0;
  let skipped = 0;
  let errored = 0;

  for (const marketAddr of allMarkets) {
    const market = await ethers.getContractAt("NullCastMarket", marketAddr);

    let question: string;
    try {
      question = await market.question();
    } catch {
      question = "Unknown";
    }

    const label = question.length > 40 ? question.slice(0, 40) + "..." : question;

    const yesHandle = await market.getTotalYesPoolHandle();
    const noHandle = await market.getTotalNoPoolHandle();

    // Skip markets with no bets (both handles are zero)
    if (yesHandle === ZERO_HANDLE && noHandle === ZERO_HANDLE) {
      console.log(`  [${label}] — no bets yet, skipping`);
      skipped++;
      continue;
    }

    try {
      const result = await hre.fhevm.publicDecrypt([yesHandle, noHandle]);
      const clearYes = result.clearValues[yesHandle as `0x${string}`] as bigint;
      const clearNo = result.clearValues[noHandle as `0x${string}`] as bigint;

      const tx = await market.submitOddsUpdate(clearYes, clearNo, result.decryptionProof);
      await tx.wait();

      const yesDisplay = Number(clearYes) / 1e6;
      const noDisplay = Number(clearNo) / 1e6;
      console.log(`  [${label}] — YES: ${yesDisplay} cUSDT, NO: ${noDisplay} cUSDT — updated`);
      updated++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);

      // OddsAlreadyUpdatedThisBlock is not a real error — just rate-limited
      if (message.includes("OddsAlreadyUpdatedThisBlock")) {
        console.log(`  [${label}] — already updated this block, skipping`);
        skipped++;
      } else {
        console.log(`  [${label}] — error: ${message}`);
        errored++;
      }
    }
  }

  console.log("\n════════════════════════════════════════════");
  console.log(`  Updated: ${updated}  Skipped: ${skipped}  Errors: ${errored}`);
  console.log("════════════════════════════════════════════\n");
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
