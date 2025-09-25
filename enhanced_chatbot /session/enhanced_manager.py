"""
Enhanced Session Manager for Agentic Chatbot.
Extends the existing forecasting service session manager with conversation context,
history tracking, and user preference management.
"""

import os
import pickle
import json
from datetime import datetime, timedelta
from typing import Dict, Optional, List, Any
import pandas as pd
from pathlib import Path
from dataclasses import dataclass, field
from enum import Enum

# Import existing session models
from forecasting_service.session.manager import SessionManager as BaseSessionManager
from forecasting_service.session.models import Session, SessionData


class UserType(Enum):
    """User types for different interaction modes."""
    BUSINESS = "business"
    ANALYST = "analyst"
    DATA_SCIENTIST = "data_scientist"
    DEVELOPER = "developer"


@dataclass
class ConversationMessage:
    """Individual conversation message."""
    id: str
    type: str  # 'user', 'assistant', 'agent', 'system'
    content: str
    timestamp: datetime
    agent_id: Optional[str] = None
    workflow_step: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    requires_approval: bool = False
    approved: Optional[bool] = None


@dataclass
class UserPreferences:
    """User preferences for chatbot interaction."""
    user_type: UserType = UserType.BUSINESS
    preferred_explanation_level: str = "business"  # 'technical', 'business', 'simple'
    auto_execute_workflows: bool = False
    show_technical_details: bool = False
    notification_preferences: Dict[str, bool] = field(default_factory=lambda: {
        'workflow_progress': True,
        'agent_status': True,
        'errors': True,
        'completions': True
    })
    chart_preferences: Dict[str, Any] = field(default_factory=lambda: {
        'theme': 'light',
        'show_confidence_intervals': True,
        'default_chart_type': 'line'
    })
    language: str = "en"


@dataclass
class ConversationContext:
    """Context for ongoing conversation."""
    current_intent: Optional[str] = None
    last_action: Optional[str] = None
    pending_approvals: List[str] = field(default_factory=list)
    workflow_state: Optional[Dict[str, Any]] = None
    data_context: Optional[Dict[str, Any]] = None
    agent_context: Dict[str, Any] = field(default_factory=dict)
    conversation_history: List[ConversationMessage] = field(default_factory=list)
    session_start_time: datetime = field(default_factory=datetime.now)
    last_interaction_time: datetime = field(default_factory=datetime.now)


@dataclass
class EnhancedSessionData(SessionData):
    """Enhanced session data with conversation support."""
    conversation_context: ConversationContext = field(default_factory=ConversationContext)
    user_preferences: UserPreferences = field(default_factory=UserPreferences)
    conversation_history: List[ConversationMessage] = field(default_factory=list)
    workflow_history: List[Dict[str, Any]] = field(default_factory=list)
    agent_interactions: Dict[str, List[Dict[str, Any]]] = field(default_factory=dict)
    
    def __post_init__(self):
        super().__post_init__()
        # Ensure conversation_context is properly initialized
        if not hasattr(self, 'conversation_context') or self.conversation_context is None:
            self.conversation_context = ConversationContext()


