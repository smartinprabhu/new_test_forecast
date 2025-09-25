#!/usr/bin/env python3
"""
Test script for Enhanced Agentic Chatbot
"""

import asyncio
import json
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from enhanced_chatbot.gemini_client import GeminiAIClient
from enhanced_chatbot.agent_orchestrator import AgentOrchestrator
from enhanced_chatbot.workflow_manager import WorkflowManager
from enhanced_chatbot.models import ChatRequest, IntentType


async def test_gemini_client():
    """Test Gemini AI client functionality."""
    print("🧠 Testing Gemini AI Client...")
    
    client = GeminiAIClient(api_key="AIzaSyC9HUwhTJvg828gaLS7sfcG1DB5fGoB0CA")
    
    # Test intent analysis
    try:
        intent = await client.analyze_intent("I want to train models on my sales data")
        print(f"✅ Intent Analysis: {intent.intent} (confidence: {intent.confidence:.2f})")
        print(f"   Parameters: {intent.parameters}")
    except Exception as e:
        print(f"❌ Intent Analysis failed: {e}")
    
    # Test response generation
    try:
        response = await client.generate_response(
            "User wants to start model training",
            {"has_data": True, "algorithms": ["prophet", "xgboost"]}
        )
        print(f"✅ Response Generation: {response[:100]}...")
    except Exception as e:
        print(f"❌ Response Generation failed: {e}")
    
    print()


async def test_agent_orchestrator():
    """Test agent orchestration functionality."""
    print("🤖 Testing Agent Orchestrator...")
    
    orchestrator = AgentOrchestrator()
    session_id = "test_session_123"
    
    # Create training agents
    try:
        agents = await orchestrator.create_training_agents(session_id)
        print(f"✅ Created {len(agents)} agents for training workflow")
        
        for agent in agents:
            print(f"   - {agent.name} ({agent.agent_type.value})")
    except Exception as e:
        print(f"❌ Agent creation failed: {e}")
    
    # Get agent status
    try:
        statuses = await orchestrator.get_agent_status(session_id)
        print(f"✅ Retrieved status for {len(statuses)} agents")
    except Exception as e:
        print(f"❌ Agent status retrieval failed: {e}")
    
    print()


async def test_workflow_manager():
    """Test workflow management functionality."""
    print("📋 Testing Workflow Manager...")
    
    manager = WorkflowManager()
    session_id = "test_session_123"
    
    # Create workflow plan
    try:
        requirements = {
            "data_type": "sales",
            "forecast_horizon": 30,
            "algorithms": ["prophet", "xgboost"]
        }
        
        plan = await manager.create_workflow_plan(session_id, requirements)
        print(f"✅ Created workflow plan with {len(plan.steps)} steps")
        print(f"   Estimated duration: {plan.estimated_duration} seconds")
        
        for step in plan.steps:
            print(f"   - {step.name} ({step.agent_type.value})")
    except Exception as e:
        print(f"❌ Workflow plan creation failed: {e}")
    
    print()


async def test_integration():
    """Test integration between components."""
    print("🔗 Testing Component Integration...")
    
    # Test Gemini + Workflow integration
    try:
        gemini_client = GeminiAIClient(api_key="AIzaSyC9HUwhTJvg828gaLS7sfcG1DB5fGoB0CA")
        workflow_manager = WorkflowManager()
        workflow_manager.set_gemini_client(gemini_client)
        
        # Create a plan using Gemini AI
        requirements = {
            "user_message": "I want to forecast my daily sales for the next month",
            "data_characteristics": {"frequency": "daily", "seasonality": True}
        }
        
        plan = await workflow_manager.create_workflow_plan("test_session", requirements)
        print(f"✅ Integrated plan creation successful: {plan.name}")
        
    except Exception as e:
        print(f"❌ Integration test failed: {e}")
    
    print()


def test_models():
    """Test Pydantic models."""
    print("📝 Testing Pydantic Models...")
    
    try:
        # Test ChatRequest
        request = ChatRequest(
            message="Train models on my data",
            session_id="test_123",
            context={"has_data": True}
        )
        print(f"✅ ChatRequest model: {request.message}")
        
        # Test model serialization
        request_dict = request.dict()
        print(f"✅ Model serialization successful")
        
    except Exception as e:
        print(f"❌ Model test failed: {e}")
    
    print()


async def main():
    """Run all tests."""
    print("🚀 Enhanced Agentic Chatbot - Component Tests")
    print("=" * 50)
    
    # Test individual components
    test_models()
    await test_gemini_client()
    await test_agent_orchestrator()
    await test_workflow_manager()
    await test_integration()
    
    print("✨ All tests completed!")
    print("\n🎯 Next Steps:")
    print("1. Run the chatbot: python enhanced_chatbot/start_chatbot.py")
    print("2. Test the API: http://localhost:8001/docs")
    print("3. Connect frontend to WebSocket: ws://localhost:8001/ws/{session_id}")


if __name__ == "__main__":
    asyncio.run(main())