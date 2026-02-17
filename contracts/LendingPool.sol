// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MockUSDC.sol";
import "./PriceOracle.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract LendingPool is ReentrancyGuard {

    MockUSDC public token;
    PriceOracle public oracle;

    uint256 public constant LTV = 70; 
    uint256 public constant LIQ_THRESHOLD = 80; 
    uint256 public constant LIQ_BONUS = 5;

    mapping(address => uint256) public collateral;
    mapping(address => uint256) public borrowed;

    constructor(address _token, address _oracle) {
        token = MockUSDC(_token);
        oracle = PriceOracle(_oracle);
    }

    function deposit() external payable {
        require(msg.value > 0, "Invalid deposit");
        collateral[msg.sender] += msg.value;
    }

    function borrow(uint256 amount) external nonReentrant {

        require(amount > 0, "Invalid amount");

        uint256 price = oracle.getPrice();
        uint256 collateralValue = (collateral[msg.sender] * price) / 1e18;

        uint256 maxBorrow = (collateralValue * LTV) / 100;

        require(
            borrowed[msg.sender] + amount <= maxBorrow,
            "Exceeds borrow limit"
        );

        borrowed[msg.sender] += amount;
        token.transfer(msg.sender, amount);
    }

    function repay(uint256 amount) external nonReentrant {

        require(amount > 0, "Invalid repay");

        token.transferFrom(msg.sender, address(this), amount);
        borrowed[msg.sender] -= amount;
    }

    function getHealthFactor(address user) public view returns (uint256) {

        if (borrowed[user] == 0) return type(uint256).max;

        uint256 price = oracle.getPrice();
        uint256 collateralValue = (collateral[user] * price) / 1e18;

        uint256 adjustedCollateral = (collateralValue * LIQ_THRESHOLD) / 100;

        return (adjustedCollateral * 1e18) / borrowed[user];
    }

    function liquidate(address user) external nonReentrant {

        require(getHealthFactor(user) < 1e18, "User healthy");

        uint256 debt = borrowed[user];
        require(debt > 0, "No debt");

        uint256 price = oracle.getPrice();

        token.transferFrom(msg.sender, address(this), debt);

        uint256 collateralEquivalent = (debt * 1e18) / price;
        uint256 collateralToSeize = (collateralEquivalent * (100 + LIQ_BONUS)) / 100;

        if (collateralToSeize > collateral[user]) {
            collateralToSeize = collateral[user];
        }

        collateral[user] -= collateralToSeize;
        borrowed[user] = 0;

        payable(msg.sender).transfer(collateralToSeize);
    }
}
