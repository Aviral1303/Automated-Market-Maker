"""
Simulation engine: runs time-step simulations with agents.
"""

from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Any

from .agents import Agent
from .pool_state import SimulatedPool


@dataclass
class SimulationEvent:
    """Record of an event during simulation."""

    timestamp: datetime
    agent_id: str
    action_type: str
    details: dict
    success: bool


@dataclass
class SimulationResult:
    """Result of a simulation run."""

    events: list[SimulationEvent] = field(default_factory=list)
    final_reserves: tuple[Decimal, Decimal] = (Decimal("0"), Decimal("0"))
    total_volume: Decimal = Decimal("0")
    total_fees: Decimal = Decimal("0")


class SimulationEngine:
    """
    Orchestrates simulation: updates pool, runs agents, records events.
    """

    def __init__(
        self,
        pool: SimulatedPool,
        agents: list[Agent],
    ) -> None:
        self.pool = pool
        self.agents = agents
        self.events: list[SimulationEvent] = []
        self.total_volume = Decimal("0")
        self.total_fees = Decimal("0")

    def _get_pool_state(self) -> dict:
        r_a, r_b = self.pool.get_reserves()
        return {
            "reserve_a": r_a,
            "reserve_b": r_b,
            "price_a_in_b": float(self.pool.get_price("A")),
        }

    def step(
        self,
        timestamp: datetime,
        market_price: Decimal | None = None,
    ) -> list[SimulationEvent]:
        """Run one simulation step: each agent decides, actions executed."""
        step_events: list[SimulationEvent] = []
        pool_state = self._get_pool_state()

        for agent in self.agents:
            action = agent.decide(pool_state, market_price, timestamp)
            if action is None:
                continue

            try:
                if action.action_type.value == "swap":
                    if action.token_in and action.amount_in:
                        result = self.pool.swap(action.token_in, action.amount_in)
                        self.total_volume += action.amount_in
                        self.total_fees += result.fee_paid
                        step_events.append(
                            SimulationEvent(
                                timestamp=timestamp,
                                agent_id=agent.agent_id,
                                action_type="swap",
                                details={
                                    "token_in": action.token_in,
                                    "amount_in": str(action.amount_in),
                                    "amount_out": str(result.amount_out),
                                },
                                success=True,
                            )
                        )
                elif action.action_type.value == "add_liquidity":
                    if action.amount_a is not None and action.amount_b is not None:
                        result = self.pool.add_liquidity(
                            action.amount_a, action.amount_b
                        )
                        if hasattr(agent, "set_lp_tokens"):
                            agent.set_lp_tokens(result.lp_tokens_minted)
                        step_events.append(
                            SimulationEvent(
                                timestamp=timestamp,
                                agent_id=agent.agent_id,
                                action_type="add_liquidity",
                                details={
                                    "amount_a": str(action.amount_a),
                                    "amount_b": str(action.amount_b),
                                    "lp_minted": str(result.lp_tokens_minted),
                                },
                                success=True,
                            )
                        )
                elif action.action_type.value == "remove_liquidity":
                    if action.lp_tokens:
                        result = self.pool.remove_liquidity(action.lp_tokens)
                        step_events.append(
                            SimulationEvent(
                                timestamp=timestamp,
                                agent_id=agent.agent_id,
                                action_type="remove_liquidity",
                                details={
                                    "lp_burned": str(action.lp_tokens),
                                    "amount_a": str(result.amount_a),
                                    "amount_b": str(result.amount_b),
                                },
                                success=True,
                            )
                        )
            except Exception as e:
                step_events.append(
                    SimulationEvent(
                        timestamp=timestamp,
                        agent_id=agent.agent_id,
                        action_type=action.action_type.value,
                        details={"error": str(e)},
                        success=False,
                    )
                )

        self.events.extend(step_events)
        return step_events

    def run(
        self,
        price_series: list[tuple[datetime, Decimal | float]],
    ) -> SimulationResult:
        """
        Run simulation over a price series.
        price_series: [(timestamp, market_price), ...]
        """
        self.events = []
        self.total_volume = Decimal("0")
        self.total_fees = Decimal("0")

        for ts, price in price_series:
            self.step(ts, Decimal(str(price)))

        return SimulationResult(
            events=self.events,
            final_reserves=self.pool.get_reserves(),
            total_volume=self.total_volume,
            total_fees=self.total_fees,
        )
