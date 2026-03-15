// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Flash loan recipient interface — borrowers must implement this
interface IFlashLoanRecipient {
    function receiveFlashLoan(
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external;
}

/**
 * @title AMM — Constant Product Automated Market Maker
 * @notice Implements x*y=k with 0.3% swap fee, TWAP oracle,
 *         flash loans, slippage/deadline protection, and
 *         an optional protocol fee switch.
 */
contract AMM is ReentrancyGuard, Ownable {
    // ─── Tokens ───────────────────────────────────────────────────────────────
    IERC20 public immutable tokenA;
    IERC20 public immutable tokenB;

    // ─── Reserves ─────────────────────────────────────────────────────────────
    uint256 public reserveA;
    uint256 public reserveB;

    // ─── LP Token ─────────────────────────────────────────────────────────────
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    uint256 private constant MINIMUM_LIQUIDITY = 1e3;

    // ─── Fee constants ────────────────────────────────────────────────────────
    uint256 private constant FEE_DENOMINATOR  = 10_000;
    uint256 private constant SWAP_FEE_BPS     = 30;   // 0.30 %
    uint256 private constant PROTOCOL_FEE_BPS = 5;    // 0.05 % of swap (when enabled)
    uint256 private constant FLASH_FEE_BPS    = 9;    // 0.09 % flash-loan premium

    // ─── Protocol fee ─────────────────────────────────────────────────────────
    address public feeTo;
    bool    public protocolFeeEnabled;
    uint256 public protocolFeesA;   // accrued but not yet claimed
    uint256 public protocolFeesB;

    // ─── TWAP oracle ──────────────────────────────────────────────────────────
    uint256 public price0CumulativeLast;   // sum of (reserveB/reserveA) * dt
    uint256 public price1CumulativeLast;   // sum of (reserveA/reserveB) * dt
    uint32  public blockTimestampLast;

    // ─── Events ───────────────────────────────────────────────────────────────
    event Swap(
        address indexed sender,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 priceImpactBps,
        address to
    );

    event AddLiquidity(
        address indexed sender,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity,
        uint256 totalSupply
    );

    event RemoveLiquidity(
        address indexed sender,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );

    event FlashLoan(
        address indexed recipient,
        address indexed token,
        uint256 amount,
        uint256 fee
    );

    event ProtocolFeeToggled(bool enabled);
    event FeeToUpdated(address feeTo);
    event ProtocolFeesCollected(address indexed to, uint256 amountA, uint256 amountB);
    event Sync(uint256 reserveA, uint256 reserveB);

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor(address _tokenA, address _tokenB) Ownable(msg.sender) {
        require(_tokenA != _tokenB, "AMM: IDENTICAL_ADDRESSES");
        require(_tokenA != address(0) && _tokenB != address(0), "AMM: ZERO_ADDRESS");
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }

    // ─── View helpers ─────────────────────────────────────────────────────────

    function getReserves()
        external
        view
        returns (uint256 _reserveA, uint256 _reserveB, uint32 _ts)
    {
        (_reserveA, _reserveB, _ts) = (reserveA, reserveB, blockTimestampLast);
    }

    /// @notice Spot price of tokenA denominated in tokenB (18-decimal fixed point)
    function getSpotPrice() external view returns (uint256) {
        require(reserveA > 0, "AMM: NO_LIQUIDITY");
        return (reserveB * 1e18) / reserveA;
    }

    /// @notice Pure constant-product output calculation
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        public
        pure
        returns (uint256 amountOut)
    {
        require(amountIn > 0, "AMM: INSUFFICIENT_INPUT");
        require(reserveIn > 0 && reserveOut > 0, "AMM: INSUFFICIENT_LIQUIDITY");
        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - SWAP_FEE_BPS);
        uint256 numerator       = amountInWithFee * reserveOut;
        uint256 denominator     = reserveIn * FEE_DENOMINATOR + amountInWithFee;
        amountOut = numerator / denominator;
    }

