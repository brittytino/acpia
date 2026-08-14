import asyncio
import os
import sys

# Append parent dir so tools can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from agents.multimedia_analyst import MultimediaAnalystAgent
from PIL import Image, ImageDraw

def create_sample_image(path):
    img = Image.new('RGB', (200, 200), color = (73, 109, 137))
    d = ImageDraw.Draw(img)
    d.text((10,10), "Test Image for Analysis", fill=(255,255,0))
    img.save(path)

async def test_multimedia():
    print("Testing Multimedia Analyst Agent...")
    
    img_path = "/tmp/sample.jpg"
    create_sample_image(img_path)
    
    with open(img_path, "rb") as f:
        file_bytes = f.read()

    state = {
        "case_id": "test_case_1",
        "multimedia_evidence": [
            {
                "evidence_id": "test_ev_1",
                "filename": "sample.jpg",
                "mime_type": "image/jpeg",
                "file_bytes": file_bytes
            }
        ],
        "leads": [],
        "agent_results": []
    }

    agent = MultimediaAnalystAgent()
    result = await agent.run(state)
    
    import pprint
    print("Result:")
    pprint.pprint(result)

if __name__ == "__main__":
    asyncio.run(test_multimedia())
