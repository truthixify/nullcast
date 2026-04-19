import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const deploymentPath = path.join(__dirname, "..", "deployments", "sepolia.json");
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("deployments/sepolia.json not found. Run deploy.ts first.");
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const [deployer] = await ethers.getSigners();

  console.log("Seeding demo markets from:", deployer.address);

  const factory = await ethers.getContractAt("NullCastFactory", deployment.contracts.NullCastFactory);
  const oracle = await ethers.getContractAt("OracleMock", deployment.contracts.OracleMock);

  const currentBlock = await ethers.provider.getBlockNumber();

  // ── Market 1: BTC Binary ────────────────────────────────────────────
  console.log("\n1/3 Creating BTC binary market...");
  const btcTx = await factory.createMarket(
    "BTC above $90,000 on April 30, 2026?",
    currentBlock + 216000, // ~30 days at 12s blocks
    1_000_000, // 1 cUSDT minimum
    0 // binary
  );
  await btcTx.wait();
  const btcMarketAddr = await factory.getMarket(0);
  console.log("   BTC market:", btcMarketAddr);

  // Register in oracle
  await (await oracle.registerMarket(0, btcMarketAddr)).wait();
  console.log("   Registered in oracle");

  // ── Market 2: ETH Binary ────────────────────────────────────────────
  console.log("\n2/3 Creating ETH binary market...");
  const ethTx = await factory.createMarket(
    "ETH above $2,000 on May 5, 2026?",
    currentBlock + 252000, // ~35 days
    1_000_000,
    0
  );
  await ethTx.wait();
  const ethMarketAddr = await factory.getMarket(1);
  console.log("   ETH market:", ethMarketAddr);

  await (await oracle.registerMarket(1, ethMarketAddr)).wait();
  console.log("   Registered in oracle");

  // ── Market 3: BTC Scalar (3 buckets) ────────────────────────────────
  console.log("\n3/3 Creating BTC scalar market (3 buckets)...");
  const scalarTx = await factory.createMarket(
    "BTC price range on May 10: <$80k / $80k-$100k / >$100k",
    currentBlock + 288000, // ~40 days
    1_000_000,
    3 // 3 buckets
  );
  await scalarTx.wait();
  const scalarMarketAddr = await factory.getMarket(2);
  console.log("   Scalar market:", scalarMarketAddr);

  await (await oracle.registerMarket(2, scalarMarketAddr)).wait();
  console.log("   Registered in oracle");

  // ── Save market addresses ───────────────────────────────────────────
  deployment.markets = {
    "BTC-1": { id: 0, address: btcMarketAddr, question: "BTC above $90,000 on April 30, 2026?", type: "binary" },
    "ETH-1": { id: 1, address: ethMarketAddr, question: "ETH above $2,000 on May 5, 2026?", type: "binary" },
    "SCALAR-1": { id: 2, address: scalarMarketAddr, question: "BTC price range on May 10: <$80k / $80k-$100k / >$100k", type: "scalar", buckets: 3 },
  };

  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

  console.log("\n════════════════════════════════════════════");
  console.log("  3 Demo Markets Seeded");
  console.log("════════════════════════════════════════════");
  console.log("  BTC-1 (binary):   ", btcMarketAddr);
  console.log("  ETH-1 (binary):   ", ethMarketAddr);
  console.log("  SCALAR-1 (3-way): ", scalarMarketAddr);
  console.log("════════════════════════════════════════════\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
