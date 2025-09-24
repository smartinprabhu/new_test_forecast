"""
Agent Orchestrator for Enhanced Agentic Chatbot
Manages specialized agents for different forecasting tasks
"""

import asyncio
import uuid
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, field

from .models import (
    AgentStatus, AgentType, AgentStatusType, Task, TaskResult,
    AgentCapability
)

logger = logging.getLogger(__name__)


@dataclass
class Agent:
    """Base agent class for forecasting tasks."""
    id: str
    agent_type: AgentType
    name: str
    capabilities: List[AgentCapability] = field(default_factory=list)
    status: AgentStatusType = AgentStatusType.IDLE
    current_task: Optional[Task] = None
    session_id: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    last_activity: datetime = field(default_factory=datetime.now)
    performance_score: float = 1.0
    completed_tasks: int = 0
    failed_tasks: int = 0
    
    async def execute_task(self, task: Task) -> TaskResult:
        """Execute a task and return results."""
        self.status = AgentStatusType.BUSY
        self.current_task = task
        self.last_activity = datetime.now()
        
        try:
            logger.info(f"Agent {self.id} starting task: {task.name}")
            
            # Execute task based on agent type
            result = await self._execute_specific_task(task)
            
            self.completed_tasks += 1
            self.status = AgentStatusType.IDLE
            self.current_task = None
            self.last_activity = datetime.now()
            
            # Update performance score
            self._update_performance_score(True)
            
            logger.info(f"Agent {self.id} completed task: {task.name}")
            return result
            
        except Exception as e:
            logger.error(f"Agent {self.id} failed task {task.name}: {e}")
            
            self.failed_tasks += 1
            self.status = AgentStatusType.ERROR
            self.current_task = None
            self.last_activity = datetime.now()
            
            # Update performance score
            self._update_performance_score(False)
            
            return TaskResult(
                task_id=task.task_id,
                status="failed",
                result_data={},
                execution_time=0.0,
                error_message=str(e),
                agent_id=self.id,
                timestamp=datetime.now()
            )
    
    async def _execute_specific_task(self, task: Task) -> TaskResult:
        """Execute task specific to agent type. Override in subclasses."""
        # Simulate task execution
        await asyncio.sleep(1)
        
        return TaskResult(
            task_id=task.task_id,
            status="completed",
            result_data={"message": f"Task {task.name} completed by {self.agent_type.value} agent"},
            execution_time=1.0,
            error_message=None,
            agent_id=self.id,
            timestamp=datetime.now()
        )
    
    def _update_performance_score(self, success: bool):
        """Update agent performance score based on task outcome."""
        total_tasks = self.completed_tasks + self.failed_tasks
        if total_tasks > 0:
            success_rate = self.completed_tasks / total_tasks
            self.performance_score = min(1.0, success_rate * 1.2)  # Boost for high success rates
    
    def get_status(self) -> AgentStatus:
        """Get current agent status."""
        return AgentStatus(
            agent_id=self.id,
            agent_type=self.agent_type,
            status=self.status,
            current_task=self.current_task.name if self.current_task else None,
            progress=0.0,  # Would be updated during task execution
            start_time=self.current_task.deadline if self.current_task else None,
            estimated_completion=None,
            performance_score=self.performance_score,
            capabilities=[cap.name for cap in self.capabilities],
            workload=100.0 if self.status == AgentStatusType.BUSY else 0.0
        )