class EnhancedSessionManager(BaseSessionManager):
    """
    Enhanced session manager that extends the base forecasting service
    session manager with conversation context and chatbot-specific features.
    """
    
    def __init__(self, storage_path: str = "enhanced_sessions"):
        # Initialize base session manager
        super().__init__(storage_path)
        self.conversation_timeout_hours = 48  # Longer timeout for conversations
        
    def create_enhanced_session(self, user_id: Optional[str] = None, 
                              user_type: UserType = UserType.BUSINESS) -> Session:
        """Create a new enhanced session with conversation support."""
        session = self.create_session(user_id)
        
        # Replace session data with enhanced version
        enhanced_data = EnhancedSessionData()
        enhanced_data.user_preferences.user_type = user_type
        
        # Copy existing data if any
        if hasattr(session.data, 'raw_data'):
            enhanced_data.raw_data = session.data.raw_data
        if hasattr(session.data, 'processed_data'):
            enhanced_data.processed_data = session.data.processed_data
        if hasattr(session.data, 'eda_report'):
            enhanced_data.eda_report = session.data.eda_report
        if hasattr(session.data, 'models'):
            enhanced_data.models = session.data.models
        if hasattr(session.data, 'forecasts'):
            enhanced_data.forecasts = session.data.forecasts
        
        session.data = enhanced_data
        self._save_session(session)
        return session
    
    def add_conversation_message(self, session_id: str, message: ConversationMessage) -> bool:
        """Add a message to the conversation history."""
        session = self.get_session(session_id)
        if not session:
            return False
        
        # Ensure we have enhanced session data
        if not isinstance(session.data, EnhancedSessionData):
            session.data = self._upgrade_session_data(session.data)
        
        # Add to conversation history
        session.data.conversation_history.append(message)
        session.data.conversation_context.conversation_history.append(message)
        session.data.conversation_context.last_interaction_time = datetime.now()
        
        # Limit conversation history to last 100 messages
        if len(session.data.conversation_history) > 100:
            session.data.conversation_history = session.data.conversation_history[-100:]
        
        session.update_access_time()
        self._save_session(session)
        return True
    
    def get_conversation_history(self, session_id: str, limit: int = 50) -> List[ConversationMessage]:
        """Get conversation history for a session."""
        session = self.get_session(session_id)
        if not session or not isinstance(session.data, EnhancedSessionData):
            return []
        
        return session.data.conversation_history[-limit:]
    
    def update_conversation_context(self, session_id: str, **context_updates) -> bool:
        """Update conversation context with new information."""
        session = self.get_session(session_id)
        if not session:
            return False
        
        # Ensure we have enhanced session data
        if not isinstance(session.data, EnhancedSessionData):
            session.data = self._upgrade_session_data(session.data)
        
        # Update context fields
        for key, value in context_updates.items():
            if hasattr(session.data.conversation_context, key):
                setattr(session.data.conversation_context, key, value)
        
        session.data.conversation_context.last_interaction_time = datetime.now()
        session.update_access_time()
        self._save_session(session)
        return True
    
    def get_conversation_context(self, session_id: str) -> Optional[ConversationContext]:
        """Get current conversation context."""
        session = self.get_session(session_id)
        if not session or not isinstance(session.data, EnhancedSessionData):
            return None
        
        return session.data.conversation_context
    
    def update_user_preferences(self, session_id: str, preferences: Dict[str, Any]) -> bool:
        """Update user preferences."""
        session = self.get_session(session_id)
        if not session:
            return False
        
        # Ensure we have enhanced session data
        if not isinstance(session.data, EnhancedSessionData):
            session.data = self._upgrade_session_data(session.data)
        
        # Update preference fields
        for key, value in preferences.items():
            if hasattr(session.data.user_preferences, key):
                setattr(session.data.user_preferences, key, value)
        
        session.update_access_time()
        self._save_session(session)
        return True
    
    def get_user_preferences(self, session_id: str) -> Optional[UserPreferences]:
        """Get user preferences."""
        session = self.get_session(session_id)
        if not session or not isinstance(session.data, EnhancedSessionData):
            return None
        
        return session.data.user_preferences
    
    def add_workflow_execution(self, session_id: str, workflow_data: Dict[str, Any]) -> bool:
        """Add a workflow execution to history."""
        session = self.get_session(session_id)
        if not session:
            return False
        
        # Ensure we have enhanced session data
        if not isinstance(session.data, EnhancedSessionData):
            session.data = self._upgrade_session_data(session.data)
        
        workflow_data['timestamp'] = datetime.now().isoformat()
        session.data.workflow_history.append(workflow_data)
        
        # Limit workflow history to last 20 executions
        if len(session.data.workflow_history) > 20:
            session.data.workflow_history = session.data.workflow_history[-20:]
        
        session.update_access_time()
        self._save_session(session)
        return True
    
    def get_workflow_history(self, session_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get workflow execution history."""
        session = self.get_session(session_id)
        if not session or not isinstance(session.data, EnhancedSessionData):
            return []
        
        return session.data.workflow_history[-limit:]
    
    def add_agent_interaction(self, session_id: str, agent_id: str, 
                            interaction_data: Dict[str, Any]) -> bool:
        """Add an agent interaction to history."""
        session = self.get_session(session_id)
        if not session:
            return False
        
        # Ensure we have enhanced session data
        if not isinstance(session.data, EnhancedSessionData):
            session.data = self._upgrade_session_data(session.data)
        
        if agent_id not in session.data.agent_interactions:
            session.data.agent_interactions[agent_id] = []
        
        interaction_data['timestamp'] = datetime.now().isoformat()
        session.data.agent_interactions[agent_id].append(interaction_data)
        
        # Limit agent interactions to last 50 per agent
        if len(session.data.agent_interactions[agent_id]) > 50:
            session.data.agent_interactions[agent_id] = session.data.agent_interactions[agent_id][-50:]
        
        session.update_access_time()
        self._save_session(session)
        return True
    
    def get_agent_interactions(self, session_id: str, agent_id: str, 
                             limit: int = 20) -> List[Dict[str, Any]]:
        """Get agent interaction history."""
        session = self.get_session(session_id)
        if not session or not isinstance(session.data, EnhancedSessionData):
            return []
        
        if agent_id not in session.data.agent_interactions:
            return []
        
        return session.data.agent_interactions[agent_id][-limit:]
    
    def clear_conversation_history(self, session_id: str) -> bool:
        """Clear conversation history for a session."""
        session = self.get_session(session_id)
        if not session:
            return False
        
        if isinstance(session.data, EnhancedSessionData):
            session.data.conversation_history = []
            session.data.conversation_context.conversation_history = []
            session.data.conversation_context.current_intent = None
            session.data.conversation_context.last_action = None
            session.data.conversation_context.pending_approvals = []
            
            session.update_access_time()
            self._save_session(session)
            return True
        
        return False
    
    def get_session_summary(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get a comprehensive summary of the session."""
        session = self.get_session(session_id)
        if not session:
            return None
        
        summary = {
            'session_id': session.session_id,
            'user_id': session.user_id,
            'created_at': session.created_at.isoformat(),
            'last_accessed': session.last_accessed.isoformat(),
            'has_data': session.data.raw_data is not None,
            'models_trained': len(session.data.models),
            'forecasts_generated': len(session.data.forecasts),
        }
        
        if isinstance(session.data, EnhancedSessionData):
            summary.update({
                'user_type': session.data.user_preferences.user_type.value,
                'conversation_messages': len(session.data.conversation_history),
                'workflow_executions': len(session.data.workflow_history),
                'agent_interactions': sum(len(interactions) for interactions in session.data.agent_interactions.values()),
                'current_intent': session.data.conversation_context.current_intent,
                'last_action': session.data.conversation_context.last_action,
                'pending_approvals': len(session.data.conversation_context.pending_approvals),
            })
        
        return summary
    
    def _upgrade_session_data(self, old_data: SessionData) -> EnhancedSessionData:
        """Upgrade existing session data to enhanced version."""
        enhanced_data = EnhancedSessionData()
        
        # Copy existing fields
        if hasattr(old_data, 'raw_data'):
            enhanced_data.raw_data = old_data.raw_data
        if hasattr(old_data, 'processed_data'):
            enhanced_data.processed_data = old_data.processed_data
        if hasattr(old_data, 'eda_report'):
            enhanced_data.eda_report = old_data.eda_report
        if hasattr(old_data, 'models'):
            enhanced_data.models = old_data.models
        if hasattr(old_data, 'forecasts'):
            enhanced_data.forecasts = old_data.forecasts
        
        return enhanced_data
    
    def cleanup_expired_conversations(self):
        """Remove expired conversation sessions."""
        expired_sessions = []
        for session_id, session in self.sessions.items():
            if session.is_expired(self.conversation_timeout_hours):
                expired_sessions.append(session_id)
        
        for session_id in expired_sessions:
            self.delete_session(session_id)
    
    def get_enhanced_session_stats(self) -> Dict[str, Any]:
        """Get enhanced statistics about current sessions."""
        base_stats = self.get_session_stats()
        
        enhanced_sessions = [s for s in self.sessions.values() 
                           if isinstance(s.data, EnhancedSessionData)]
        
        total_messages = sum(len(s.data.conversation_history) for s in enhanced_sessions)
        total_workflows = sum(len(s.data.workflow_history) for s in enhanced_sessions)
        
        user_types = {}
        for session in enhanced_sessions:
            user_type = session.data.user_preferences.user_type.value
            user_types[user_type] = user_types.get(user_type, 0) + 1
        
        enhanced_stats = {
            'enhanced_sessions': len(enhanced_sessions),
            'total_conversation_messages': total_messages,
            'total_workflow_executions': total_workflows,
            'user_type_distribution': user_types,
            'average_messages_per_session': total_messages / len(enhanced_sessions) if enhanced_sessions else 0,
        }
        
        return {**base_stats, **enhanced_stats}