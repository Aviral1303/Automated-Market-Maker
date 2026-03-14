"""
The Graph - On-chain AMM pool data (Uniswap V2/V3, etc.).

Requires: pip install gql[aio]
"""

from datetime import datetime
from typing import Any

from .base import PoolReserves


class TheGraphDataProvider:
    """
    Fetch Uniswap V2 pool reserves from The Graph.

    Subgraph: https://thegraph.com/hosted-service/subgraph/uniswap/uniswap-v2
    """

    UNISWAP_V2_URL = "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2"

    def __init__(self, subgraph_url: str | None = None) -> None:
        self.subgraph_url = subgraph_url or self.UNISWAP_V2_URL

    def get_pool_reserves(
        self,
        pool_address: str,
        token_a: str = "token0",
        token_b: str = "token1",
    ) -> PoolReserves | None:
        """Fetch current pool reserves from The Graph."""
        try:
            from gql import gql, Client
            from gql.transport.requests import RequestsHTTPTransport

            transport = RequestsHTTPTransport(url=self.subgraph_url)
            client = Client(transport=transport, fetch_schema_from_transport=False)

            query = gql(
                """
                query getPair($id: ID!) {
                    pair(id: $id) {
                        id
                        token0 { symbol }
                        token1 { symbol }
                        reserve0
                        reserve1
                    }
                }
                """
            )
            result = client.execute(
                query,
                variable_values={"id": pool_address.lower()},
            )
            pair = result.get("pair")
            if not pair:
                return None

            return PoolReserves(
                pool_id=pool_address,
                token_a=pair.get("token0", {}).get("symbol", "token0"),
                token_b=pair.get("token1", {}).get("symbol", "token1"),
                reserve_a=float(pair.get("reserve0", 0)),
                reserve_b=float(pair.get("reserve1", 0)),
                timestamp=datetime.utcnow(),
            )
        except ImportError:
            return None
        except Exception:
            return None
