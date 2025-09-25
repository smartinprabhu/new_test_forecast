"""
Main entry point for Enhanced Agentic Chatbot.
Starts the FastAPI server with all enhanced chatbot functionality.
"""

import uvicorn
import asyncio
from pathlib import Path
import sys

# Add the project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from enhanced_chatbot.api.chat_orchestrator import app
from enhanced_chatbot.session.enhanced_manager import EnhancedSessionManager
from enhanced_chatbot.gemini.client import GeminiClient
from enhanced_chatbot.agents.orchestrator import AgentOrchestrator


def setup_directories():
    """Ensure required directories exist."""
    directories = [
        "enhanced_sessions",
        "logs",
        "temp"
    ]
    
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)


async def startup_tasks():
    """Perform startup tasks."""
    print("🚀 Starting Enhanced Agentic Chatbot...")
    
    # Setup directories
    setup_directories()
    
    # Import and start the orchestrator
    from enhanced_chatbot.api.chat_orchestrator import agent_orchestrator, workflow_manager
    
    # Start the agent orchestrator
    await agent_orchestrator.start()
    
    # Initialize managers (they're already initialized in the app)
    print("✅ Session manager initialized")
    print("✅ Gemini AI client initialized")
    print("✅ Agent orchestrator started")
    print("✅ Workflow manager initialized")
    
    print("🎯 Enhanced Agentic Chatbot is ready!")
    print("📡 API available at: http://localhost:8001")
    print("📚 API docs available at: http://localhost:8001/docs")
    print("🔌 WebSocket endpoint: ws://localhost:8001/ws/{session_id}")
    print("📊 System stats: http://localhost:8001/stats")


def main():
    """Main function to start the server."""
    print("=" * 60)
    print("🤖 Enhanced Agentic Chatbot for Forecasting Service")
    print("=" * 60)
    
    # Run startup tasks
    asyncio.run(startup_tasks())
    
    # Start the server
    uvicorn.run(
        "enhanced_chatbot.api.chat_orchestrator:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info",
        access_log=True
    )


if __name__ == "__main__":
    main()