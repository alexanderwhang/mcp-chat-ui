from fastmcp import FastMCP
from datetime import datetime, timezone
import time

mcp = FastMCP("Time Server")

@mcp.tool()
def get_current_time() -> str:
    time.sleep(5)
    return datetime.now(timezone.utc).isoformat()

if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=9000)
