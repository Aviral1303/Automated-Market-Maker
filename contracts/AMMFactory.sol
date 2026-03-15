// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AMM.sol";

/**
 * @title AMMFactory
 * @notice Deploys and tracks AMM pairs. Each token pair can have exactly one pool.
 *         The factory also manages the protocol fee recipient across all pools.
 */
contract AMMFactory is Ownable {
    // token0 => token1 => pair address (tokens sorted so token0 < token1)
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    address public feeTo;
    address public feeToSetter;

    event PairCreated(
        address indexed token0,
        address indexed token1,
        address pair,
        uint256 totalPairs
    );

    event FeeToUpdated(address indexed feeTo);
    event FeeToSetterUpdated(address indexed feeToSetter);

    constructor() Ownable(msg.sender) {
        feeToSetter = msg.sender;
    }

    // ─── Read ──────────────────────────────────────────────────────────────────

    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }

    // ─── Create pair ──────────────────────────────────────────────────────────

    /**
     * @notice Deploy a new AMM pool for (tokenA, tokenB).
     *         Tokens are stored sorted (token0 < token1) for canonical lookup.
     */
    function createPair(address tokenA, address tokenB)
        external
        returns (address pair)
    {
        require(tokenA != tokenB, "FACTORY: IDENTICAL_ADDRESSES");
        require(tokenA != address(0) && tokenB != address(0), "FACTORY: ZERO_ADDRESS");

        // Sort so canonical key is always (lower, higher)
        (address token0, address token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);

        require(getPair[token0][token1] == address(0), "FACTORY: PAIR_EXISTS");

        // Deploy a new AMM pool
        AMM amm = new AMM(token0, token1);
        pair = address(amm);

        // If a global feeTo is set, configure the new pool immediately
        if (feeTo != address(0)) {
            amm.setFeeTo(feeTo);
        }

        // Register
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // reverse lookup
        allPairs.push(pair);

        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    // ─── Fee management ───────────────────────────────────────────────────────

    function setFeeTo(address _feeTo) external {
        require(msg.sender == feeToSetter, "FACTORY: FORBIDDEN");
        feeTo = _feeTo;
        emit FeeToUpdated(_feeTo);
    }

    function setFeeToSetter(address _feeToSetter) external {
        require(msg.sender == feeToSetter, "FACTORY: FORBIDDEN");
        feeToSetter = _feeToSetter;
        emit FeeToSetterUpdated(_feeToSetter);
    }

    /**
     * @notice Propagate a new feeTo address to all deployed pools.
     *         Owner only — use after calling setFeeTo().
     */
    function syncFeeTo() external onlyOwner {
        for (uint256 i = 0; i < allPairs.length; i++) {
            AMM(allPairs[i]).setFeeTo(feeTo);
        }
    }
}
