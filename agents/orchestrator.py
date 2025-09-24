"""
Enhanced Agent Orchestrator for Agentic Chatbot.
Manages and coordinates multiple specialized agents for different forecasting tasks.
Enhanced with sophisticated lifecycle management, task queuing, and resource allocation.
"""

from typing import Dict, List, Optional, Any, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import asyncio
import uuid
import logging
from collections import defaultdict, deque
import json

# Import communication system
from .communication import (
    MessageBus, AgentCoordinator, AgentMessage, MessageType, MessagePriority,
    AgentStatusReport, message_bus, agent_coordinator
)


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AgentType(Enum):
    """Types of agents available in the system."""
    DATA_ANALYST = "data_analyst"
    PREPROCESSING = "preprocessing"
    MODEL_TRAINER = "model_trainer"
    EVALUATOR = "evaluator"
    FORECASTER = "forecaster"
    SUPERVISOR = "supervisor"


class AgentStatus(Enum):
    """Agent status states."""
    IDLE = "idle"
    BUSY = "busy"
    COMPLETED = "completed"
    ERROR = "error"
    PAUSED = "paused"
    INITIALIZING = "initializing"
    TERMINATING = "terminating"


class TaskStatus(Enum):
    """Task status states."""
    PENDING = "pending"
    ASSIGNED = "assigned"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    WAITING_DEPENDENCIES = "waiting_dependencies"


class TaskPriority(Enum):
    """Task priority levels."""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4


@dataclass
class AgentCapability:
    """Represents an agent capability."""
    name: str
    description: str
    input_types: List[str]
    output_types: List[str]
    estimated_time: int  # in seconds
    resource_requirements: Dict[str, Any] = field(default_factory=dict)
    success_rate: float = 1.0
    average_execution_time: float = 0.0


@dataclass
class AgentPerformance:
    """Agent performance metrics."""
    tasks_completed: int = 0
    tasks_failed: int = 0
    total_execution_time: float = 0.0
    average_execution_time: float = 0.0
    success_rate: float = 1.0
    last_performance_update: datetime = field(default_factory=datetime.now)
    
    def update_performance(self, execution_time: float, success: bool):
        """Update performance metrics after task completion."""
        if success:
            self.tasks_completed += 1
        else:
            self.tasks_failed += 1
        
        self.total_execution_time += execution_time
        total_tasks = self.tasks_completed + self.tasks_failed
        
        if total_tasks > 0:
            self.average_execution_time = self.total_execution_time / total_tasks
            self.success_rate = self.tasks_completed / total_tasks
        
        self.last_performance_update = datetime.now()


@dataclass
class ResourceRequirement:
    """Resource requirement specification."""
    resource_type: str
    amount: float
    unit: str
    description: str = ""


@dataclass
class Agent:
    """Enhanced agent class with lifecycle management."""
    id: str
    name: str
    type: AgentType
    status: AgentStatus = AgentStatus.IDLE
    capabilities: List[AgentCapability] = field(default_factory=list)
    current_task: Optional[str] = None
    progress: float = 0.0
    performance: AgentPerformance = field(default_factory=AgentPerformance)
    created_at: datetime = field(default_factory=datetime.now)
    last_activity: datetime = field(default_factory=datetime.now)
    max_concurrent_tasks: int = 1
    current_load: float = 0.0
    health_status: str = "healthy"
    error_count: int = 0
    last_error: Optional[str] = None
    configuration: Dict[str, Any] = field(default_factory=dict)
    
    def update_activity(self):
        """Update last activity timestamp."""
        self.last_activity = datetime.now()
    
    def is_available(self) -> bool:
        """Check if agent is available for new tasks."""
        return (self.status == AgentStatus.IDLE and 
                self.current_load < 1.0 and 
                self.health_status == "healthy")
    
    def can_handle_task(self, task_type: str) -> bool:
        """Check if agent can handle a specific task type."""
        return any(cap.name == task_type for cap in self.capabilities)
    
    def get_capability(self, capability_name: str) -> Optional[AgentCapability]:
        """Get specific capability by name."""
        return next((cap for cap in self.capabilities if cap.name == capability_name), None)


@dataclass
class Task:
    """Enhanced task representation with dependencies and lifecycle."""
    id: str
    name: str
    type: str
    agent_type: AgentType
    priority: TaskPriority = TaskPriority.NORMAL
    parameters: Dict[str, Any] = field(default_factory=dict)
    dependencies: List[str] = field(default_factory=list)
    status: TaskStatus = TaskStatus.PENDING
    created_at: datetime = field(default_factory=datetime.now)
    assigned_agent: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    timeout: Optional[int] = None  # seconds
    resource_requirements: List[ResourceRequirement] = field(default_factory=list)
    callback: Optional[Callable] = None
    
    @property
    def execution_time(self) -> Optional[float]:
        """Calculate task execution time."""
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None
    
    @property
    def is_ready(self) -> bool:
        """Check if task is ready to be executed (dependencies met)."""
        return self.status in [TaskStatus.PENDING, TaskStatus.WAITING_DEPENDENCIES]
    
    def can_retry(self) -> bool:
        """Check if task can be retried."""
        return self.retry_count < self.max_retries


@dataclass
class WorkflowStep:
    """Represents a step in a workflow."""
    id: str
    name: str
    task_type: str
    agent_type: AgentType
    parameters: Dict[str, Any] = field(default_factory=dict)
    dependencies: List[str] = field(default_factory=list)
    optional: bool = False
    timeout: Optional[int] = None
    retry_policy: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Workflow:
    """Represents a complete workflow."""
    id: str
    name: str
    description: str
    steps: List[WorkflowStep] = field(default_factory=list)
    status: str = "created"
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    current_step: int = 0
    progress: float = 0.0
    results: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None


