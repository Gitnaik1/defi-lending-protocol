const hre = require("hardhat");

async function main() {

  console.log("Deploying contracts...");

  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const token = await MockUSDC.deploy();
  await token.waitForDeployment();
  console.log("MockUSDC deployed to:", await token.getAddress());

  const PriceOracle = await hre.ethers.getContractFactory("PriceOracle");
  const oracle = await PriceOracle.deploy();
  await oracle.waitForDeployment();
  console.log("PriceOracle deployed to:", await oracle.getAddress());

  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const pool = await LendingPool.deploy(
    await token.getAddress(),
    await oracle.getAddress()
  );
  await pool.waitForDeployment();
  console.log("LendingPool deployed to:", await pool.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
