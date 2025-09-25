"""
Enhanced Agentic Chatbot Package.
Intelligent conversational interface for forecasting service with multi-agent orchestration.
"""

__version__ = "1.0.0"
__author__ = "Enhanced Chatbot Team"
__description__ = "Intelligent conversational interface for forecasting service"

from .session.enhanced_manager import EnhancedSessionManager, UserType, UserPreferences
from .gemini.client import GeminiClient
from .agents.orchestrator import EnhancedAgentOrchestrator, AgentType, AgentStatus

__all__ = [
    "EnhancedSessionManager",
    "UserType", 
    "UserPreferences",
    "GeminiClient",
    "EnhancedAgentOrchestrator",
    "AgentType",
    "AgentStatus"
]