from __future__ import annotations

import asyncio
import json
import os

import asyncpg

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://user:password@localhost:5432/legal_db")


async def main() -> None:
    conn = await asyncpg.connect(DATABASE_URL)
    await conn.execute("LISTEN doc_changes")

    print("Listening for doc_changes... Press Ctrl+C to stop.")

    async def handle_notification(connection, pid, channel, payload):
        print("Notification received:")
        print(json.dumps(json.loads(payload), ensure_ascii=False, indent=2))

    conn.add_listener("doc_changes", handle_notification)

    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        print("Stopping listener")
    finally:
        await conn.remove_listener("doc_changes", handle_notification)
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
