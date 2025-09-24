"""
Enhanced Session and Context Management for Agentic Chatbot
Maintains conversation history, user preferences, and workflow state
"""

import json
import uuid
import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from enum import Enum
import asyncio
from pathlib import Path

try:
    from .models import ChatMessage, IntentAnalysis
except ImportError:
    from models import ChatMessage, IntentAnalysis

logger = logging.getLogger(__name__)


class UserType(str, Enum):
    """User expertise levels."""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class SessionStatus(str, Enum):
    """Session status types."""
    ACTIVE = "active"
    IDLE = "idle"
    EXPIRED = "expired"
    ARCHIVED = "archived"


@dataclass
class UserPreferences:
    """User preferences and settings."""
    user_type: UserType = UserType.INTERMEDIATE
    preferred_algorithms: List[str] = field(default_factory=lambda: ["prophet", "xgboost"])
    default_forecast_horizon: int = 30
    confidence_level: str = "medium"
    auto_approve_workflows: bool = False
    notification_level: str = "normal"
    export_format: str = "excel"
    language: str = "en"
    timezone: str = "UTC"
    
    # UI preferences
    show_technical_details: bool = True
    show_agent_status: bool = True
    show_progress_details: bool = True
    
    # Workflow preferences
    preferred_preprocessing: Dict[str, Any] = field(default_factory=dict)
    preferred_evaluation_metrics: List[str] = field(default_factory=lambda: ["mape", "rmse"])
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'UserPreferences':
        """Create from dictionary."""
        return cls(**data)


@dataclass
class ConversationContext:
    """Conversation context and history."""
    session_id: str
    user_id: Optional[str] = None
    messages: List[ChatMessage] = field(default_factory=list)
    intent_history: List[IntentAnalysis] = field(default_factory=list)
    current_workflow: Optional[str] = None
    active_agents: List[str] = field(default_factory=list)
    
    # Data context
    uploaded_data: Optional[Dict[str, Any]] = None
    data_analysis_results: Optional[Dict[str, Any]] = None
    preprocessing_results: Optional[Dict[str, Any]] = None
    training_results: Optional[Dict[str, Any]] = None
    forecast_results: Optional[Dict[str, Any]] = None
    
    # Conversation state
    last_intent: Optional[IntentAnalysis] = None
    awaiting_user_input: bool = False
    expected_input_type: Optional[str] = None
    conversation_phase: str = "greeting"
    
    # Context variables for maintaining state
    context_variables: Dict[str, Any] = field(default_factory=dict)
    
    def add_message(self, message: ChatMessage):
        """Add a message to the conversation history."""
        self.messages.append(message)
        # Keep only last 50 messages to prevent memory issues
        if len(self.messages) > 50:
            self.messages = self.messages[-50:]
    
    def add_intent(self, intent: IntentAnalysis):
        """Add an intent analysis to history."""
        self.intent_history.append(intent)
        self.last_intent = intent
        # Keep only last 20 intents
        if len(self.intent_history) > 20:
            self.intent_history = self.intent_history[-20:]
    
    def get_recent_messages(self, count: int = 10) -> List[ChatMessage]:
        """Get recent messages."""
        return self.messages[-count:] if self.messages else []
    
    def get_conversation_summary(self) -> str:
        """Generate a summary of the conversation."""
        if not self.messages:
            return "No conversation history"
        
        summary_parts = []
        
        # Recent intents
        if self.intent_history:
            recent_intents = [intent.intent.value for intent in self.intent_history[-5:]]
            summary_parts.append(f"Recent intents: {', '.join(recent_intents)}")
        
        # Current phase
        summary_parts.append(f"Current phase: {self.conversation_phase}")
        
        # Data status
        if self.uploaded_data:
            summary_parts.append("Data uploaded")
        if self.training_results:
            summary_parts.append("Models trained")
        if self.forecast_results:
            summary_parts.append("Forecasts generated")
        
        return "; ".join(summary_parts)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "session_id": self.session_id,
            "user_id": self.user_id,
            "messages": [msg.dict() if hasattr(msg, 'dict') else msg for msg in self.messages],
            "intent_history": [intent.dict() if hasattr(intent, 'dict') else intent for intent in self.intent_history],
            "current_workflow": self.current_workflow,
            "active_agents": self.active_agents,
            "uploaded_data": self.uploaded_data,
            "data_analysis_results": self.data_analysis_results,
            "preprocessing_results": self.preprocessing_results,
            "training_results": self.training_results,
            "forecast_results": self.forecast_results,
            "last_intent": self.last_intent.dict() if self.last_intent and hasattr(self.last_intent, 'dict') else self.last_intent,
            "awaiting_user_input": self.awaiting_user_input,
            "expected_input_type": self.expected_input_type,
            "conversation_phase": self.conversation_phase,
            "context_variables": self.context_variables
        }


