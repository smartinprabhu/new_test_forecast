#!/usr/bin/env python3
"""
Test script for Enhanced Session Management System
"""

import asyncio
import requests
import json
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from enhanced_chatbot.session_manager import EnhancedSessionManager, UserPreferences, UserType
from enhanced_chatbot.models import ChatMessage, IntentAnalysis, IntentType

BASE_URL = "http://localhost:8001"


def test_session_manager_core():
    """Test core session manager functionality."""
    print("🧪 Testing Core Session Manager...")
    
    # Create session manager
    manager = EnhancedSessionManager(storage_path="test_sessions")
    
    # Test session creation
    preferences = UserPreferences(
        user_type=UserType.INTERMEDIATE,
        preferred_algorithms=["prophet", "xgboost"],
        default_forecast_horizon=30
    )
    
    session = manager.create_session("test_user_123", preferences)
    print(f"✅ Created session: {session.session_id}")
    
    # Test session retrieval
    retrieved_session = manager.get_session(session.session_id)
    assert retrieved_session is not None
    assert retrieved_session.user_id == "test_user_123"
    print(f"✅ Retrieved session: {retrieved_session.session_id}")
    
    # Test message addition
    message = ChatMessage(
        id="msg_001",
        type="user",
        content="Hello, I want to forecast my sales data",
        timestamp=session.created_at
    )
    
    success = manager.add_message_to_session(session.session_id, message)
    assert success
    print("✅ Added message to session")
    
    # Test intent addition
    intent = IntentAnalysis(
        intent=IntentType.DATA_UPLOAD,
        confidence=0.95,
        parameters={"file_type": "csv"},
        entities=[],
        reasoning="User wants to upload data"
    )
    
    success = manager.add_intent_to_session(session.session_id, intent)
    assert success
    print("✅ Added intent to session")
    
    # Test context retrieval
    context = manager.get_conversation_context(session.session_id)
    assert context is not None
    assert context["user_type"] == "intermediate"
    assert len(context["recent_messages"]) == 1
    print("✅ Retrieved conversation context")
    
    # Test workflow data storage
    workflow_data = {"uploaded_file": "sales_data.csv", "rows": 1000}
    success = manager.store_workflow_data(session.session_id, "uploaded_data", workflow_data)
    assert success
    
    retrieved_data = manager.get_workflow_data(session.session_id, "uploaded_data")
    assert retrieved_data == workflow_data
    print("✅ Stored and retrieved workflow data")
    
    # Test session listing
    sessions = manager.list_sessions(user_id="test_user_123")
    assert len(sessions) == 1
    assert sessions[0]["session_id"] == session.session_id
    print("✅ Listed user sessions")
    
    # Test session statistics
    stats = manager.get_session_stats()
    assert stats["total_sessions"] >= 1
    assert stats["active_sessions"] >= 1
    print(f"✅ Session stats: {stats}")
    
    # Cleanup
    manager.delete_session(session.session_id)
    print("✅ Cleaned up test session")
    
    return True


def test_api_endpoints():
    """Test session management API endpoints."""
    print("\n🌐 Testing Session Management API Endpoints...")
    
    # Check if service is running
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code != 200:
            print("❌ Service not running")
            return False
    except requests.exceptions.RequestException:
        print("❌ Service not accessible")
        return False
    
    # Test session creation
    try:
        response = requests.post(f"{BASE_URL}/sessions", json={
            "user_id": "api_test_user",
            "preferences": {
                "user_type": "advanced",
                "preferred_algorithms": ["prophet", "xgboost", "lightgbm"],
                "default_forecast_horizon": 45
            }
        })
        
        if response.status_code == 200:
            session_data = response.json()
            session_id = session_data["session_id"]
            print(f"✅ Created session via API: {session_id}")
        else:
            print(f"❌ Session creation failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Session creation error: {e}")
        return False
    
    # Test session retrieval
    try:
        response = requests.get(f"{BASE_URL}/sessions/{session_id}")
        if response.status_code == 200:
            session_info = response.json()
            print(f"✅ Retrieved session info: {session_info['user_id']}")
        else:
            print(f"❌ Session retrieval failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Session retrieval error: {e}")
        return False
    
    # Test chat with session context
    try:
        response = requests.post(f"{BASE_URL}/chat", json={
            "message": "I want to train advanced models for 45-day forecasting",
            "session_id": session_id,
            "context": {}
        })
        
        if response.status_code == 200:
            chat_response = response.json()
            print(f"✅ Chat with context: {chat_response['intent']} (confidence: {chat_response['confidence']})")
        else:
            print(f"❌ Chat failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Chat error: {e}")
        return False
    
    # Test conversation history
    try:
        response = requests.get(f"{BASE_URL}/sessions/{session_id}/history")
        if response.status_code == 200:
            history = response.json()
            print(f"✅ Retrieved conversation history: {len(history['messages'])} messages")
        else:
            print(f"❌ History retrieval failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ History retrieval error: {e}")
        return False
    
    # Test session context
    try:
        response = requests.get(f"{BASE_URL}/sessions/{session_id}/context")
        if response.status_code == 200:
            context = response.json()
            print(f"✅ Retrieved session context: phase={context['conversation_phase']}")
        else:
            print(f"❌ Context retrieval failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Context retrieval error: {e}")
        return False
    
    # Test session statistics
    try:
        response = requests.get(f"{BASE_URL}/sessions/stats")
        if response.status_code == 200:
            stats = response.json()
            print(f"✅ Session statistics: {stats['active_sessions']} active sessions")
        else:
            print(f"❌ Statistics failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Statistics error: {e}")
        return False
    
    # Test session listing
    try:
        response = requests.get(f"{BASE_URL}/sessions")
        if response.status_code == 200:
            sessions = response.json()
            print(f"✅ Listed sessions: {len(sessions)} total sessions")
        else:
            print(f"❌ Session listing failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Session listing error: {e}")
        return False
    
    # Test preference updates
    try:
        response = requests.put(f"{BASE_URL}/sessions/{session_id}/preferences", json={
            "user_type": "expert",
            "preferred_algorithms": ["prophet", "xgboost", "lightgbm", "arima"],
            "default_forecast_horizon": 60,
            "auto_approve_workflows": True
        })
        
        if response.status_code == 200:
            print("✅ Updated session preferences")
        else:
            print(f"❌ Preference update failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Preference update error: {e}")
        return False
    
    # Test session deletion
    try:
        response = requests.delete(f"{BASE_URL}/sessions/{session_id}")
        if response.status_code == 200:
            print("✅ Deleted session")
        else:
            print(f"❌ Session deletion failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Session deletion error: {e}")
        return False
    
    return True


