const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DeFi Lending Protocol", function () {

  let token, oracle, pool;
  let owner, borrower, liquidator;

  beforeEach(async function () {

    [owner, borrower, liquidator] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    token = await MockUSDC.deploy();
    await token.waitForDeployment();

    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    oracle = await PriceOracle.deploy();
    await oracle.waitForDeployment();

    const LendingPool = await ethers.getContractFactory("LendingPool");
    pool = await LendingPool.deploy(
      await token.getAddress(),
      await oracle.getAddress()
    );
    await pool.waitForDeployment();

    await oracle.setPrice(ethers.parseEther("2000"));
    await token.mint(await pool.getAddress(), ethers.parseEther("1000000"));
  });

  it("Should allow deposit of ETH", async function () {
    await pool.connect(borrower).deposit({ value: ethers.parseEther("1") });
    const collateral = await pool.collateral(borrower.address);
    expect(collateral).to.equal(ethers.parseEther("1"));
  });

  it("Should allow borrowing within LTV", async function () {
    await pool.connect(borrower).deposit({ value: ethers.parseEther("1") });
    await pool.connect(borrower).borrow(ethers.parseEther("1000"));
    const debt = await pool.borrowed(borrower.address);
    expect(debt).to.equal(ethers.parseEther("1000"));
  });

  it("Should prevent borrowing beyond LTV", async function () {
    await pool.connect(borrower).deposit({ value: ethers.parseEther("1") });
    await expect(
      pool.connect(borrower).borrow(ethers.parseEther("2000"))
    ).to.be.revertedWith("Exceeds borrow limit");
  });

  it("Should calculate correct health factor", async function () {
    await pool.connect(borrower).deposit({ value: ethers.parseEther("1") });
    await pool.connect(borrower).borrow(ethers.parseEther("1000"));
    const hf = await pool.getHealthFactor(borrower.address);
    expect(hf).to.equal(ethers.parseEther("1.6"));
  });

  it("Should allow liquidation when health factor < 1", async function () {
    await pool.connect(borrower).deposit({ value: ethers.parseEther("1") });
    await pool.connect(borrower).borrow(ethers.parseEther("1000"));
    await oracle.setPrice(ethers.parseEther("1000"));

    await token.transfer(liquidator.address, ethers.parseEther("1000"));
    await token.connect(liquidator).approve(
      await pool.getAddress(),
      ethers.parseEther("1000")
    );

    await pool.connect(liquidator).liquidate(borrower.address);

    const debt = await pool.borrowed(borrower.address);
    expect(debt).to.equal(0);
  });

  it("Should allow repayment of debt", async function () {
    await pool.connect(borrower).deposit({ value: ethers.parseEther("1") });
    await pool.connect(borrower).borrow(ethers.parseEther("500"));

    await token.connect(borrower).approve(
      await pool.getAddress(),
      ethers.parseEther("500")
    );

    await pool.connect(borrower).repay(ethers.parseEther("500"));

    const debt = await pool.borrowed(borrower.address);
    expect(debt).to.equal(0);
  });

  it("Should not allow liquidation if user is healthy", async function () {
    await pool.connect(borrower).deposit({ value: ethers.parseEther("1") });
    await pool.connect(borrower).borrow(ethers.parseEther("500"));

    await expect(
      pool.connect(liquidator).liquidate(borrower.address)
    ).to.be.revertedWith("User healthy");
  });

  it("Health factor should be max when no debt", async function () {
    await pool.connect(borrower).deposit({ value: ethers.parseEther("1")};
    const hf = await pool.getHealthFactor(borrower.address);
    expect(hf).to.equal(
      "115792089237316195423570985008687907853269984665640564039457584007913129639935"
    );
  });

});