@dataclass
class SessionInfo:
    """Session information and metadata."""
    session_id: str
    user_id: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    last_activity: datetime = field(default_factory=datetime.now)
    status: SessionStatus = SessionStatus.ACTIVE
    preferences: UserPreferences = field(default_factory=UserPreferences)
    context: ConversationContext = field(default=None)
    
    # Session statistics
    message_count: int = 0
    workflow_count: int = 0
    successful_forecasts: int = 0
    
    # Expiration settings
    idle_timeout: int = 3600  # 1 hour in seconds
    max_lifetime: int = 86400  # 24 hours in seconds
    
    def __post_init__(self):
        if self.context is None:
            self.context = ConversationContext(session_id=self.session_id, user_id=self.user_id)
    
    def is_expired(self) -> bool:
        """Check if session is expired."""
        now = datetime.now()
        
        # Check idle timeout
        idle_time = (now - self.last_activity).total_seconds()
        if idle_time > self.idle_timeout:
            return True
        
        # Check max lifetime
        lifetime = (now - self.created_at).total_seconds()
        if lifetime > self.max_lifetime:
            return True
        
        return False
    
    def update_activity(self):
        """Update last activity timestamp."""
        self.last_activity = datetime.now()
        if self.status == SessionStatus.IDLE:
            self.status = SessionStatus.ACTIVE
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "session_id": self.session_id,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat(),
            "last_activity": self.last_activity.isoformat(),
            "status": self.status.value,
            "preferences": self.preferences.to_dict(),
            "context": self.context.to_dict(),
            "message_count": self.message_count,
            "workflow_count": self.workflow_count,
            "successful_forecasts": self.successful_forecasts,
            "idle_timeout": self.idle_timeout,
            "max_lifetime": self.max_lifetime
        }


