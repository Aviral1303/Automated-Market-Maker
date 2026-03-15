/**
 * Seed liquidity into already-deployed Sepolia contracts.
 * Run: npx hardhat run scripts/seed.js --network sepolia
 */
const hre = require('hardhat');
const fs  = require('fs');
const path = require('path');

// ── Deployed contract addresses (from deploy run) ──────────────────────────
const ADDRESSES = {
  TKA:     '0xA04EA0d7f5eD2a519D49BfCEA17CEE9F686d0Dd9',
  TKB:     '0x7d242620F245C8320D1867E90Fa2d1E2686C7045',
  USDC:    '0xFa28385f024d7a70d3FbC8c2f7bedc21496a3a31',
  Factory: '0xB4e66c99041f73d38139cc697c85673a2f773606',
  AMM_TKA_TKB:  '0xB138d15Dd1f372C9736af9Df885D40450f8F072d',
  AMM_TKA_USDC: '0xcE1D80bf144ff848F05B25C753C981aBFC8c4B9b',
};

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`\nSeeding liquidity on Sepolia`);
  console.log(`Deployer: ${deployer.address}`);
  const bal = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Balance:  ${hre.ethers.formatEther(bal)} ETH\n`);

  const TestToken = await hre.ethers.getContractFactory('TestToken');
  const AMM       = await hre.ethers.getContractFactory('AMM');

  const tokenA = TestToken.attach(ADDRESSES.TKA);
  const tokenB = TestToken.attach(ADDRESSES.TKB);
  const tokenC = TestToken.attach(ADDRESSES.USDC);
  const pairAB = AMM.attach(ADDRESSES.AMM_TKA_TKB);
  const pairAC = AMM.attach(ADDRESSES.AMM_TKA_USDC);

  // ── Mint enough tokens ────────────────────────────────────────────────────
  // TKA/TKB pool needs 100k each
  // TKA/USDC pool needs 3,300 TKA + 9,900,000 USDC → price ~3000 USDC/TKA
  const mintAmt = hre.ethers.parseEther('10000000'); // 10M each (enough headroom)
  console.log('Minting tokens to deployer...');
  await (await tokenA.mint(deployer.address, mintAmt)).wait();
  await (await tokenB.mint(deployer.address, mintAmt)).wait();
  await (await tokenC.mint(deployer.address, mintAmt)).wait();
  console.log('  ✓ Minted 10M TKA, TKB, USDC');

  // ── TKA/TKB pool: 100k : 100k (price = 1.0) ──────────────────────────────
  const liqA = hre.ethers.parseEther('100000');
  const liqB = hre.ethers.parseEther('100000');
  console.log('\nAdding TKA/TKB liquidity (100,000 each)...');
  await (await tokenA.approve(ADDRESSES.AMM_TKA_TKB, liqA)).wait();
  await (await tokenB.approve(ADDRESSES.AMM_TKA_TKB, liqB)).wait();
  await (await pairAB.addLiquidity(liqA, liqB)).wait();
  console.log('  ✓ TKA/TKB seeded');

  // ── TKA/USDC pool: 3,300 TKA : 9,900,000 USDC (price = 3000 USDC/TKA) ───
  const liqTKA  = hre.ethers.parseEther('3300');
  const liqUSDC = hre.ethers.parseEther('9900000');
  console.log('\nAdding TKA/USDC liquidity (3,300 TKA : 9,900,000 USDC @ $3000)...');
  await (await tokenA.approve(ADDRESSES.AMM_TKA_USDC, liqTKA)).wait();
  await (await tokenC.approve(ADDRESSES.AMM_TKA_USDC, liqUSDC)).wait();
  await (await pairAC.addLiquidity(liqTKA, liqUSDC)).wait();
  console.log('  ✓ TKA/USDC seeded');

  // ── Verify reserves ───────────────────────────────────────────────────────
  const [rA1, rB1] = await pairAB.getReserves();
  const [rA2, rC2] = await pairAC.getReserves();
  console.log('\nPool reserves:');
  console.log(`  TKA/TKB:  ${hre.ethers.formatEther(rA1)} TKA / ${hre.ethers.formatEther(rB1)} TKB`);
  console.log(`  TKA/USDC: ${hre.ethers.formatEther(rA2)} TKA / ${hre.ethers.formatEther(rC2)} USDC`);
  console.log(`  TKA/USDC price: ${(parseFloat(hre.ethers.formatEther(rC2)) / parseFloat(hre.ethers.formatEther(rA2))).toFixed(2)} USDC/TKA`);

  // ── Write contracts.json for frontend ─────────────────────────────────────
  const network = await hre.ethers.provider.getNetwork();
  const deployed = {
    network: 'sepolia',
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contracts: {
      AMMFactory:    ADDRESSES.Factory,
      AMM_TKA_TKB:   ADDRESSES.AMM_TKA_TKB,
      AMM_TKA_USDC:  ADDRESSES.AMM_TKA_USDC,
      TokenAlpha:    ADDRESSES.TKA,
      TokenBeta:     ADDRESSES.TKB,
      USDC:          ADDRESSES.USDC,
    },
  };

  const outDir  = path.join(__dirname, '../src/config');
  const outPath = path.join(outDir, 'contracts.json');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(deployed, null, 2));

  // Also copy to frontend/public for the useOnChainAMM hook
  const pubDir  = path.join(__dirname, '../frontend/public');
  fs.mkdirSync(pubDir, { recursive: true });
  fs.writeFileSync(path.join(pubDir, 'contracts.json'), JSON.stringify(deployed, null, 2));

  console.log(`\n  ✓ contracts.json written to src/config/ and frontend/public/`);

  console.log('\n' + '='.repeat(50));
  console.log('Deployment complete!');
  console.log('='.repeat(50));
  Object.entries(ADDRESSES).forEach(([k, v]) => console.log(`  ${k.padEnd(14)} ${v}`));
  console.log('\nEtherscan links:');
  Object.entries(ADDRESSES).forEach(([k, v]) =>
    console.log(`  ${k.padEnd(14)} https://sepolia.etherscan.io/address/${v}`)
  );
  console.log('\n🎉 Done! Run: npm run dev\n');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
