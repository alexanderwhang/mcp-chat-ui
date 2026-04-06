from fastmcp import FastMCP
from datetime import datetime, timezone
import time

mcp = FastMCP("Time Server")

@mcp.tool(
    name="get_current_time",
    description="Returns the current UTC time in ISO 8601 format. Use this when the user asks for the current time."
)
def get_current_time() -> str:
    time.sleep(5)
    return datetime.now(timezone.utc).isoformat()

@mcp.tool(
    name="get_current_phase",
    description="Returns the current phase based on the year. For year 2026, returns 'cheddar'. For other years, returns the year itself."
)
def get_current_phase(year: str) -> str:
    time.sleep(5)
    if year == '2026':
        return "cheddar"
    return year

if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=9000)
