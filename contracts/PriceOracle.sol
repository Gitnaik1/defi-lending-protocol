// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract PriceOracle is Ownable {

    uint256 private ethPrice; // USD price with 18 decimals

    constructor() Ownable(msg.sender) {}

    function setPrice(uint256 _price) external onlyOwner {
        ethPrice = _price;
    }

    function getPrice() external view returns (uint256) {
        return ethPrice;
    }
}