class TaskQueue:
    """Priority-based task queue with dependency management."""
    
    def __init__(self):
        self.queues = {
            TaskPriority.CRITICAL: deque(),
            TaskPriority.HIGH: deque(),
            TaskPriority.NORMAL: deque(),
            TaskPriority.LOW: deque()
        }
        self.waiting_dependencies = {}
        self.completed_tasks = set()
    
    def add_task(self, task: Task):
        """Add task to appropriate priority queue."""
        if self._dependencies_met(task):
            self.queues[task.priority].append(task)
            logger.info(f"Task {task.id} added to {task.priority.name} priority queue")
        else:
            self.waiting_dependencies[task.id] = task
            task.status = TaskStatus.WAITING_DEPENDENCIES
            logger.info(f"Task {task.id} waiting for dependencies: {task.dependencies}")
    
    def get_next_task(self, agent_type: AgentType = None) -> Optional[Task]:
        """Get next task from queue, optionally filtered by agent type."""
        for priority in [TaskPriority.CRITICAL, TaskPriority.HIGH, TaskPriority.NORMAL, TaskPriority.LOW]:
            queue = self.queues[priority]
            for i, task in enumerate(queue):
                if agent_type is None or task.agent_type == agent_type:
                    return queue.popleft() if i == 0 else queue.remove(task) or task
        return None
    
    def mark_task_completed(self, task_id: str):
        """Mark task as completed and check for dependent tasks."""
        self.completed_tasks.add(task_id)
        
        # Check waiting tasks for newly satisfied dependencies
        ready_tasks = []
        for waiting_task_id, waiting_task in list(self.waiting_dependencies.items()):
            if self._dependencies_met(waiting_task):
                ready_tasks.append(waiting_task)
                del self.waiting_dependencies[waiting_task_id]
        
        # Add ready tasks to appropriate queues
        for task in ready_tasks:
            task.status = TaskStatus.PENDING
            self.queues[task.priority].append(task)
            logger.info(f"Task {task.id} dependencies satisfied, moved to queue")
    
    def _dependencies_met(self, task: Task) -> bool:
        """Check if all task dependencies are completed."""
        return all(dep_id in self.completed_tasks for dep_id in task.dependencies)
    
    def get_queue_status(self) -> Dict[str, int]:
        """Get current queue status."""
        return {
            "critical": len(self.queues[TaskPriority.CRITICAL]),
            "high": len(self.queues[TaskPriority.HIGH]),
            "normal": len(self.queues[TaskPriority.NORMAL]),
            "low": len(self.queues[TaskPriority.LOW]),
            "waiting_dependencies": len(self.waiting_dependencies)
        }


class ResourceManager:
    """Manages system resources and allocation."""
    
    def __init__(self):
        self.available_resources = {
            "cpu": 100.0,
            "memory": 100.0,
            "network": 100.0,
            "storage": 100.0
        }
        self.allocated_resources = defaultdict(float)
        self.resource_reservations = {}
    
    def can_allocate(self, requirements: List[ResourceRequirement]) -> bool:
        """Check if resources can be allocated."""
        for req in requirements:
            available = self.available_resources.get(req.resource_type, 0)
            allocated = self.allocated_resources.get(req.resource_type, 0)
            if (available - allocated) < req.amount:
                return False
        return True
    
    def allocate_resources(self, task_id: str, requirements: List[ResourceRequirement]) -> bool:
        """Allocate resources for a task."""
        if not self.can_allocate(requirements):
            return False
        
        for req in requirements:
            self.allocated_resources[req.resource_type] += req.amount
        
        self.resource_reservations[task_id] = requirements
        return True
    
    def release_resources(self, task_id: str):
        """Release resources allocated to a task."""
        if task_id in self.resource_reservations:
            requirements = self.resource_reservations[task_id]
            for req in requirements:
                self.allocated_resources[req.resource_type] -= req.amount
            del self.resource_reservations[task_id]
    
    def get_resource_utilization(self) -> Dict[str, float]:
        """Get current resource utilization."""
        utilization = {}
        for resource_type, total in self.available_resources.items():
            allocated = self.allocated_resources.get(resource_type, 0)
            utilization[resource_type] = (allocated / total) * 100 if total > 0 else 0
        return utilization


