"""
AMM Research Engine - Trading Simulation

Agents: retail, arbitrageur, LP
Engine: time-step simulation with pool state updates
"""

from .engine import SimulationEngine
from .pool_state import SimulatedPool

__all__ = ["SimulationEngine", "SimulatedPool"]