class DataAnalysisAgent(Agent):
    """Specialized agent for data analysis tasks."""
    
    def __init__(self, session_id: str):
        super().__init__(
            id=f"data_analyst_{uuid.uuid4().hex[:8]}",
            agent_type=AgentType.DATA_ANALYSIS,
            name="Data Analysis Agent",
            session_id=session_id,
            capabilities=[
                AgentCapability(
                    name="eda_analysis",
                    description="Exploratory Data Analysis",
                    input_types=["dataframe"],
                    output_types=["analysis_report"]
                ),
                AgentCapability(
                    name="pattern_detection",
                    description="Pattern and trend detection",
                    input_types=["time_series"],
                    output_types=["pattern_report"]
                ),
                AgentCapability(
                    name="data_quality_assessment",
                    description="Data quality evaluation",
                    input_types=["dataframe"],
                    output_types=["quality_report"]
                )
            ]
        )
    
    async def _execute_specific_task(self, task: Task) -> TaskResult:
        """Execute data analysis specific tasks."""
        start_time = datetime.now()
        
        try:
            if task.name == "analyze_data":
                # Integrate with existing EDA engine
                from forecasting_service.eda.engine import EDAEngine
                
                eda_engine = EDAEngine(self.session_id)
                # This would call the actual EDA analysis
                result_data = {
                    "analysis_type": "eda",
                    "patterns_detected": ["trend", "seasonality"],
                    "data_quality_score": 0.85,
                    "recommendations": ["Consider Prophet algorithm", "Check for outliers"]
                }
                
                await asyncio.sleep(2)  # Simulate processing time
                
            elif task.name == "quality_assessment":
                result_data = {
                    "missing_values": 5,
                    "outliers_detected": 3,
                    "data_completeness": 0.95,
                    "recommendations": ["Impute missing values", "Review outliers"]
                }
                
                await asyncio.sleep(1)
                
            else:
                result_data = {"message": f"Unknown task: {task.name}"}
            
            execution_time = (datetime.now() - start_time).total_seconds()
            
            return TaskResult(
                task_id=task.task_id,
                status="completed",
                result_data=result_data,
                execution_time=execution_time,
                error_message=None,
                agent_id=self.id,
                timestamp=datetime.now()
            )
            
        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()
            raise Exception(f"Data analysis failed: {e}")


class PreprocessingAgent(Agent):
    """Specialized agent for data preprocessing tasks."""
    
    def __init__(self, session_id: str):
        super().__init__(
            id=f"preprocessor_{uuid.uuid4().hex[:8]}",
            agent_type=AgentType.PREPROCESSING,
            name="Preprocessing Agent",
            session_id=session_id,
            capabilities=[
                AgentCapability(
                    name="data_cleaning",
                    description="Data cleaning and preparation",
                    input_types=["dataframe"],
                    output_types=["cleaned_dataframe"]
                ),
                AgentCapability(
                    name="outlier_detection",
                    description="Outlier detection and handling",
                    input_types=["time_series"],
                    output_types=["cleaned_time_series"]
                ),
                AgentCapability(
                    name="feature_engineering",
                    description="Feature creation and engineering",
                    input_types=["dataframe"],
                    output_types=["feature_matrix"]
                )
            ]
        )
    
    async def _execute_specific_task(self, task: Task) -> TaskResult:
        """Execute preprocessing specific tasks."""
        start_time = datetime.now()
        
        try:
            if task.name == "preprocess_data":
                # Integrate with existing preprocessing engine
                result_data = {
                    "preprocessing_steps": ["missing_value_imputation", "outlier_removal", "feature_engineering"],
                    "features_created": 12,
                    "outliers_removed": 3,
                    "data_quality_improvement": 0.15
                }
                
                await asyncio.sleep(3)  # Simulate processing time
                
            elif task.name == "feature_engineering":
                result_data = {
                    "lag_features": ["lag_1", "lag_7", "lag_30"],
                    "rolling_features": ["rolling_mean_7", "rolling_std_7"],
                    "seasonal_features": ["day_of_week", "month", "quarter"],
                    "total_features": 12
                }
                
                await asyncio.sleep(2)
                
            else:
                result_data = {"message": f"Unknown task: {task.name}"}
            
            execution_time = (datetime.now() - start_time).total_seconds()
            
            return TaskResult(
                task_id=task.task_id,
                status="completed",
                result_data=result_data,
                execution_time=execution_time,
                error_message=None,
                agent_id=self.id,
                timestamp=datetime.now()
            )
            
        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()
            raise Exception(f"Preprocessing failed: {e}")


