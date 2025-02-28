const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PersonalDataRegistry", function () {
  let registry;
  let owner;
  let viewer1;
  let viewer2;
  
  // Enum values
  const CATEGORIES = {
    PERSONAL_INFO: 0,
    CONTACT_INFO: 1,
    INTERESTS: 2,
    TRAVEL_HISTORY: 3,
    EDUCATION: 4,
    WORK_HISTORY: 5
  };
  
  // Sample transaction hashes
  const sampleTxHash1 = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  const sampleTxHash2 = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
  
  beforeEach(async function () {
    // Get signers
    [owner, viewer1, viewer2] = await ethers.getSigners();
    
    // Deploy contract
    const Registry = await ethers.getContractFactory("PersonalDataRegistry");
    registry = await Registry.deploy();
    await registry.waitForDeployment();
  });
  
  describe("Basic functionality", function () {
    it("Should allow uploading data", async function () {
      await registry.uploadData(CATEGORIES.PERSONAL_INFO, sampleTxHash1);
      
      const hasData = await registry.hasData(owner.address, CATEGORIES.PERSONAL_INFO);
      expect(hasData).to.be.true;
    });
    
    it("Should store multiple categories", async function () {
      await registry.uploadData(CATEGORIES.PERSONAL_INFO, sampleTxHash1);
      await registry.uploadData(CATEGORIES.INTERESTS, sampleTxHash2);
      
      const categories = await registry.getUserCategories(owner.address);
      expect(categories.length).to.equal(2);
      expect(Number(categories[0])).to.equal(CATEGORIES.PERSONAL_INFO);
      expect(Number(categories[1])).to.equal(CATEGORIES.INTERESTS);
    });
    
    it("Should update existing data", async function () {
      await registry.uploadData(CATEGORIES.PERSONAL_INFO, sampleTxHash1);
      await registry.uploadData(CATEGORIES.PERSONAL_INFO, sampleTxHash2);
      
      const dataHash = await registry.getDataHash(owner.address, CATEGORIES.PERSONAL_INFO);
      expect(dataHash).to.equal(sampleTxHash2);
    });
  });
  
  describe("Access control", function () {
    beforeEach(async function () {
      await registry.uploadData(CATEGORIES.PERSONAL_INFO, sampleTxHash1);
      await registry.uploadData(CATEGORIES.INTERESTS, sampleTxHash2);
    });
    
    it("Should allow owner to access their own data", async function () {
      const dataHash = await registry.getDataHash(owner.address, CATEGORIES.PERSONAL_INFO);
      expect(dataHash).to.equal(sampleTxHash1);
    });
    
    it("Should block unauthorized access", async function () {
      await expect(
        registry.connect(viewer1).getDataHash(owner.address, CATEGORIES.PERSONAL_INFO)
      ).to.be.revertedWith("Not authorized to view this data");
    });
    
    it("Should grant access to specific users", async function () {
      await registry.grantAccess(viewer1.address, CATEGORIES.PERSONAL_INFO);
      
      const isApproved = await registry.isApproved(
        owner.address, 
        viewer1.address, 
        CATEGORIES.PERSONAL_INFO
      );
      expect(isApproved).to.be.true;
      
      // Viewer1 should be able to access the data now
      const dataHash = await registry.connect(viewer1).getDataHash(
        owner.address, 
        CATEGORIES.PERSONAL_INFO
      );
      expect(dataHash).to.equal(sampleTxHash1);
      
      // But viewer2 should still be blocked
      await expect(
        registry.connect(viewer2).getDataHash(owner.address, CATEGORIES.PERSONAL_INFO)
      ).to.be.revertedWith("Not authorized to view this data");
    });
    
    it("Should revoke access", async function () {
      // Grant access
      await registry.grantAccess(viewer1.address, CATEGORIES.PERSONAL_INFO);
      
      // Verify access is granted
      let isApproved = await registry.isApproved(
        owner.address, 
        viewer1.address, 
        CATEGORIES.PERSONAL_INFO
      );
      expect(isApproved).to.be.true;
      
      // Revoke access
      await registry.revokeAccess(viewer1.address, CATEGORIES.PERSONAL_INFO);
      
      // Verify access is revoked
      isApproved = await registry.isApproved(
        owner.address, 
        viewer1.address, 
        CATEGORIES.PERSONAL_INFO
      );
      expect(isApproved).to.be.false;
      
      // Viewer1 should no longer be able to access the data
      await expect(
        registry.connect(viewer1).getDataHash(owner.address, CATEGORIES.PERSONAL_INFO)
      ).to.be.revertedWith("Not authorized to view this data");
    });
  });
}); 