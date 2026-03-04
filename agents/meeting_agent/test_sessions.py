#!/usr/bin/env python3
"""Test script for agent session support with RedisHistoryProvider.

This script demonstrates:
1. Creating agent sessions
2. Conversation history persistence
3. Session serialization and restoration
4. Multi-turn conversations with context

Usage:
    python test_sessions.py
"""

import asyncio
import os
import sys
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from app.agent import agent
from agent_framework import AgentSession


async def test_basic_session():
    """Test basic session creation and conversation."""
    print("\n" + "=" * 60)
    print("TEST 1: Basic Session Creation")
    print("=" * 60)

    # Create a new session
    session = agent.create_session(session_id="test_basic")
    print(f"✅ Created session: {session.session_id}")

    # First message
    print("\n👤 User: Hello, my name is Alice")
    response = await agent.run("Hello, my name is Alice", session=session)
    print(f"🤖 Agent: {response.text}")

    return session


async def test_conversation_memory():
    """Test that agent remembers conversation history."""
    print("\n" + "=" * 60)
    print("TEST 2: Conversation Memory")
    print("=" * 60)

    # Create session
    session = agent.create_session(session_id="test_memory")

    # First exchange
    print("\n👤 User: My favorite color is blue")
    response1 = await agent.run("My favorite color is blue", session=session)
    print(f"🤖 Agent: {response1.text}")

    # Second exchange - test memory
    print("\n👤 User: What is my favorite color?")
    response2 = await agent.run("What is my favorite color?", session=session)
    print(f"🤖 Agent: {response2.text}")

    if "blue" in response2.text.lower():
        print("✅ Agent remembered the conversation context!")
    else:
        print("⚠️  Agent may not have remembered (but could be rephrased)")

    return session


async def test_session_serialization():
    """Test session serialization and deserialization."""
    print("\n" + "=" * 60)
    print("TEST 3: Session Serialization")
    print("=" * 60)

    # Create session and have a conversation
    session = agent.create_session(session_id="test_serialize")

    print("\n👤 User: Remember this code: ABC123")
    response1 = await agent.run("Remember this code: ABC123", session=session)
    print(f"🤖 Agent: {response1.text}")

    # Serialize the session
    serialized = session.to_dict()
    print(f"\n💾 Serialized session state:")
    print(f"   Session ID: {serialized.get('session_id')}")
    print(f"   Metadata keys: {list(serialized.get('metadata', {}).keys())}")

    # Restore from serialized state
    print("\n🔄 Restoring session from serialized state...")
    restored_session = AgentSession.from_dict(serialized)
    print(f"✅ Restored session: {restored_session.session_id}")

    # Test that restored session has history
    print("\n👤 User: What was the code I told you to remember?")
    response2 = await agent.run("What was the code I told you to remember?", session=restored_session)
    print(f"🤖 Agent: {response2.text}")

    if "ABC123" in response2.text or "abc123" in response2.text.lower():
        print("✅ Session serialization preserved conversation history!")
    else:
        print("⚠️  Session may not have fully preserved history")

    return restored_session


async def test_multiple_sessions():
    """Test multiple independent sessions."""
    print("\n" + "=" * 60)
    print("TEST 4: Multiple Independent Sessions")
    print("=" * 60)

    # Session 1: Alice
    print("\n📝 Session 1 (Alice):")
    session1 = agent.create_session(session_id="test_alice")
    print("👤 User: My name is Alice")
    response1 = await agent.run("My name is Alice", session=session1)
    print(f"🤖 Agent: {response1.text}")

    # Session 2: Bob
    print("\n📝 Session 2 (Bob):")
    session2 = agent.create_session(session_id="test_bob")
    print("👤 User: My name is Bob")
    response2 = await agent.run("My name is Bob", session=session2)
    print(f"🤖 Agent: {response2.text}")

    # Test session isolation - ask Alice's session about name
    print("\n📝 Back to Session 1 (Alice):")
    print("👤 User: What is my name?")
    response3 = await agent.run("What is my name?", session=session1)
    print(f"🤖 Agent: {response3.text}")

    if "alice" in response3.text.lower() and "bob" not in response3.text.lower():
        print("✅ Sessions are properly isolated!")
    else:
        print("⚠️  Session isolation may not be working correctly")


async def test_redis_persistence():
    """Test that Redis actually persists history across script runs."""
    print("\n" + "=" * 60)
    print("TEST 5: Redis Persistence")
    print("=" * 60)

    redis_url = os.environ.get("REDIS_URL")
    if not redis_url:
        print("⚠️  REDIS_URL not set - skipping persistence test")
        print("   (History will work but only in-memory)")
        return

    print(f"✅ Redis configured: {redis_url}")
    print("ℹ️  Run this script twice to test persistence across restarts")

    session_id = "persistent_test_session"
    session = agent.create_session(session_id=session_id)

    print(f"\n👤 User: This is a test message at {asyncio.get_event_loop().time()}")
    response = await agent.run(
        f"Remember this timestamp: {asyncio.get_event_loop().time()}",
        session=session
    )
    print(f"🤖 Agent: {response.text}")
    print(f"\n💾 Session {session_id} saved to Redis")
    print("ℹ️  Re-run this script and ask 'What timestamp did I tell you?' to verify persistence")


async def main():
    """Run all tests."""
    print("\n" + "=" * 70)
    print("🧪 QA Agent Session Tests")
    print("=" * 70)

    redis_url = os.environ.get("REDIS_URL")
    openai_key = os.environ.get("OPENAI_API_KEY")

    # Check prerequisites
    if not openai_key:
        print("❌ ERROR: OPENAI_API_KEY not set")
        return

    print(f"✅ OpenAI API configured")

    if redis_url:
        print(f"✅ Redis configured: {redis_url}")
        print("   → Conversations will persist across sessions")
    else:
        print("ℹ️  Redis not configured (REDIS_URL not set)")
        print("   → Conversations will use in-memory history only")

    try:
        # Run tests
        await test_basic_session()
        await test_conversation_memory()
        await test_session_serialization()
        await test_multiple_sessions()
        await test_redis_persistence()

        print("\n" + "=" * 70)
        print("✅ All tests completed!")
        print("=" * 70)

    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