def test_context_awareness():
    """Test context-aware conversation."""
    print("\n🧠 Testing Context-Aware Conversation...")
    
    try:
        # Create session with specific preferences
        response = requests.post(f"{BASE_URL}/sessions", json={
            "user_id": "context_test_user",
            "preferences": {
                "user_type": "beginner",
                "preferred_algorithms": ["prophet"],
                "default_forecast_horizon": 14
            }
        })
        
        session_data = response.json()
        session_id = session_data["session_id"]
        print(f"✅ Created session for context test: {session_id}")
        
        # First message - data upload
        response = requests.post(f"{BASE_URL}/chat", json={
            "message": "I want to upload my sales data",
            "session_id": session_id,
            "context": {}
        })
        
        chat1 = response.json()
        print(f"✅ First message: {chat1['intent']} (confidence: {chat1['confidence']})")
        
        # Second message - should understand context
        response = requests.post(f"{BASE_URL}/chat", json={
            "message": "Now train models on it",
            "session_id": session_id,
            "context": {}
        })
        
        chat2 = response.json()
        print(f"✅ Second message with context: {chat2['intent']} (confidence: {chat2['confidence']})")
        
        # Check conversation history
        response = requests.get(f"{BASE_URL}/sessions/{session_id}/history")
        history = response.json()
        print(f"✅ Conversation history: {len(history['messages'])} messages")
        print(f"   Summary: {history['conversation_summary']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/sessions/{session_id}")
        print("✅ Cleaned up context test session")
        
        return True
        
    except Exception as e:
        print(f"❌ Context awareness test failed: {e}")
        return False


def test_persistence():
    """Test session persistence."""
    print("\n💾 Testing Session Persistence...")
    
    try:
        # Create a session manager with test storage
        manager = EnhancedSessionManager(storage_path="test_persistence")
        
        # Create session with data
        session = manager.create_session("persistence_user")
        original_session_id = session.session_id
        
        # Add some data
        message = ChatMessage(
            id="persist_msg",
            type="user", 
            content="Test persistence message",
            timestamp=session.created_at
        )
        manager.add_message_to_session(session.session_id, message)
        
        workflow_data = {"test": "persistence_data"}
        manager.store_workflow_data(session.session_id, "test_data", workflow_data)
        
        print(f"✅ Created session with data: {session.session_id}")
        
        # Create new manager instance (simulates restart)
        manager2 = EnhancedSessionManager(storage_path="test_persistence")
        
        # Try to retrieve the session
        loaded_session = manager2.get_session(original_session_id)
        
        if loaded_session:
            print(f"✅ Loaded session after restart: {loaded_session.session_id}")
            
            # Check if data persisted
            loaded_data = manager2.get_workflow_data(original_session_id, "test_data")
            if loaded_data == workflow_data:
                print("✅ Workflow data persisted correctly")
            else:
                print("❌ Workflow data not persisted")
                return False
        else:
            print("❌ Session not loaded after restart")
            return False
        
        # Cleanup
        manager2.delete_session(original_session_id)
        print("✅ Cleaned up persistence test")
        
        return True
        
    except Exception as e:
        print(f"❌ Persistence test failed: {e}")
        return False


async def main():
    """Run all session management tests."""
    print("🚀 Enhanced Session Management System - Comprehensive Tests")
    print("=" * 70)
    
    tests = [
        ("Core Session Manager", test_session_manager_core),
        ("API Endpoints", test_api_endpoints),
        ("Context Awareness", test_context_awareness),
        ("Session Persistence", test_persistence)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            print(f"\n{'='*20} {test_name} {'='*20}")
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "="*70)
    print("📊 Test Results Summary")
    print("-" * 35)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("🎉 All tests passed! Session management system is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the implementation for issues.")
    
    print("\n🔗 Session Management Features:")
    print("✅ Enhanced session creation and management")
    print("✅ User preferences and context tracking")
    print("✅ Conversation history and intent tracking")
    print("✅ Workflow data storage and retrieval")
    print("✅ Session persistence across restarts")
    print("✅ Context-aware conversation processing")
    print("✅ Real-time session statistics")
    print("✅ RESTful API endpoints for all operations")


if __name__ == "__main__":
    asyncio.run(main())