class ModelingAgent(Agent):
    """Specialized agent for model training tasks."""
    
    def __init__(self, session_id: str):
        super().__init__(
            id=f"modeler_{uuid.uuid4().hex[:8]}",
            agent_type=AgentType.MODELING,
            name="Modeling Agent",
            session_id=session_id,
            capabilities=[
                AgentCapability(
                    name="model_training",
                    description="Train forecasting models",
                    input_types=["feature_matrix"],
                    output_types=["trained_models"]
                ),
                AgentCapability(
                    name="hyperparameter_tuning",
                    description="Optimize model parameters",
                    input_types=["model", "training_data"],
                    output_types=["optimized_model"]
                ),
                AgentCapability(
                    name="algorithm_selection",
                    description="Select best algorithms for data",
                    input_types=["data_characteristics"],
                    output_types=["algorithm_recommendations"]
                )
            ]
        )
    
    async def _execute_specific_task(self, task: Task) -> TaskResult:
        """Execute modeling specific tasks."""
        start_time = datetime.now()
        
        try:
            if task.name == "train_models":
                # Integrate with existing algorithm router
                result_data = {
                    "algorithms_trained": ["prophet", "xgboost", "lightgbm"],
                    "training_time": 180,
                    "models_created": 3,
                    "best_model": "xgboost",
                    "best_mape": 8.2
                }
                
                await asyncio.sleep(5)  # Simulate training time
                
            elif task.name == "hyperparameter_tuning":
                result_data = {
                    "tuning_method": "bayesian_optimization",
                    "parameters_tuned": ["n_estimators", "max_depth", "learning_rate"],
                    "improvement": 0.15,
                    "best_parameters": {"n_estimators": 150, "max_depth": 8, "learning_rate": 0.08}
                }
                
                await asyncio.sleep(4)
                
            else:
                result_data = {"message": f"Unknown task: {task.name}"}
            
            execution_time = (datetime.now() - start_time).total_seconds()
            
            return TaskResult(
                task_id=task.task_id,
                status="completed",
                result_data=result_data,
                execution_time=execution_time,
                error_message=None,
                agent_id=self.id,
                timestamp=datetime.now()
            )
            
        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()
            raise Exception(f"Model training failed: {e}")


class EvaluationAgent(Agent):
    """Specialized agent for model evaluation tasks."""
    
    def __init__(self, session_id: str):
        super().__init__(
            id=f"evaluator_{uuid.uuid4().hex[:8]}",
            agent_type=AgentType.EVALUATION,
            name="Evaluation Agent",
            session_id=session_id,
            capabilities=[
                AgentCapability(
                    name="model_evaluation",
                    description="Evaluate model performance",
                    input_types=["trained_models", "test_data"],
                    output_types=["evaluation_metrics"]
                ),
                AgentCapability(
                    name="model_comparison",
                    description="Compare multiple models",
                    input_types=["model_results"],
                    output_types=["comparison_report"]
                ),
                AgentCapability(
                    name="performance_analysis",
                    description="Analyze model performance patterns",
                    input_types=["evaluation_metrics"],
                    output_types=["performance_insights"]
                )
            ]
        )
    
    async def _execute_specific_task(self, task: Task) -> TaskResult:
        """Execute evaluation specific tasks."""
        start_time = datetime.now()
        
        try:
            if task.name == "evaluate_models":
                result_data = {
                    "evaluation_metrics": {
                        "prophet": {"mape": 12.5, "rmse": 145.2, "r2": 0.82},
                        "xgboost": {"mape": 8.2, "rmse": 98.7, "r2": 0.91},
                        "lightgbm": {"mape": 9.1, "rmse": 105.3, "r2": 0.89}
                    },
                    "best_model": "xgboost",
                    "confidence_level": "high"
                }
                
                await asyncio.sleep(2)
                
            elif task.name == "performance_analysis":
                result_data = {
                    "accuracy_trend": "improving",
                    "model_stability": "high",
                    "prediction_confidence": 0.87,
                    "recommendations": ["Deploy XGBoost model", "Monitor performance"]
                }
                
                await asyncio.sleep(1)
                
            else:
                result_data = {"message": f"Unknown task: {task.name}"}
            
            execution_time = (datetime.now() - start_time).total_seconds()
            
            return TaskResult(
                task_id=task.task_id,
                status="completed",
                result_data=result_data,
                execution_time=execution_time,
                error_message=None,
                agent_id=self.id,
                timestamp=datetime.now()
            )
            
        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()
            raise Exception(f"Model evaluation failed: {e}")