    /// @notice Price-impact of a swap in basis points
    function getPriceImpactBps(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        public
        pure
        returns (uint256)
    {
        uint256 amountOut  = getAmountOut(amountIn, reserveIn, reserveOut);
        uint256 spotOut    = (amountIn * reserveOut) / reserveIn; // no-fee reference
        if (spotOut == 0) return 0;
        return spotOut > amountOut ? ((spotOut - amountOut) * 10_000) / spotOut : 0;
    }

    // ─── Swap ──────────────────────────────────────────────────────────────────

    /// @notice Swap with slippage + deadline protection (recommended entry-point)
    function swapWithProtection(
        address tokenIn,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 deadline
    ) external nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "AMM: EXPIRED");
        amountOut = _swap(tokenIn, amountIn, msg.sender);
        require(amountOut >= minAmountOut, "AMM: SLIPPAGE_EXCEEDED");
    }

    /// @notice Basic swap (backward-compatible, no deadline/slippage guards)
    function swap(address tokenIn, uint256 amountIn)
        external
        nonReentrant
        returns (uint256 amountOut)
    {
        amountOut = _swap(tokenIn, amountIn, msg.sender);
    }

    function _swap(address tokenIn, uint256 amountIn, address to)
        internal
        returns (uint256 amountOut)
    {
        require(tokenIn == address(tokenA) || tokenIn == address(tokenB), "AMM: INVALID_TOKEN");

        bool    aToB       = tokenIn == address(tokenA);
        uint256 reserveIn  = aToB ? reserveA : reserveB;
        uint256 reserveOut = aToB ? reserveB : reserveA;

        amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
        require(amountOut > 0, "AMM: INSUFFICIENT_OUTPUT");

        uint256 impactBps = getPriceImpactBps(amountIn, reserveIn, reserveOut);

        // Pull tokens in
        require(IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn), "AMM: IN_TRANSFER_FAILED");

        // Optional protocol fee (deducted from amountOut)
        uint256 protocolFee;
        if (protocolFeeEnabled && feeTo != address(0)) {
            protocolFee = (amountOut * PROTOCOL_FEE_BPS) / FEE_DENOMINATOR;
            amountOut  -= protocolFee;
            if (aToB) protocolFeesB += protocolFee;
            else      protocolFeesA += protocolFee;
        }

        address tokenOut = aToB ? address(tokenB) : address(tokenA);
        require(IERC20(tokenOut).transfer(to, amountOut), "AMM: OUT_TRANSFER_FAILED");

        // Update reserves + TWAP
        uint256 newReserveA = aToB ? reserveA + amountIn : reserveA - amountOut - protocolFee;
        uint256 newReserveB = aToB ? reserveB - amountOut - protocolFee : reserveB + amountIn;
        _update(newReserveA, newReserveB);

        emit Swap(msg.sender, tokenIn, tokenOut, amountIn, amountOut, impactBps, to);
    }

    // ─── Liquidity ────────────────────────────────────────────────────────────

    function addLiquidity(uint256 amountADesired, uint256 amountBDesired)
        external
        nonReentrant
        returns (uint256 liquidity)
    {
        require(amountADesired > 0 && amountBDesired > 0, "AMM: INSUFFICIENT_INPUT");

        uint256 amountA;
        uint256 amountB;

        if (reserveA == 0 && reserveB == 0) {
            amountA   = amountADesired;
            amountB   = amountBDesired;
            liquidity = _sqrt(amountA * amountB) - MINIMUM_LIQUIDITY;
            _mint(address(0), MINIMUM_LIQUIDITY);
        } else {
            uint256 amountBOptimal = (amountADesired * reserveB) / reserveA;
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= 1, "AMM: INSUFFICIENT_B");
                amountA = amountADesired;
                amountB = amountBOptimal;
            } else {
                uint256 amountAOptimal = (amountBDesired * reserveA) / reserveB;
                assert(amountAOptimal <= amountADesired);
                require(amountAOptimal >= 1, "AMM: INSUFFICIENT_A");
                amountA = amountAOptimal;
                amountB = amountBDesired;
            }
            liquidity = (amountA * totalSupply) / reserveA;
        }

        require(liquidity > 0, "AMM: ZERO_LIQUIDITY_MINTED");

        require(tokenA.transferFrom(msg.sender, address(this), amountA), "AMM: TRANSFER_A_FAILED");
        require(tokenB.transferFrom(msg.sender, address(this), amountB), "AMM: TRANSFER_B_FAILED");

        _mint(msg.sender, liquidity);
        _update(reserveA + amountA, reserveB + amountB);

        emit AddLiquidity(msg.sender, amountA, amountB, liquidity, totalSupply);
    }

    function removeLiquidity(uint256 liquidity)
        external
        nonReentrant
        returns (uint256 amountA, uint256 amountB)
    {
        require(liquidity > 0, "AMM: ZERO_LIQUIDITY");
        require(balanceOf[msg.sender] >= liquidity, "AMM: INSUFFICIENT_LP_BALANCE");

        amountA = (liquidity * reserveA) / totalSupply;
        amountB = (liquidity * reserveB) / totalSupply;
        require(amountA > 0 && amountB > 0, "AMM: INSUFFICIENT_LIQUIDITY_BURNED");

        _burn(msg.sender, liquidity);
        _update(reserveA - amountA, reserveB - amountB);

        require(tokenA.transfer(msg.sender, amountA), "AMM: TRANSFER_A_FAILED");
        require(tokenB.transfer(msg.sender, amountB), "AMM: TRANSFER_B_FAILED");

        emit RemoveLiquidity(msg.sender, amountA, amountB, liquidity);
    }

    // ─── Flash Loans ──────────────────────────────────────────────────────────

    /**
     * @notice Borrow any token held by the pool for one transaction.
     *         Borrower must implement IFlashLoanRecipient and repay amount + fee.
     * @param recipient  Contract that receives tokens and handles the loan
     * @param token      Address of tokenA or tokenB to borrow
     * @param amount     Amount to borrow (in token's decimals)
     * @param data       Arbitrary data forwarded to the recipient
     */
    function flashLoan(
        IFlashLoanRecipient recipient,
        address token,
        uint256 amount,
        bytes calldata data
    ) external nonReentrant {
        require(token == address(tokenA) || token == address(tokenB), "AMM: INVALID_TOKEN");
        require(amount > 0, "AMM: ZERO_AMOUNT");

        IERC20 loanToken    = IERC20(token);
        uint256 balBefore   = loanToken.balanceOf(address(this));
        require(balBefore >= amount, "AMM: INSUFFICIENT_POOL_BALANCE");

        uint256 fee         = (amount * FLASH_FEE_BPS) / FEE_DENOMINATOR;

        // Disburse
        require(loanToken.transfer(address(recipient), amount), "AMM: LOAN_TRANSFER_FAILED");

        // Callback — borrower executes arbitrage/liquidation here
        recipient.receiveFlashLoan(token, amount, fee, data);

        // Verify repayment
        uint256 balAfter = loanToken.balanceOf(address(this));
        require(balAfter >= balBefore + fee, "AMM: FLASH_REPAY_FAILED");

        // Credit the fee to the pool (increases k)
        if (token == address(tokenA)) {
            _update(balAfter, reserveB);
        } else {
            _update(reserveA, balAfter);
        }

        emit FlashLoan(address(recipient), token, amount, fee);
    }

    // ─── Sync ─────────────────────────────────────────────────────────────────

    /// @notice Force reserves to match actual ERC20 balances (rescue donated tokens)
    function sync() external nonReentrant {
        _update(tokenA.balanceOf(address(this)), tokenB.balanceOf(address(this)));
    }

    // ─── Protocol fee management ──────────────────────────────────────────────

    function setFeeTo(address _feeTo) external onlyOwner {
        feeTo = _feeTo;
        emit FeeToUpdated(_feeTo);
    }

    function setProtocolFeeEnabled(bool _enabled) external onlyOwner {
        protocolFeeEnabled = _enabled;
        emit ProtocolFeeToggled(_enabled);
    }

    function collectProtocolFees() external {
        require(feeTo != address(0), "AMM: NO_FEE_RECIPIENT");
        uint256 fA = protocolFeesA;
        uint256 fB = protocolFeesB;
        protocolFeesA = 0;
        protocolFeesB = 0;
        if (fA > 0) require(tokenA.transfer(feeTo, fA), "AMM: COLLECT_A_FAILED");
        if (fB > 0) require(tokenB.transfer(feeTo, fB), "AMM: COLLECT_B_FAILED");
        emit ProtocolFeesCollected(feeTo, fA, fB);
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    /// @dev Update reserves and TWAP price accumulators
    function _update(uint256 newReserveA, uint256 newReserveB) internal {
        require(newReserveA <= type(uint256).max && newReserveB <= type(uint256).max, "AMM: OVERFLOW");

        uint32 blockTimestamp = uint32(block.timestamp % 2**32);
        uint32 elapsed        = blockTimestamp - blockTimestampLast;

        if (elapsed > 0 && reserveA > 0 && reserveB > 0) {
            // UQ112x112-style fixed-point accumulation
            price0CumulativeLast += (reserveB * 1e18 / reserveA) * elapsed;
            price1CumulativeLast += (reserveA * 1e18 / reserveB) * elapsed;
        }

        reserveA           = newReserveA;
        reserveB           = newReserveB;
        blockTimestampLast = blockTimestamp;

        emit Sync(reserveA, reserveB);
    }

    function _mint(address to, uint256 amount) internal {
        balanceOf[to] += amount;
        totalSupply    += amount;
    }

    function _burn(address from, uint256 amount) internal {
        require(balanceOf[from] >= amount, "AMM: BURN_EXCEEDS_BALANCE");
        balanceOf[from] -= amount;
        totalSupply      -= amount;
    }

    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) { z = x; x = (y / x + x) / 2; }
        } else if (y != 0) {
            z = 1;
        }
    }
}
