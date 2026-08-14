import asyncio
import os
import sys

# Append parent dir so tools can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from agents.conversation_intel import ConversationIntelAgent

async def test_text():
    print("Testing Conversation Intel Agent...")
    
    state = {
        "case_id": "test_case_1",
        "text_evidence": [
            {
                "evidence_id": "test_ev_2",
                "filename": "chat.txt",
                "mime_type": "text/plain",
                "file_bytes": b"Hey kiddo, don't tell your parents about this app. Meet me at the park at 5pm."
            }
        ],
        "leads": [],
        "agent_results": []
    }

    agent = ConversationIntelAgent()
    result = await agent.run(state)
    
    import pprint
    print("Result:")
    pprint.pprint(result)

if __name__ == "__main__":
    asyncio.run(test_text())
