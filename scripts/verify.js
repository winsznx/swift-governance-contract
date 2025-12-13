const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  const deploymentPath = path.join(__dirname, '../deployment.json');

  if (!fs.existsSync(deploymentPath)) {
    throw new Error("deployment.json not found. Please deploy the contract first.");
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

  console.log("📋 Deployment Info:");
  console.log("   Contract:", deploymentInfo.contractAddress);
  console.log("   Network:", deploymentInfo.network);
  console.log("   Governance Token:", deploymentInfo.governanceToken);
  console.log("");

  console.log("⏳ Verifying contract on BaseScan...");

  try {
    await hre.run("verify:verify", {
      address: deploymentInfo.contractAddress,
      constructorArguments: [deploymentInfo.governanceToken],
    });
    console.log("✅ Contract verified successfully!");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ Contract already verified!");
    } else {
      console.error("❌ Verification failed:", error.message);
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
