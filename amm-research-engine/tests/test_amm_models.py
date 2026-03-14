"""Tests for AMM core models."""

import pytest
from decimal import Decimal

from core import ConstantProductAMM, ConstantSumAMM, BalancerAMM


def test_constant_product_swap():
    amm = ConstantProductAMM(0, 0, fee_bps=30)
    amm.add_liquidity(10000, 10000)
    r = amm.swap("A", 100)
    assert r.amount_out > 0
    assert r.amount_out < 100
    assert amm.reserve_a == 10100
    assert amm.reserve_b == 10000 - r.amount_out


def test_constant_product_symmetry():
    amm = ConstantProductAMM(0, 0, fee_bps=30)
    amm.add_liquidity(10000, 10000)
    r1 = amm.swap("A", 100)
    r2 = amm.swap("B", r1.amount_out)
    assert r2.amount_out < 100  # Fee loss on round-trip


def test_constant_sum():
    amm = ConstantSumAMM(1000, 1000, fee_bps=0)
    amm.add_liquidity(1000, 1000)
    r = amm.swap("A", 100)
    assert r.amount_out == 100


def test_balancer():
    amm = BalancerAMM(800, 200, weight_a=0.8, weight_b=0.2)
    amm.add_liquidity(800, 200)
    r = amm.swap("A", 100)
    assert r.amount_out > 0