class EnhancedAgentOrchestrator:
    """
    Enhanced orchestrator with sophisticated agent lifecycle management,
    task queuing, resource allocation, and workflow coordination.
    """
    
    def __init__(self, session_manager=None):
        self.agents: Dict[str, Agent] = {}
        self.tasks: Dict[str, Task] = {}
        self.workflows: Dict[str, Workflow] = {}
        self.task_queue = TaskQueue()
        self.resource_manager = ResourceManager()
        self.active_tasks: Dict[str, asyncio.Task] = {}
        self.event_callbacks: Dict[str, List[Callable]] = defaultdict(list)
        self.health_check_interval = 30  # seconds
        self.cleanup_interval = 300  # seconds
        self.session_manager = session_manager
        
        # Communication system
        self.message_bus = message_bus
        self.coordinator = agent_coordinator
        
        # Initialize default agents
        self._initialize_default_agents()
        
        # Background tasks will be started when the event loop is available
        self._background_tasks_started = False
    
    def _initialize_default_agents(self):
        """Initialize the default set of specialized agents."""
        
        # Data Analyst Agent
        data_analyst = Agent(
            id="data_analyst_001",
            name="Data Analysis Specialist",
            type=AgentType.DATA_ANALYST,
            capabilities=[
                AgentCapability(
                    name="data_quality_assessment",
                    description="Comprehensive data quality analysis",
                    input_types=["dataframe", "csv", "json"],
                    output_types=["quality_report", "recommendations"],
                    estimated_time=45,
                    resource_requirements={"cpu": 20, "memory": 30}
                ),
                AgentCapability(
                    name="pattern_detection",
                    description="Advanced pattern and trend detection",
                    input_types=["dataframe", "time_series"],
                    output_types=["pattern_report", "insights"],
                    estimated_time=60,
                    resource_requirements={"cpu": 30, "memory": 40}
                ),
                AgentCapability(
                    name="statistical_analysis",
                    description="Statistical analysis and hypothesis testing",
                    input_types=["dataframe", "metrics"],
                    output_types=["statistical_report", "test_results"],
                    estimated_time=90,
                    resource_requirements={"cpu": 25, "memory": 35}
                ),
                AgentCapability(
                    name="correlation_analysis",
                    description="Feature correlation and relationship analysis",
                    input_types=["dataframe", "features"],
                    output_types=["correlation_matrix", "feature_importance"],
                    estimated_time=30,
                    resource_requirements={"cpu": 15, "memory": 25}
                )
            ],
            configuration={
                "analysis_depth": "comprehensive",
                "statistical_confidence": 0.95,
                "pattern_sensitivity": "medium"
            }
        )
        
        # Preprocessing Agent
        preprocessing_agent = Agent(
            id="preprocessing_001",
            name="Data Preprocessing Specialist",
            type=AgentType.PREPROCESSING,
            capabilities=[
                AgentCapability(
                    name="data_cleaning",
                    description="Advanced data cleaning and validation",
                    input_types=["dataframe", "raw_data"],
                    output_types=["cleaned_dataframe", "cleaning_report"],
                    estimated_time=120,
                    resource_requirements={"cpu": 25, "memory": 50}
                ),
                AgentCapability(
                    name="feature_engineering",
                    description="Intelligent feature creation and selection",
                    input_types=["dataframe", "feature_config"],
                    output_types=["enhanced_dataframe", "feature_report"],
                    estimated_time=180,
                    resource_requirements={"cpu": 35, "memory": 60}
                ),
                AgentCapability(
                    name="outlier_detection",
                    description="Multi-method outlier detection and handling",
                    input_types=["dataframe", "outlier_config"],
                    output_types=["processed_dataframe", "outlier_report"],
                    estimated_time=75,
                    resource_requirements={"cpu": 20, "memory": 30}
                ),
                AgentCapability(
                    name="data_transformation",
                    description="Data scaling, normalization, and encoding",
                    input_types=["dataframe", "transform_config"],
                    output_types=["transformed_dataframe", "transform_metadata"],
                    estimated_time=60,
                    resource_requirements={"cpu": 15, "memory": 25}
                )
            ],
            configuration={
                "outlier_method": "isolation_forest",
                "scaling_method": "robust",
                "missing_value_strategy": "intelligent"
            }
        )
        
        # Model Trainer Agent
        model_trainer = Agent(
            id="model_trainer_001",
            name="ML Model Training Specialist",
            type=AgentType.MODEL_TRAINER,
            capabilities=[
                AgentCapability(
                    name="algorithm_training",
                    description="Multi-algorithm model training and optimization",
                    input_types=["dataframe", "training_config"],
                    output_types=["trained_models", "training_report"],
                    estimated_time=600,
                    resource_requirements={"cpu": 70, "memory": 80}
                ),
                AgentCapability(
                    name="hyperparameter_tuning",
                    description="Advanced hyperparameter optimization",
                    input_types=["model", "tuning_config"],
                    output_types=["optimized_model", "tuning_results"],
                    estimated_time=900,
                    resource_requirements={"cpu": 80, "memory": 70}
                ),
                AgentCapability(
                    name="cross_validation",
                    description="Comprehensive model validation",
                    input_types=["model", "validation_config"],
                    output_types=["validation_results", "cv_metrics"],
                    estimated_time=300,
                    resource_requirements={"cpu": 40, "memory": 50}
                ),
                AgentCapability(
                    name="ensemble_creation",
                    description="Model ensemble creation and optimization",
                    input_types=["models", "ensemble_config"],
                    output_types=["ensemble_model", "ensemble_report"],
                    estimated_time=240,
                    resource_requirements={"cpu": 50, "memory": 60}
                )
            ],
            configuration={
                "default_algorithms": ["prophet", "xgboost", "lightgbm"],
                "tuning_method": "bayesian",
                "validation_strategy": "time_series_split"
            }
        )
        
        # Evaluator Agent
        evaluator = Agent(
            id="evaluator_001",
            name="Model Evaluation Specialist",
            type=AgentType.EVALUATOR,
            capabilities=[
                AgentCapability(
                    name="performance_evaluation",
                    description="Comprehensive model performance assessment",
                    input_types=["models", "test_data", "metrics_config"],
                    output_types=["performance_report", "detailed_metrics"],
                    estimated_time=120,
                    resource_requirements={"cpu": 30, "memory": 40}
                ),
                AgentCapability(
                    name="model_comparison",
                    description="Advanced model comparison and ranking",
                    input_types=["models", "comparison_config"],
                    output_types=["comparison_report", "rankings"],
                    estimated_time=90,
                    resource_requirements={"cpu": 25, "memory": 35}
                ),
                AgentCapability(
                    name="result_interpretation",
                    description="Business-focused result interpretation",
                    input_types=["metrics", "business_context"],
                    output_types=["interpretation_report", "recommendations"],
                    estimated_time=60,
                    resource_requirements={"cpu": 15, "memory": 20}
                ),
                AgentCapability(
                    name="bias_detection",
                    description="Model bias and fairness analysis",
                    input_types=["model", "fairness_config"],
                    output_types=["bias_report", "fairness_metrics"],
                    estimated_time=150,
                    resource_requirements={"cpu": 35, "memory": 45}
                )
            ],
            configuration={
                "primary_metrics": ["mape", "mae", "rmse"],
                "business_metrics": ["accuracy", "precision", "recall"],
                "confidence_level": 0.95
            }
        )
        
        # Forecaster Agent
        forecaster = Agent(
            id="forecaster_001",
            name="Forecasting Specialist",
            type=AgentType.FORECASTER,
            capabilities=[
                AgentCapability(
                    name="forecast_generation",
                    description="Advanced forecast generation with uncertainty",
                    input_types=["model", "forecast_config"],
                    output_types=["forecast_results", "confidence_intervals"],
                    estimated_time=90,
                    resource_requirements={"cpu": 30, "memory": 40}
                ),
                AgentCapability(
                    name="scenario_analysis",
                    description="Multi-scenario forecasting and analysis",
                    input_types=["model", "scenarios"],
                    output_types=["scenario_forecasts", "scenario_analysis"],
                    estimated_time=180,
                    resource_requirements={"cpu": 40, "memory": 50}
                ),
                AgentCapability(
                    name="forecast_explanation",
                    description="Forecast interpretation and explanation",
                    input_types=["forecast", "explanation_config"],
                    output_types=["explanation_report", "key_drivers"],
                    estimated_time=45,
                    resource_requirements={"cpu": 20, "memory": 25}
                ),
                AgentCapability(
                    name="uncertainty_quantification",
                    description="Advanced uncertainty analysis",
                    input_types=["forecast", "uncertainty_config"],
                    output_types=["uncertainty_analysis", "risk_assessment"],
                    estimated_time=75,
                    resource_requirements={"cpu": 25, "memory": 30}
                )
            ],
            configuration={
                "default_horizon": 30,
                "confidence_intervals": [0.8, 0.95],
                "uncertainty_method": "quantile_regression"
            }
        )
        
        # Supervisor Agent
        supervisor = Agent(
            id="supervisor_001",
            name="Workflow Supervisor",
            type=AgentType.SUPERVISOR,
            capabilities=[
                AgentCapability(
                    name="workflow_coordination",
                    description="Intelligent workflow orchestration",
                    input_types=["workflow_plan", "agent_status"],
                    output_types=["coordination_plan", "execution_schedule"],
                    estimated_time=30,
                    resource_requirements={"cpu": 10, "memory": 15}
                ),
                AgentCapability(
                    name="task_delegation",
                    description="Optimal task assignment and load balancing",
                    input_types=["tasks", "agent_capabilities"],
                    output_types=["task_assignments", "load_distribution"],
                    estimated_time=15,
                    resource_requirements={"cpu": 5, "memory": 10}
                ),
                AgentCapability(
                    name="progress_monitoring",
                    description="Real-time progress tracking and reporting",
                    input_types=["workflow_state", "agent_status"],
                    output_types=["progress_report", "status_updates"],
                    estimated_time=10,
                    resource_requirements={"cpu": 5, "memory": 10}
                ),
                AgentCapability(
                    name="error_recovery",
                    description="Intelligent error handling and recovery",
                    input_types=["error_context", "recovery_options"],
                    output_types=["recovery_plan", "corrective_actions"],
                    estimated_time=20,
                    resource_requirements={"cpu": 10, "memory": 15}
                )
            ],
            configuration={
                "monitoring_interval": 5,
                "load_balancing_strategy": "capability_based",
                "error_tolerance": "medium"
            }
        )
        
        # Register all agents
        for agent in [data_analyst, preprocessing_agent, model_trainer, evaluator, forecaster, supervisor]:
            self.agents[agent.id] = agent
            
            # Register agent with communication system
            self.message_bus.register_agent(agent.id)
            
            # Subscribe to relevant message types
            self.message_bus.subscribe(agent.id, MessageType.TASK_REQUEST, self._handle_task_request)
            self.message_bus.subscribe(agent.id, MessageType.STATUS_UPDATE, self._handle_status_update)
            self.message_bus.subscribe(agent.id, MessageType.ERROR_REPORT, self._handle_error_report)
            
            logger.info(f"Initialized agent: {agent.name} ({agent.id})")
    
    async def _health_check_loop(self):
        """Background task for agent health monitoring."""
        while True:
            try:
                await self._perform_health_checks()
                await asyncio.sleep(self.health_check_interval)
            except Exception as e:
                logger.error(f"Health check error: {e}")
                await asyncio.sleep(self.health_check_interval)
    
    async def _cleanup_loop(self):
        """Background task for system cleanup."""
        while True:
            try:
                await self._perform_cleanup()
                await asyncio.sleep(self.cleanup_interval)
            except Exception as e:
                logger.error(f"Cleanup error: {e}")
                await asyncio.sleep(self.cleanup_interval)
    
    async def _task_scheduler_loop(self):
        """Background task scheduler."""
        while True:
            try:
                await self._schedule_pending_tasks()
                await asyncio.sleep(5)  # Check every 5 seconds
            except Exception as e:
                logger.error(f"Task scheduler error: {e}")
                await asyncio.sleep(5)
    
    async def _perform_health_checks(self):
        """Perform health checks on all agents."""
        for agent in self.agents.values():
            # Check if agent is responsive
            if agent.status == AgentStatus.BUSY:
                time_since_activity = datetime.now() - agent.last_activity
                if time_since_activity > timedelta(minutes=10):  # 10 minute timeout
                    logger.warning(f"Agent {agent.id} appears unresponsive")
                    agent.health_status = "unresponsive"
                    agent.error_count += 1
            
            # Reset healthy agents
            if agent.health_status != "healthy" and agent.status == AgentStatus.IDLE:
                agent.health_status = "healthy"
                agent.error_count = 0
    
    async def _perform_cleanup(self):
        """Perform system cleanup tasks."""
        # Clean up completed tasks older than 1 hour
        cutoff_time = datetime.now() - timedelta(hours=1)
        completed_tasks = [
            task_id for task_id, task in self.tasks.items()
            if task.status == TaskStatus.COMPLETED and task.completed_at and task.completed_at < cutoff_time
        ]
        
        for task_id in completed_tasks:
            del self.tasks[task_id]
            logger.info(f"Cleaned up completed task: {task_id}")
        
        # Clean up failed tasks older than 24 hours
        failed_cutoff = datetime.now() - timedelta(hours=24)
        failed_tasks = [
            task_id for task_id, task in self.tasks.items()
            if task.status == TaskStatus.FAILED and task.completed_at and task.completed_at < failed_cutoff
        ]
        
        for task_id in failed_tasks:
            del self.tasks[task_id]
            logger.info(f"Cleaned up failed task: {task_id}")
    
    async def _schedule_pending_tasks(self):
        """Schedule pending tasks to available agents."""
        # Get available agents
        available_agents = [agent for agent in self.agents.values() if agent.is_available()]
        
        if not available_agents:
            return
        
        # Try to assign tasks
        for agent in available_agents:
            task = self.task_queue.get_next_task(agent.type)
            if task:
                success = await self.assign_task(task.id, agent.id)
                if success:
                    # Start task execution
                    asyncio.create_task(self._execute_task_async(task.id))
    
    async def _message_processing_loop(self):
        """Background task for processing inter-agent messages."""
        while True:
            try:
                # Process messages for each agent
                for agent_id in self.agents.keys():
                    messages = self.message_bus.get_messages(agent_id, limit=5)
                    
                    for message in messages:
                        try:
                            # Handle message based on type
                            if message.message_type == MessageType.TASK_REQUEST:
                                await self._handle_task_request(message)
                            elif message.message_type == MessageType.STATUS_UPDATE:
                                await self._handle_status_update(message)
                            elif message.message_type == MessageType.ERROR_REPORT:
                                await self._handle_error_report(message)
                            elif message.message_type == MessageType.HEARTBEAT:
                                # Respond to heartbeat
                                if message.correlation_id:
                                    self.message_bus.send_response(
                                        sender_id=agent_id,
                                        correlation_id=message.correlation_id,
                                        content={"pong": True, "timestamp": datetime.now().isoformat()}
                                    )
                        except Exception as e:
                            logger.error(f"Failed to process message {message.id}: {e}")
                
                await asyncio.sleep(1)  # Process messages every second
                
            except Exception as e:
                logger.error(f"Message processing loop error: {e}")
                await asyncio.sleep(5)
    
    async def _communication_cleanup_loop(self):
        """Background task for cleaning up communication system."""
        while True:
            try:
                # Clean up expired messages and responses
                self.message_bus.cleanup_expired_messages()
                
                # Check for agents that haven't sent heartbeats
                for agent_id, agent in self.agents.items():
                    time_since_activity = datetime.now() - agent.last_activity
                    if time_since_activity > timedelta(minutes=5):  # 5 minute timeout
                        logger.warning(f"Agent {agent_id} inactive for {time_since_activity}")
                        
                        # Send heartbeat request
                        try:
                            self.message_bus.send_request(
                                sender_id="orchestrator",
                                recipient_id=agent_id,
                                request_type=MessageType.HEARTBEAT,
                                content={"ping": True},
                                timeout=10
                            )
                        except Exception as e:
                            logger.error(f"Failed to send heartbeat to {agent_id}: {e}")
                
                await asyncio.sleep(60)  # Cleanup every minute
                
            except Exception as e:
                logger.error(f"Communication cleanup error: {e}")
                await asyncio.sleep(60)
    
    def start_background_tasks(self):
        """Start background tasks when event loop is available."""
        if not self._background_tasks_started:
            try:
                asyncio.create_task(self._health_check_loop())
                asyncio.create_task(self._cleanup_loop())
                asyncio.create_task(self._task_scheduler_loop())
                asyncio.create_task(self._message_processing_loop())
                asyncio.create_task(self._communication_cleanup_loop())
                self._background_tasks_started = True
                logger.info("Background tasks started successfully")
            except RuntimeError as e:
                logger.warning(f"Could not start background tasks: {e}")
    
    # Core orchestrator methods
    def create_agent(self, agent_type: AgentType, name: str, 
                    capabilities: List[AgentCapability] = None,
                    configuration: Dict[str, Any] = None) -> Agent:
        """Create a new agent with specified capabilities."""
        agent = Agent(
            id=str(uuid.uuid4()),
            name=name,
            type=agent_type,
            capabilities=capabilities or [],
            configuration=configuration or {}
        )
        
        self.agents[agent.id] = agent
        logger.info(f"Created new agent: {name} ({agent.id})")
        return agent
    
    def get_agent(self, agent_id: str) -> Optional[Agent]:
        """Get agent by ID."""
        return self.agents.get(agent_id)
    
    def get_agents_by_type(self, agent_type: AgentType) -> List[Agent]:
        """Get all agents of a specific type."""
        return [agent for agent in self.agents.values() if agent.type == agent_type]
    
    def get_available_agents(self, agent_type: AgentType = None) -> List[Agent]:
        """Get all available agents, optionally filtered by type."""
        available = [agent for agent in self.agents.values() if agent.is_available()]
        if agent_type:
            available = [agent for agent in available if agent.type == agent_type]
        return available
    
    def create_task(self, name: str, task_type: str, agent_type: AgentType,
                   parameters: Dict[str, Any] = None,
                   dependencies: List[str] = None,
                   priority: TaskPriority = TaskPriority.NORMAL,
                   timeout: int = None,
                   callback: Callable = None) -> Task:
        """Create a new task with enhanced options."""
        task = Task(
            id=str(uuid.uuid4()),
            name=name,
            type=task_type,
            agent_type=agent_type,
            parameters=parameters or {},
            dependencies=dependencies or [],
            priority=priority,
            timeout=timeout,
            callback=callback
        )
        
        self.tasks[task.id] = task
        self.task_queue.add_task(task)
        
        logger.info(f"Created task: {name} ({task.id}) with priority {priority.name}")
        return task
    
    async def assign_task(self, task_id: str, agent_id: str = None) -> bool:
        """Assign a task to an agent with resource checking."""
        task = self.tasks.get(task_id)
        if not task or task.status != TaskStatus.PENDING:
            return False
        
        # Find suitable agent if not specified
        if not agent_id:
            suitable_agents = [
                agent for agent in self.get_available_agents(task.agent_type)
                if agent.can_handle_task(task.type)
            ]
            if not suitable_agents:
                return False
            
            # Select best agent based on performance and load
            agent = min(suitable_agents, key=lambda a: (a.current_load, -a.performance.success_rate))
            agent_id = agent.id
        
        agent = self.get_agent(agent_id)
        if not agent or not agent.is_available():
            return False
        
        # Check resource requirements
        if task.resource_requirements:
            if not self.resource_manager.can_allocate(task.resource_requirements):
                logger.warning(f"Insufficient resources for task {task_id}")
                return False
            
            self.resource_manager.allocate_resources(task_id, task.resource_requirements)
        
        # Assign task
        task.assigned_agent = agent_id
        task.status = TaskStatus.ASSIGNED
        agent.current_task = task.name
        agent.status = AgentStatus.BUSY
        agent.current_load = min(1.0, agent.current_load + 0.5)  # Increase load
        agent.update_activity()
        
        logger.info(f"Assigned task {task_id} to agent {agent_id}")
        return True
    
    async def _execute_task_async(self, task_id: str) -> Dict[str, Any]:
        """Execute a task asynchronously with full lifecycle management."""
        task = self.tasks.get(task_id)
        if not task or not task.assigned_agent:
            return {"success": False, "error": "Task not found or not assigned"}
        
        agent = self.get_agent(task.assigned_agent)
        if not agent:
            return {"success": False, "error": "Agent not found"}
        
        try:
            # Start task execution
            task.status = TaskStatus.RUNNING
            task.started_at = datetime.now()
            agent.progress = 0.0
            
            logger.info(f"Starting execution of task {task_id} on agent {agent.id}")
            
            # Get capability for this task type
            capability = agent.get_capability(task.type)
            if not capability:
                raise Exception(f"Agent {agent.id} lacks capability for task type {task.type}")
            
            # Execute task using specialized agent
            try:
                from .specialized_agents import create_specialized_agent
                specialized_agent = create_specialized_agent(agent, self.session_manager)
                task_result = await specialized_agent.execute_capability(task.type, task)
            except ImportError:
                # Fallback to simulation if specialized agents not available
                logger.warning("Specialized agents not available, using simulation")
                await asyncio.sleep(0.1)
                task_result = {
                    "success": True,
                    "message": f"Task {task.name} completed (simulated)",
                    "capability_used": task.type
                }
            
            # Complete task successfully
            task.status = TaskStatus.COMPLETED
            task.completed_at = datetime.now()
            task.result = {
                "success": True,
                "execution_time": task.execution_time,
                "agent_id": agent.id,
                "capability_used": task.type,
                **task_result
            }
            
            # Update agent performance
            agent.performance.update_performance(task.execution_time, True)
            agent.status = AgentStatus.COMPLETED
            agent.current_task = None
            agent.progress = 100.0
            agent.current_load = max(0.0, agent.current_load - 0.5)
            agent.update_activity()
            
            # Release resources
            if task.resource_requirements:
                self.resource_manager.release_resources(task_id)
            
            # Mark task as completed in queue
            self.task_queue.mark_task_completed(task_id)
            
            # Execute callback if provided
            if task.callback:
                try:
                    await task.callback(task.result)
                except Exception as callback_error:
                    logger.error(f"Task callback error: {callback_error}")
            
            # Trigger completion event
            await self._trigger_event("task_completed", {
                "task_id": task_id,
                "agent_id": agent.id,
                "result": task.result
            })
            
            logger.info(f"Task {task_id} completed successfully in {task.execution_time:.2f} seconds")
            return task.result
            
        except Exception as e:
            # Handle task failure
            task.status = TaskStatus.FAILED
            task.completed_at = datetime.now()
            task.error = str(e)
            
            # Update agent performance
            if task.execution_time:
                agent.performance.update_performance(task.execution_time, False)
            
            agent.status = AgentStatus.ERROR
            agent.current_task = None
            agent.progress = 0.0
            agent.current_load = max(0.0, agent.current_load - 0.5)
            agent.last_error = str(e)
            agent.error_count += 1
            agent.update_activity()
            
            # Release resources
            if task.resource_requirements:
                self.resource_manager.release_resources(task_id)
            
            # Check if task can be retried
            if task.can_retry():
                task.retry_count += 1
                task.status = TaskStatus.PENDING
                task.assigned_agent = None
                self.task_queue.add_task(task)
                logger.warning(f"Task {task_id} failed, retrying (attempt {task.retry_count})")
            else:
                logger.error(f"Task {task_id} failed permanently: {e}")
            
            # Trigger failure event
            await self._trigger_event("task_failed", {
                "task_id": task_id,
                "agent_id": agent.id,
                "error": str(e),
                "retry_count": task.retry_count
            })
            
            return {"success": False, "error": str(e)}
        
        finally:
            # Reset agent to idle if not in error state
            if agent.status not in [AgentStatus.ERROR, AgentStatus.PAUSED]:
                agent.status = AgentStatus.IDLE
    
    def register_event_callback(self, event_type: str, callback: Callable):
        """Register a callback for specific events."""
        self.event_callbacks[event_type].append(callback)
    
    async def _trigger_event(self, event_type: str, event_data: Dict[str, Any]):
        """Trigger event callbacks."""
        for callback in self.event_callbacks.get(event_type, []):
            try:
                await callback(event_data)
            except Exception as e:
                logger.error(f"Event callback error for {event_type}: {e}")
    
    # Communication system handlers
    async def _handle_task_request(self, message: AgentMessage):
        """Handle task request messages."""
        try:
            task_data = message.content
            task = self.create_task(
                name=task_data.get("name", "Requested Task"),
                task_type=task_data.get("type", "general"),
                agent_type=AgentType(task_data.get("agent_type", "supervisor")),
                parameters=task_data.get("parameters", {}),
                priority=TaskPriority(task_data.get("priority", TaskPriority.NORMAL.value))
            )
            
            # Send response
            if message.correlation_id:
                self.message_bus.send_response(
                    sender_id="orchestrator",
                    correlation_id=message.correlation_id,
                    content={"task_id": task.id, "status": "created"}
                )
                
        except Exception as e:
            logger.error(f"Failed to handle task request: {e}")
    
    async def _handle_status_update(self, message: AgentMessage):
        """Handle agent status update messages."""
        try:
            agent_id = message.content.get("agent_id")
            status_data = message.content.get("status", {})
            
            if agent_id in self.agents:
                agent = self.agents[agent_id]
                
                # Update agent status
                if "status" in status_data:
                    agent.status = AgentStatus(status_data["status"])
                if "progress" in status_data:
                    agent.progress = status_data["progress"]
                if "current_task" in status_data:
                    agent.current_task = status_data["current_task"]
                
                agent.update_activity()
                
                # Create comprehensive status report
                status_report = AgentStatusReport(
                    agent_id=agent.id,
                    status=agent.status.value,
                    current_task=agent.current_task,
                    progress=agent.progress,
                    health_status=agent.health_status,
                    performance_metrics=agent.performance.__dict__,
                    capabilities=[cap.name for cap in agent.capabilities],
                    resource_usage={"cpu": agent.current_load * 100, "memory": 50.0},
                    error_count=agent.error_count,
                    last_activity=agent.last_activity,
                    uptime=(datetime.now() - agent.created_at).total_seconds()
                )
                
                # Update coordinator
                self.coordinator.update_agent_status(agent_id, status_report)
                
        except Exception as e:
            logger.error(f"Failed to handle status update: {e}")
    
    async def _handle_error_report(self, message: AgentMessage):
        """Handle agent error report messages."""
        try:
            agent_id = message.sender_id
            error_info = message.content
            
            # Update agent error count
            if agent_id in self.agents:
                agent = self.agents[agent_id]
                agent.error_count += 1
                agent.last_error = error_info.get("message", "Unknown error")
                agent.health_status = "error"
            
            # Trigger error recovery
            recovery_result = await self.coordinator.handle_agent_error(agent_id, error_info)
            logger.info(f"Error recovery for {agent_id}: {recovery_result}")
            
        except Exception as e:
            logger.error(f"Failed to handle error report: {e}")
    
    def send_agent_message(self, sender_id: str, recipient_id: str, 
                          message_type: MessageType, content: Dict[str, Any],
                          priority: MessagePriority = MessagePriority.NORMAL) -> bool:
        """Send a message between agents."""
        message = AgentMessage(
            id=str(uuid.uuid4()),
            sender_id=sender_id,
            recipient_id=recipient_id,
            message_type=message_type,
            priority=priority,
            content=content
        )
        
        return self.message_bus.send_message(message)
    
    def broadcast_message(self, sender_id: str, message_type: MessageType, 
                         content: Dict[str, Any], priority: MessagePriority = MessagePriority.NORMAL):
        """Broadcast a message to all agents."""
        self.message_bus.broadcast(sender_id, message_type, content, priority)
    
    async def coordinate_workflow(self, workflow_context: Dict[str, Any]) -> Dict[str, Any]:
        """Coordinate agents for a workflow."""
        return await self.coordinator.coordinate_agents(workflow_context)
    
    # Agent management methods
    def pause_agent(self, agent_id: str) -> bool:
        """Pause an agent."""
        agent = self.get_agent(agent_id)
        if agent and agent.status == AgentStatus.BUSY:
            agent.status = AgentStatus.PAUSED
            logger.info(f"Paused agent {agent_id}")
            return True
        return False
    
    def resume_agent(self, agent_id: str) -> bool:
        """Resume a paused agent."""
        agent = self.get_agent(agent_id)
        if agent and agent.status == AgentStatus.PAUSED:
            agent.status = AgentStatus.BUSY
            logger.info(f"Resumed agent {agent_id}")
            return True
        return False
    
    def reset_agent(self, agent_id: str) -> bool:
        """Reset an agent to idle state."""
        agent = self.get_agent(agent_id)
        if agent:
            agent.status = AgentStatus.IDLE
            agent.current_task = None
            agent.progress = 0.0
            agent.current_load = 0.0
            agent.health_status = "healthy"
            agent.error_count = 0
            agent.last_error = None
            agent.update_activity()
            logger.info(f"Reset agent {agent_id}")
            return True
        return False
    
    def remove_agent(self, agent_id: str) -> bool:
        """Remove an agent from the system."""
        if agent_id in self.agents:
            agent = self.agents[agent_id]
            if agent.status == AgentStatus.BUSY:
                logger.warning(f"Cannot remove busy agent {agent_id}")
                return False
            
            del self.agents[agent_id]
            logger.info(f"Removed agent {agent_id}")
            return True
        return False
    
    # Status and monitoring methods
    def get_agent_status(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Get comprehensive agent status."""
        agent = self.get_agent(agent_id)
        if not agent:
            return None
        
        return {
            "id": agent.id,
            "name": agent.name,
            "type": agent.type.value,
            "status": agent.status.value,
            "current_task": agent.current_task,
            "progress": agent.progress,
            "current_load": agent.current_load,
            "health_status": agent.health_status,
            "capabilities": [cap.name for cap in agent.capabilities],
            "performance": {
                "tasks_completed": agent.performance.tasks_completed,
                "tasks_failed": agent.performance.tasks_failed,
                "success_rate": agent.performance.success_rate,
                "average_execution_time": agent.performance.average_execution_time
            },
            "last_activity": agent.last_activity.isoformat(),
            "error_count": agent.error_count,
            "last_error": agent.last_error
        }
    
    def get_all_agent_status(self) -> List[Dict[str, Any]]:
        """Get status of all agents."""
        return [self.get_agent_status(agent_id) for agent_id in self.agents.keys()]
    
    def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get comprehensive task status."""
        task = self.tasks.get(task_id)
        if not task:
            return None
        
        return {
            "id": task.id,
            "name": task.name,
            "type": task.type,
            "status": task.status.value,
            "priority": task.priority.value,
            "agent_type": task.agent_type.value,
            "assigned_agent": task.assigned_agent,
            "created_at": task.created_at.isoformat(),
            "started_at": task.started_at.isoformat() if task.started_at else None,
            "completed_at": task.completed_at.isoformat() if task.completed_at else None,
            "execution_time": task.execution_time,
            "retry_count": task.retry_count,
            "dependencies": task.dependencies,
            "result": task.result,
            "error": task.error
        }
    
    def get_system_stats(self) -> Dict[str, Any]:
        """Get comprehensive system statistics."""
        # Agent statistics
        agent_stats = defaultdict(int)
        for agent in self.agents.values():
            agent_stats[f"agents_{agent.status.value}"] += 1
            agent_stats[f"agents_{agent.type.value}"] += 1
        
        # Task statistics
        task_stats = defaultdict(int)
        for task in self.tasks.values():
            task_stats[f"tasks_{task.status.value}"] += 1
            task_stats[f"tasks_{task.priority.value}"] += 1
        
        # Queue statistics
        queue_stats = self.task_queue.get_queue_status()
        
        # Resource statistics
        resource_stats = self.resource_manager.get_resource_utilization()
        
        # Performance statistics
        total_completed = sum(agent.performance.tasks_completed for agent in self.agents.values())
        total_failed = sum(agent.performance.tasks_failed for agent in self.agents.values())
        overall_success_rate = total_completed / (total_completed + total_failed) if (total_completed + total_failed) > 0 else 0
        
        # Communication statistics
        communication_stats = self.message_bus.get_statistics()
        
        # System health
        system_health = self.coordinator.get_system_health()
        
        return {
            "agents": dict(agent_stats),
            "tasks": dict(task_stats),
            "queue": queue_stats,
            "resources": resource_stats,
            "performance": {
                "total_tasks_completed": total_completed,
                "total_tasks_failed": total_failed,
                "overall_success_rate": overall_success_rate,
                "active_tasks": len(self.active_tasks)
            },
            "communication": communication_stats,
            "system_health": system_health,
            "system": {
                "total_agents": len(self.agents),
                "total_tasks": len(self.tasks),
                "total_workflows": len(self.workflows),
                "uptime": (datetime.now() - datetime.now()).total_seconds()  # Placeholder
            }
        }


# Create global instance
agent_orchestrator = EnhancedAgentOrchestrator()