class AgentOrchestrator:
    """Orchestrates multiple agents for forecasting workflows."""
    
    def __init__(self):
        self.agents: Dict[str, Agent] = {}
        self.session_agents: Dict[str, List[str]] = {}  # session_id -> agent_ids
        self.task_queue: List[Task] = []
        self.active_tasks: Dict[str, Task] = {}
        
    async def create_training_agents(self, session_id: str) -> List[Agent]:
        """Create agents needed for model training workflow."""
        agents = []
        
        # Create data analysis agent
        data_agent = DataAnalysisAgent(session_id)
        self.agents[data_agent.id] = data_agent
        agents.append(data_agent)
        
        # Create preprocessing agent
        prep_agent = PreprocessingAgent(session_id)
        self.agents[prep_agent.id] = prep_agent
        agents.append(prep_agent)
        
        # Create modeling agent
        model_agent = ModelingAgent(session_id)
        self.agents[model_agent.id] = model_agent
        agents.append(model_agent)
        
        # Create evaluation agent
        eval_agent = EvaluationAgent(session_id)
        self.agents[eval_agent.id] = eval_agent
        agents.append(eval_agent)
        
        # Track agents by session
        if session_id not in self.session_agents:
            self.session_agents[session_id] = []
        
        self.session_agents[session_id].extend([agent.id for agent in agents])
        
        logger.info(f"Created {len(agents)} agents for session {session_id}")
        return agents
    
    async def create_preprocessing_agent(self, session_id: str) -> Agent:
        """Create a preprocessing agent for a session."""
        agent = PreprocessingAgent(session_id)
        self.agents[agent.id] = agent
        
        if session_id not in self.session_agents:
            self.session_agents[session_id] = []
        self.session_agents[session_id].append(agent.id)
        
        return agent
    
    async def assign_task(self, task: Task, session_id: str, preferred_agent_type: AgentType = None) -> Optional[str]:
        """Assign a task to an appropriate agent."""
        # Find suitable agents for the session
        session_agent_ids = self.session_agents.get(session_id, [])
        suitable_agents = []
        
        for agent_id in session_agent_ids:
            agent = self.agents.get(agent_id)
            if agent and agent.status == AgentStatusType.IDLE:
                if preferred_agent_type is None or agent.agent_type == preferred_agent_type:
                    suitable_agents.append(agent)
        
        if not suitable_agents:
            logger.warning(f"No suitable agents available for task {task.name}")
            return None
        
        # Select best agent based on performance score
        best_agent = max(suitable_agents, key=lambda a: a.performance_score)
        
        # Assign task
        self.active_tasks[task.task_id] = task
        
        # Execute task asynchronously
        asyncio.create_task(self._execute_task_async(best_agent, task))
        
        logger.info(f"Assigned task {task.name} to agent {best_agent.id}")
        return best_agent.id
    
    async def _execute_task_async(self, agent: Agent, task: Task):
        """Execute task asynchronously and handle results."""
        try:
            result = await agent.execute_task(task)
            
            # Remove from active tasks
            if task.task_id in self.active_tasks:
                del self.active_tasks[task.task_id]
            
            logger.info(f"Task {task.name} completed by agent {agent.id}")
            
        except Exception as e:
            logger.error(f"Task execution failed: {e}")
            
            # Remove from active tasks
            if task.task_id in self.active_tasks:
                del self.active_tasks[task.task_id]
    
    async def get_agent_status(self, session_id: str) -> List[AgentStatus]:
        """Get status of all agents for a session."""
        session_agent_ids = self.session_agents.get(session_id, [])
        statuses = []
        
        for agent_id in session_agent_ids:
            agent = self.agents.get(agent_id)
            if agent:
                statuses.append(agent.get_status())
        
        return statuses
    
    async def get_session_status(self, session_id: str) -> Dict[str, Any]:
        """Get overall status for a session."""
        agent_statuses = await self.get_agent_status(session_id)
        
        total_agents = len(agent_statuses)
        busy_agents = len([s for s in agent_statuses if s.status == AgentStatusType.BUSY])
        idle_agents = len([s for s in agent_statuses if s.status == AgentStatusType.IDLE])
        error_agents = len([s for s in agent_statuses if s.status == AgentStatusType.ERROR])
        
        return {
            "session_id": session_id,
            "total_agents": total_agents,
            "busy_agents": busy_agents,
            "idle_agents": idle_agents,
            "error_agents": error_agents,
            "active_tasks": len(self.active_tasks),
            "agent_details": [status.dict() for status in agent_statuses]
        }
    
    async def pause_agent(self, agent_id: str):
        """Pause an agent."""
        agent = self.agents.get(agent_id)
        if agent:
            agent.status = AgentStatusType.OFFLINE
            logger.info(f"Paused agent {agent_id}")
    
    async def resume_agent(self, agent_id: str):
        """Resume an agent."""
        agent = self.agents.get(agent_id)
        if agent:
            agent.status = AgentStatusType.IDLE
            logger.info(f"Resumed agent {agent_id}")
    
    async def cleanup_session(self, session_id: str):
        """Clean up agents for a session."""
        session_agent_ids = self.session_agents.get(session_id, [])
        
        for agent_id in session_agent_ids:
            if agent_id in self.agents:
                del self.agents[agent_id]
        
        if session_id in self.session_agents:
            del self.session_agents[session_id]
        
        logger.info(f"Cleaned up {len(session_agent_ids)} agents for session {session_id}")