from fastmcp import FastMCP
from datetime import datetime, timezone
import time

mcp = FastMCP("Time Server")

@mcp.tool(
    name="get_current_time",
)
def get_current_time() -> str:
    time.sleep(2)
    return datetime.now(timezone.utc).isoformat()

@mcp.tool(
    name="fetch_document",
    description="fetch document based on year"
)
def fetch_document(year: str) -> str:
    time.sleep(2)
    if year == '2026':
        return "this documnent is about water"
    return "generative ai"

if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=9000)
