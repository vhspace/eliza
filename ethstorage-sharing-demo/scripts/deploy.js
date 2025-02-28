const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting deployment of PersonalDataRegistry...");

  // Get the ethers object
  const ethers = hre.ethers;
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  
  // Deploy the contract (compatible with ethers v5 and v6)
  console.log("Compiling contracts with hardhat...");
  await hre.run('compile');
  
  console.log("Deploying PersonalDataRegistry contract...");
  const PersonalDataRegistryFactory = await ethers.getContractFactory("PersonalDataRegistry");
  const registry = await PersonalDataRegistryFactory.deploy();
  
  // Wait for deployment transaction to be mined
  console.log("Waiting for deployment transaction to be mined...");
  await registry.deployed?.() || await registry.waitForDeployment?.();
  
  // Get the contract address (compatible with both v5 and v6)
  const contractAddress = registry.address || await registry.getAddress();
  console.log(`PersonalDataRegistry deployed to: ${contractAddress}`);

  // Save deployment info to a file
  const deploymentInfo = {
    address: contractAddress,
    network: hre.network.name,
    timestamp: new Date().toISOString()
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  fs.writeFileSync(
    path.join(deploymentsDir, `${hre.network.name}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log(`Deployment info saved to deployments/${hre.network.name}.json`);
  console.log("Add this address to your .env file as DATA_REGISTRY_CONTRACT");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 