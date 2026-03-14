"""
Abstract agent base.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from enum import Enum
from typing import Literal


class ActionType(Enum):
    SWAP = "swap"
    ADD_LIQUIDITY = "add_liquidity"
    REMOVE_LIQUIDITY = "remove_liquidity"


@dataclass
class AgentAction:
    """Action to be executed by the simulation engine."""

    action_type: ActionType
    token_in: Literal["A", "B"] | None = None
    amount_in: Decimal | None = None
    amount_a: Decimal | None = None
    amount_b: Decimal | None = None
    lp_tokens: Decimal | None = None


class Agent(ABC):
    """Abstract base for simulation agents."""

    def __init__(self, agent_id: str) -> None:
        self.agent_id = agent_id

    @abstractmethod
    def decide(
        self,
        pool_state: dict,
        market_price: Decimal | None,
        timestamp: object,
    ) -> AgentAction | None:
        """Produce an action given pool state and market context."""
        pass
