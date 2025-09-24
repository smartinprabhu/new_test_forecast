"""
Agent Communication System.
Handles inter-agent messaging, coordination, and status tracking.
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import json
import uuid
from collections import defaultdict, deque


logger = logging.getLogger(__name__)


class MessageType(Enum):
    """Types of messages that can be sent between agents."""
    TASK_REQUEST = "task_request"
    TASK_RESPONSE = "task_response"
    STATUS_UPDATE = "status_update"
    ERROR_REPORT = "error_report"
    COORDINATION = "coordination"
    BROADCAST = "broadcast"
    HEARTBEAT = "heartbeat"


class MessagePriority(Enum):
    """Message priority levels."""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4


@dataclass
class AgentMessage:
    """Message structure for inter-agent communication."""
    id: str
    sender_id: str
    recipient_id: Optional[str]  # None for broadcast messages
    message_type: MessageType
    priority: MessagePriority
    content: Dict[str, Any]
    timestamp: datetime = field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None
    correlation_id: Optional[str] = None  # For request-response correlation
    retry_count: int = 0
    max_retries: int = 3
    
    def is_expired(self) -> bool:
        """Check if message has expired."""
        return self.expires_at is not None and datetime.now() > self.expires_at
    
    def can_retry(self) -> bool:
        """Check if message can be retried."""
        return self.retry_count < self.max_retries


@dataclass
class AgentStatusReport:
    """Comprehensive agent status report."""
    agent_id: str
    status: str
    current_task: Optional[str]
    progress: float
    health_status: str
    performance_metrics: Dict[str, Any]
    capabilities: List[str]
    resource_usage: Dict[str, float]
    error_count: int
    last_activity: datetime
    uptime: float  # seconds
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "agent_id": self.agent_id,
            "status": self.status,
            "current_task": self.current_task,
            "progress": self.progress,
            "health_status": self.health_status,
            "performance_metrics": self.performance_metrics,
            "capabilities": self.capabilities,
            "resource_usage": self.resource_usage,
            "error_count": self.error_count,
            "last_activity": self.last_activity.isoformat(),
            "uptime": self.uptime
        }


class MessageBus:
    """Central message bus for agent communication."""
    
    def __init__(self):
        self.message_queues: Dict[str, deque] = defaultdict(deque)
        self.subscribers: Dict[MessageType, List[str]] = defaultdict(list)
        self.message_handlers: Dict[str, Dict[MessageType, Callable]] = defaultdict(dict)
        self.pending_responses: Dict[str, AgentMessage] = {}
        self.message_history: List[AgentMessage] = []
        self.max_history_size = 1000
        
    def register_agent(self, agent_id: str):
        """Register an agent with the message bus."""
        if agent_id not in self.message_queues:
            self.message_queues[agent_id] = deque()
            logger.info(f"Agent {agent_id} registered with message bus")
    
    def unregister_agent(self, agent_id: str):
        """Unregister an agent from the message bus."""
        if agent_id in self.message_queues:
            del self.message_queues[agent_id]
            # Remove from subscribers
            for message_type, subscribers in self.subscribers.items():
                if agent_id in subscribers:
                    subscribers.remove(agent_id)
            logger.info(f"Agent {agent_id} unregistered from message bus")
    
    def subscribe(self, agent_id: str, message_type: MessageType, handler: Callable):
        """Subscribe an agent to specific message types."""
        self.subscribers[message_type].append(agent_id)
        self.message_handlers[agent_id][message_type] = handler
        logger.info(f"Agent {agent_id} subscribed to {message_type.value} messages")
    
    def send_message(self, message: AgentMessage) -> bool:
        """Send a message to one or more agents."""
        try:
            # Add to history
            self.message_history.append(message)
            if len(self.message_history) > self.max_history_size:
                self.message_history.pop(0)
            
            if message.recipient_id:
                # Direct message
                if message.recipient_id in self.message_queues:
                    self.message_queues[message.recipient_id].append(message)
                    logger.debug(f"Message {message.id} sent to {message.recipient_id}")
                    return True
                else:
                    logger.warning(f"Recipient {message.recipient_id} not found")
                    return False
            else:
                # Broadcast message
                subscribers = self.subscribers.get(message.message_type, [])
                for subscriber_id in subscribers:
                    if subscriber_id != message.sender_id:  # Don't send to sender
                        self.message_queues[subscriber_id].append(message)
                logger.debug(f"Broadcast message {message.id} sent to {len(subscribers)} subscribers")
                return True
                
        except Exception as e:
            logger.error(f"Failed to send message {message.id}: {e}")
            return False
    
    def get_messages(self, agent_id: str, limit: int = 10) -> List[AgentMessage]:
        """Get pending messages for an agent."""
        if agent_id not in self.message_queues:
            return []
        
        messages = []
        queue = self.message_queues[agent_id]
        
        for _ in range(min(limit, len(queue))):
            if queue:
                message = queue.popleft()
                if not message.is_expired():
                    messages.append(message)
                else:
                    logger.debug(f"Expired message {message.id} discarded")
        
        return messages
    
    def send_request(self, sender_id: str, recipient_id: str, 
                    request_type: MessageType, content: Dict[str, Any],
                    timeout: int = 30) -> str:
        """Send a request message and return correlation ID."""
        correlation_id = str(uuid.uuid4())
        
        message = AgentMessage(
            id=str(uuid.uuid4()),
            sender_id=sender_id,
            recipient_id=recipient_id,
            message_type=request_type,
            priority=MessagePriority.NORMAL,
            content=content,
            correlation_id=correlation_id,
            expires_at=datetime.now() + timedelta(seconds=timeout)
        )
        
        if self.send_message(message):
            self.pending_responses[correlation_id] = message
            return correlation_id
        else:
            raise Exception(f"Failed to send request to {recipient_id}")
    
    def send_response(self, sender_id: str, correlation_id: str, 
                     content: Dict[str, Any]):
        """Send a response to a previous request."""
        # Find the original request
        original_request = None
        for msg in self.message_history:
            if msg.correlation_id == correlation_id:
                original_request = msg
                break
        
        if not original_request:
            logger.warning(f"No request found for correlation ID {correlation_id}")
            return
        
        response = AgentMessage(
            id=str(uuid.uuid4()),
            sender_id=sender_id,
            recipient_id=original_request.sender_id,
            message_type=MessageType.TASK_RESPONSE,
            priority=MessagePriority.NORMAL,
            content=content,
            correlation_id=correlation_id
        )
        
        self.send_message(response)
        
        # Remove from pending responses
        if correlation_id in self.pending_responses:
            del self.pending_responses[correlation_id]
    
    def broadcast(self, sender_id: str, message_type: MessageType, 
                 content: Dict[str, Any], priority: MessagePriority = MessagePriority.NORMAL):
        """Broadcast a message to all subscribers."""
        message = AgentMessage(
            id=str(uuid.uuid4()),
            sender_id=sender_id,
            recipient_id=None,  # Broadcast
            message_type=message_type,
            priority=priority,
            content=content
        )
        
        self.send_message(message)
    
    def get_pending_responses(self, timeout_seconds: int = 30) -> List[str]:
        """Get correlation IDs of requests that haven't received responses."""
        expired_correlations = []
        cutoff_time = datetime.now() - timedelta(seconds=timeout_seconds)
        
        for correlation_id, request in self.pending_responses.items():
            if request.timestamp < cutoff_time:
                expired_correlations.append(correlation_id)
        
        return expired_correlations
    
    def cleanup_expired_messages(self):
        """Clean up expired messages and pending responses."""
        # Clean up pending responses
        expired_correlations = []
        for correlation_id, request in self.pending_responses.items():
            if request.is_expired():
                expired_correlations.append(correlation_id)
        
        for correlation_id in expired_correlations:
            del self.pending_responses[correlation_id]
            logger.debug(f"Cleaned up expired request {correlation_id}")
        
        # Clean up message queues
        for agent_id, queue in self.message_queues.items():
            expired_messages = []
            for i, message in enumerate(queue):
                if message.is_expired():
                    expired_messages.append(i)
            
            # Remove expired messages (in reverse order to maintain indices)
            for i in reversed(expired_messages):
                queue.remove(queue[i])
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get message bus statistics."""
        total_queued = sum(len(queue) for queue in self.message_queues.values())
        
        return {
            "registered_agents": len(self.message_queues),
            "total_queued_messages": total_queued,
            "pending_responses": len(self.pending_responses),
            "message_history_size": len(self.message_history),
            "subscriber_counts": {
                msg_type.value: len(subscribers) 
                for msg_type, subscribers in self.subscribers.items()
            }
        }


class AgentCoordinator:
    """Coordinates agent activities and handles complex workflows."""
    
    def __init__(self, message_bus: MessageBus):
        self.message_bus = message_bus
        self.agent_statuses: Dict[str, AgentStatusReport] = {}
        self.coordination_rules: List[Callable] = []
        self.error_handlers: Dict[str, Callable] = {}
        self.status_update_interval = 10  # seconds
        
    def register_coordination_rule(self, rule: Callable):
        """Register a coordination rule function."""
        self.coordination_rules.append(rule)
        logger.info("Coordination rule registered")
    
    def register_error_handler(self, error_type: str, handler: Callable):
        """Register an error handler for specific error types."""
        self.error_handlers[error_type] = handler
        logger.info(f"Error handler registered for {error_type}")
    
    async def coordinate_agents(self, workflow_context: Dict[str, Any]) -> Dict[str, Any]:
        """Coordinate agents for a specific workflow."""
        coordination_result = {
            "success": True,
            "actions_taken": [],
            "recommendations": [],
            "warnings": []
        }
        
        try:
            # Apply coordination rules
            for rule in self.coordination_rules:
                try:
                    rule_result = await rule(self.agent_statuses, workflow_context)
                    if rule_result:
                        coordination_result["actions_taken"].extend(
                            rule_result.get("actions", [])
                        )
                        coordination_result["recommendations"].extend(
                            rule_result.get("recommendations", [])
                        )
                except Exception as e:
                    logger.error(f"Coordination rule failed: {e}")
                    coordination_result["warnings"].append(f"Rule execution failed: {e}")
            
            return coordination_result
            
        except Exception as e:
            logger.error(f"Agent coordination failed: {e}")
            coordination_result["success"] = False
            coordination_result["error"] = str(e)
            return coordination_result
    
    def update_agent_status(self, agent_id: str, status_report: AgentStatusReport):
        """Update agent status information."""
        self.agent_statuses[agent_id] = status_report
        
        # Broadcast status update
        self.message_bus.broadcast(
            sender_id="coordinator",
            message_type=MessageType.STATUS_UPDATE,
            content={
                "agent_id": agent_id,
                "status": status_report.to_dict()
            }
        )
    
    async def handle_agent_error(self, agent_id: str, error_info: Dict[str, Any]):
        """Handle agent errors with recovery mechanisms."""
        error_type = error_info.get("type", "unknown")
        
        logger.error(f"Agent {agent_id} reported error: {error_info}")
        
        # Try specific error handler
        if error_type in self.error_handlers:
            try:
                recovery_result = await self.error_handlers[error_type](
                    agent_id, error_info
                )
                logger.info(f"Error recovery attempted for {agent_id}: {recovery_result}")
                return recovery_result
            except Exception as e:
                logger.error(f"Error handler failed for {agent_id}: {e}")
        
        # Default error handling
        return await self._default_error_recovery(agent_id, error_info)
    
    async def _default_error_recovery(self, agent_id: str, error_info: Dict[str, Any]) -> Dict[str, Any]:
        """Default error recovery mechanism."""
        recovery_actions = []
        
        # Check if agent is responsive
        try:
            correlation_id = self.message_bus.send_request(
                sender_id="coordinator",
                recipient_id=agent_id,
                request_type=MessageType.HEARTBEAT,
                content={"ping": True},
                timeout=5
            )
            
            # Wait for response
            await asyncio.sleep(1)
            
            # Check if response received
            if correlation_id not in self.message_bus.pending_responses:
                recovery_actions.append("Agent responded to heartbeat")
            else:
                recovery_actions.append("Agent not responding - may need restart")
                
        except Exception as e:
            recovery_actions.append(f"Heartbeat failed: {e}")
        
        return {
            "success": len(recovery_actions) > 0,
            "actions": recovery_actions,
            "recommendation": "Monitor agent closely"
        }
    
    def get_system_health(self) -> Dict[str, Any]:
        """Get overall system health status."""
        total_agents = len(self.agent_statuses)
        healthy_agents = sum(
            1 for status in self.agent_statuses.values() 
            if status.health_status == "healthy"
        )
        
        error_agents = sum(
            1 for status in self.agent_statuses.values() 
            if status.error_count > 0
        )
        
        avg_uptime = (
            sum(status.uptime for status in self.agent_statuses.values()) / total_agents
            if total_agents > 0 else 0
        )
        
        return {
            "total_agents": total_agents,
            "healthy_agents": healthy_agents,
            "error_agents": error_agents,
            "health_percentage": (healthy_agents / total_agents * 100) if total_agents > 0 else 0,
            "average_uptime": avg_uptime,
            "system_status": "healthy" if healthy_agents == total_agents else "degraded"
        }


# Default coordination rules
async def load_balancing_rule(agent_statuses: Dict[str, AgentStatusReport], 
                            workflow_context: Dict[str, Any]) -> Dict[str, Any]:
    """Coordination rule for load balancing."""
    actions = []
    recommendations = []
    
    # Find overloaded agents
    overloaded_agents = [
        agent_id for agent_id, status in agent_statuses.items()
        if status.resource_usage.get("cpu", 0) > 80
    ]
    
    if overloaded_agents:
        recommendations.append(f"Consider redistributing load from agents: {overloaded_agents}")
    
    # Find idle agents that could help
    idle_agents = [
        agent_id for agent_id, status in agent_statuses.items()
        if status.status == "idle" and status.health_status == "healthy"
    ]
    
    if idle_agents and overloaded_agents:
        actions.append(f"Recommend task redistribution from {overloaded_agents} to {idle_agents}")
    
    return {"actions": actions, "recommendations": recommendations}


async def error_recovery_rule(agent_statuses: Dict[str, AgentStatusReport], 
                            workflow_context: Dict[str, Any]) -> Dict[str, Any]:
    """Coordination rule for error recovery."""
    actions = []
    
    # Find agents with high error counts
    error_prone_agents = [
        agent_id for agent_id, status in agent_statuses.items()
        if status.error_count > 5
    ]
    
    for agent_id in error_prone_agents:
        actions.append(f"Agent {agent_id} has high error count - recommend health check")
    
    return {"actions": actions, "recommendations": []}


# Global instances
message_bus = MessageBus()
agent_coordinator = AgentCoordinator(message_bus)

# Register default coordination rules
agent_coordinator.register_coordination_rule(load_balancing_rule)
agent_coordinator.register_coordination_rule(error_recovery_rule)