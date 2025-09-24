"""Session management package for enhanced chatbot."""

from .enhanced_manager import (
    EnhancedSessionManager,
    UserType,
    UserPreferences,
    ConversationContext,
    ConversationMessage,
    EnhancedSessionData
)

__all__ = [
    "EnhancedSessionManager",
    "UserType",
    "UserPreferences", 
    "ConversationContext",
    "ConversationMessage",
    "EnhancedSessionData"
]