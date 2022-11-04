const { ethers } = require("hardhat");
const { REPUBLIC_NFT_CONTRACT_ADDRESS } = require("../constants")

async function main() {
  const FakeNFTMarketplace = await ethers.getContractFactory(
      "FakeNFTMarketplace"
  );
  const fakeNftMarketplace = await FakeNFTMarketplace.deploy();
  await fakeNftMarketplace.deployed();

  console.log("FakeNFTMarketplace deployed to: ", fakeNftMarketplace.address);

  const RepublicDevsDAO = await ethers.getContractFactory("CryptoDevsDAO");
  const republicDevsDAO = await RepublicDevsDAO.deploy(
      fakeNftMarketplace.address,
      REPUBLIC_NFT_CONTRACT_ADDRESS,
      {
        value: ethers.utils.parseEther("0.0001")
      }
  );
  await republicDevsDAO.deployed();

  console.log("RepublicDevsDAO deployed to: ", republicDevsDAO.address);
}

main()
.then(()=>process.exit(0))
.catch((error)=>{
  console.error(error)
  process.exit(1);
});