class EnhancedSessionManager:
    """Enhanced session manager with persistence and context management."""
    
    def __init__(self, storage_path: str = "sessions"):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(exist_ok=True)
        self.sessions: Dict[str, SessionInfo] = {}
        self.user_sessions: Dict[str, List[str]] = {}  # user_id -> session_ids
        
        # Load existing sessions
        self._load_sessions()
        
        # Cleanup task will be started when needed
        self._cleanup_task = None
    
    def start_cleanup_task(self):
        """Start background task for session cleanup."""
        async def cleanup_loop():
            while True:
                try:
                    await asyncio.sleep(300)  # Run every 5 minutes
                    await self.cleanup_expired_sessions()
                except Exception as e:
                    logger.error(f"Session cleanup error: {e}")
        
        try:
            if self._cleanup_task is None:
                self._cleanup_task = asyncio.create_task(cleanup_loop())
        except RuntimeError:
            # No event loop running, cleanup will be manual
            logger.info("No event loop for cleanup task, will cleanup manually")
    
    def create_session(self, user_id: Optional[str] = None, preferences: Optional[UserPreferences] = None) -> SessionInfo:
        """Create a new session."""
        session_id = f"session_{uuid.uuid4().hex[:12]}"
        
        session = SessionInfo(
            session_id=session_id,
            user_id=user_id,
            preferences=preferences or UserPreferences()
        )
        
        self.sessions[session_id] = session
        
        # Track user sessions
        if user_id:
            if user_id not in self.user_sessions:
                self.user_sessions[user_id] = []
            self.user_sessions[user_id].append(session_id)
        
        # Persist session
        self._save_session(session)
        
        logger.info(f"Created session {session_id} for user {user_id}")
        return session
    
    def get_session(self, session_id: str) -> Optional[SessionInfo]:
        """Get session by ID."""
        session = self.sessions.get(session_id)
        
        if session:
            if session.is_expired():
                session.status = SessionStatus.EXPIRED
                return session
            
            session.update_activity()
            self._save_session(session)
        
        return session
    
    def update_session_context(self, session_id: str, **context_updates) -> bool:
        """Update session context."""
        session = self.get_session(session_id)
        if not session:
            return False
        
        # Update context variables
        for key, value in context_updates.items():
            if hasattr(session.context, key):
                setattr(session.context, key, value)
            else:
                session.context.context_variables[key] = value
        
        session.update_activity()
        self._save_session(session)
        return True
    
    def add_message_to_session(self, session_id: str, message: ChatMessage) -> bool:
        """Add a message to session conversation history."""
        session = self.get_session(session_id)
        if not session:
            return False
        
        session.context.add_message(message)
        session.message_count += 1
        session.update_activity()
        self._save_session(session)
        return True
    
    def add_intent_to_session(self, session_id: str, intent: IntentAnalysis) -> bool:
        """Add intent analysis to session history."""
        session = self.get_session(session_id)
        if not session:
            return False
        
        session.context.add_intent(intent)
        session.update_activity()
        self._save_session(session)
        return True
    
    def update_conversation_phase(self, session_id: str, phase: str) -> bool:
        """Update conversation phase."""
        session = self.get_session(session_id)
        if not session:
            return False
        
        session.context.conversation_phase = phase
        session.update_activity()
        self._save_session(session)
        return True
    
    def set_user_preferences(self, session_id: str, preferences: UserPreferences) -> bool:
        """Update user preferences."""
        session = self.get_session(session_id)
        if not session:
            return False
        
        session.preferences = preferences
        session.update_activity()
        self._save_session(session)
        return True
    
    def get_user_sessions(self, user_id: str) -> List[SessionInfo]:
        """Get all sessions for a user."""
        session_ids = self.user_sessions.get(user_id, [])
        sessions = []
        
        for session_id in session_ids:
            session = self.get_session(session_id)
            if session:
                sessions.append(session)
        
        return sessions
    
    def get_conversation_context(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get conversation context for AI processing."""
        session = self.get_session(session_id)
        if not session:
            return None
        
        context = session.context
        
        return {
            "session_id": session_id,
            "user_type": session.preferences.user_type.value,
            "conversation_phase": context.conversation_phase,
            "recent_messages": [msg.dict() if hasattr(msg, 'dict') else msg for msg in context.get_recent_messages(5)],
            "recent_intents": [intent.intent.value for intent in context.intent_history[-3:]] if context.intent_history else [],
            "has_data": context.uploaded_data is not None,
            "has_trained_models": context.training_results is not None,
            "has_forecasts": context.forecast_results is not None,
            "current_workflow": context.current_workflow,
            "active_agents": context.active_agents,
            "awaiting_input": context.awaiting_user_input,
            "expected_input": context.expected_input_type,
            "context_variables": context.context_variables,
            "preferences": session.preferences.to_dict()
        }
    
    def store_workflow_data(self, session_id: str, data_type: str, data: Any) -> bool:
        """Store workflow-related data in session."""
        session = self.get_session(session_id)
        if not session:
            return False
        
        context = session.context
        
        if data_type == "uploaded_data":
            context.uploaded_data = data
        elif data_type == "data_analysis":
            context.data_analysis_results = data
        elif data_type == "preprocessing":
            context.preprocessing_results = data
        elif data_type == "training":
            context.training_results = data
            session.successful_forecasts += 1
        elif data_type == "forecast":
            context.forecast_results = data
        else:
            context.context_variables[data_type] = data
        
        session.update_activity()
        self._save_session(session)
        return True
    
    def get_workflow_data(self, session_id: str, data_type: str) -> Optional[Any]:
        """Get workflow-related data from session."""
        session = self.get_session(session_id)
        if not session:
            return None
        
        context = session.context
        
        if data_type == "uploaded_data":
            return context.uploaded_data
        elif data_type == "data_analysis":
            return context.data_analysis_results
        elif data_type == "preprocessing":
            return context.preprocessing_results
        elif data_type == "training":
            return context.training_results
        elif data_type == "forecast":
            return context.forecast_results
        else:
            return context.context_variables.get(data_type)
    
    def list_sessions(self, user_id: Optional[str] = None, status: Optional[SessionStatus] = None) -> List[Dict[str, Any]]:
        """List sessions with optional filtering."""
        sessions = []
        
        for session in self.sessions.values():
            # Filter by user_id
            if user_id and session.user_id != user_id:
                continue
            
            # Filter by status
            if status and session.status != status:
                continue
            
            sessions.append({
                "session_id": session.session_id,
                "user_id": session.user_id,
                "status": session.status.value,
                "created_at": session.created_at.isoformat(),
                "last_activity": session.last_activity.isoformat(),
                "message_count": session.message_count,
                "workflow_count": session.workflow_count,
                "conversation_phase": session.context.conversation_phase
            })
        
        return sessions
    
    def delete_session(self, session_id: str) -> bool:
        """Delete a session."""
        session = self.sessions.get(session_id)
        if not session:
            return False
        
        # Remove from user sessions
        if session.user_id and session.user_id in self.user_sessions:
            if session_id in self.user_sessions[session.user_id]:
                self.user_sessions[session.user_id].remove(session_id)
        
        # Remove from memory
        del self.sessions[session_id]
        
        # Remove from storage
        session_file = self.storage_path / f"{session_id}.json"
        if session_file.exists():
            session_file.unlink()
        
        logger.info(f"Deleted session {session_id}")
        return True
    
    async def cleanup_expired_sessions(self):
        """Clean up expired sessions."""
        expired_sessions = []
        
        for session_id, session in self.sessions.items():
            if session.is_expired():
                expired_sessions.append(session_id)
        
        for session_id in expired_sessions:
            logger.info(f"Cleaning up expired session {session_id}")
            self.delete_session(session_id)
        
        if expired_sessions:
            logger.info(f"Cleaned up {len(expired_sessions)} expired sessions")
    
    def get_session_stats(self) -> Dict[str, Any]:
        """Get session statistics."""
        total_sessions = len(self.sessions)
        active_sessions = len([s for s in self.sessions.values() if s.status == SessionStatus.ACTIVE])
        idle_sessions = len([s for s in self.sessions.values() if s.status == SessionStatus.IDLE])
        expired_sessions = len([s for s in self.sessions.values() if s.status == SessionStatus.EXPIRED])
        
        total_messages = sum(s.message_count for s in self.sessions.values())
        total_workflows = sum(s.workflow_count for s in self.sessions.values())
        total_forecasts = sum(s.successful_forecasts for s in self.sessions.values())
        
        return {
            "total_sessions": total_sessions,
            "active_sessions": active_sessions,
            "idle_sessions": idle_sessions,
            "expired_sessions": expired_sessions,
            "total_messages": total_messages,
            "total_workflows": total_workflows,
            "total_forecasts": total_forecasts,
            "unique_users": len(self.user_sessions)
        }
    
    def _save_session(self, session: SessionInfo):
        """Save session to storage."""
        try:
            session_file = self.storage_path / f"{session.session_id}.json"
            with open(session_file, 'w') as f:
                json.dump(session.to_dict(), f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Failed to save session {session.session_id}: {e}")
    
    def _load_sessions(self):
        """Load sessions from storage."""
        try:
            for session_file in self.storage_path.glob("*.json"):
                try:
                    with open(session_file, 'r') as f:
                        data = json.load(f)
                    
                    # Reconstruct session object
                    session = self._reconstruct_session(data)
                    if session:
                        self.sessions[session.session_id] = session
                        
                        # Track user sessions
                        if session.user_id:
                            if session.user_id not in self.user_sessions:
                                self.user_sessions[session.user_id] = []
                            self.user_sessions[session.user_id].append(session.session_id)
                
                except Exception as e:
                    logger.error(f"Failed to load session from {session_file}: {e}")
        
        except Exception as e:
            logger.error(f"Failed to load sessions: {e}")
    
    def _reconstruct_session(self, data: Dict[str, Any]) -> Optional[SessionInfo]:
        """Reconstruct session object from dictionary."""
        try:
            # Parse timestamps
            created_at = datetime.fromisoformat(data["created_at"])
            last_activity = datetime.fromisoformat(data["last_activity"])
            
            # Reconstruct preferences
            preferences = UserPreferences.from_dict(data["preferences"])
            
            # Reconstruct context
            context_data = data["context"]
            context = ConversationContext(
                session_id=context_data["session_id"],
                user_id=context_data.get("user_id"),
                current_workflow=context_data.get("current_workflow"),
                active_agents=context_data.get("active_agents", []),
                uploaded_data=context_data.get("uploaded_data"),
                data_analysis_results=context_data.get("data_analysis_results"),
                preprocessing_results=context_data.get("preprocessing_results"),
                training_results=context_data.get("training_results"),
                forecast_results=context_data.get("forecast_results"),
                awaiting_user_input=context_data.get("awaiting_user_input", False),
                expected_input_type=context_data.get("expected_input_type"),
                conversation_phase=context_data.get("conversation_phase", "greeting"),
                context_variables=context_data.get("context_variables", {})
            )
            
            # Create session
            session = SessionInfo(
                session_id=data["session_id"],
                user_id=data.get("user_id"),
                created_at=created_at,
                last_activity=last_activity,
                status=SessionStatus(data["status"]),
                preferences=preferences,
                context=context,
                message_count=data.get("message_count", 0),
                workflow_count=data.get("workflow_count", 0),
                successful_forecasts=data.get("successful_forecasts", 0),
                idle_timeout=data.get("idle_timeout", 3600),
                max_lifetime=data.get("max_lifetime", 86400)
            )
            
            return session
            
        except Exception as e:
            logger.error(f"Failed to reconstruct session: {e}")
            return None