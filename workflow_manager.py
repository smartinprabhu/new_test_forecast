"""
Workflow Manager for Enhanced Agentic Chatbot
Handles plan generation and execution with step-by-step control
"""

import asyncio
import uuid
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum

from .models import (
    WorkflowPlan, WorkflowStep, WorkflowStatusType, WorkflowResponse,
    AgentType, Task
)
from .gemini_client import GeminiAIClient

logger = logging.getLogger(__name__)


class StepStatus(str, Enum):
    """Workflow step status."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"
    PAUSED = "paused"


@dataclass
class WorkflowExecution:
    """Represents an executing workflow."""
    id: str
    session_id: str
    plan: WorkflowPlan
    status: WorkflowStatusType = WorkflowStatusType.CREATED
    current_step: Optional[str] = None
    completed_steps: List[str] = field(default_factory=list)
    failed_steps: List[str] = field(default_factory=list)
    step_results: Dict[str, Any] = field(default_factory=dict)
    start_time: datetime = field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    estimated_completion: Optional[datetime] = None
    progress: float = 0.0
    auto_approve: bool = False
    user_approvals: Dict[str, bool] = field(default_factory=dict)
    
    def calculate_progress(self) -> float:
        """Calculate overall workflow progress."""
        if not self.plan.steps:
            return 0.0
        
        total_steps = len(self.plan.steps)
        completed = len(self.completed_steps)
        
        # Add partial progress for current step
        current_progress = 0.0
        if self.current_step:
            # Assume 50% progress for in-progress step
            current_progress = 0.5
        
        self.progress = min(100.0, ((completed + current_progress) / total_steps) * 100)
        return self.progress
    
    def get_next_step(self) -> Optional[WorkflowStep]:
        """Get the next step to execute."""
        for step in self.plan.steps:
            if (step.step_id not in self.completed_steps and 
                step.step_id not in self.failed_steps and
                step.step_id != self.current_step):
                
                # Check if dependencies are satisfied
                if self._dependencies_satisfied(step):
                    return step
        
        return None
    
    def _dependencies_satisfied(self, step: WorkflowStep) -> bool:
        """Check if step dependencies are satisfied."""
        for dep_id in step.dependencies:
            if dep_id not in self.completed_steps:
                return False
        return True


class WorkflowManager:
    """Manages workflow creation, execution, and monitoring."""
    
    def __init__(self):
        self.active_workflows: Dict[str, WorkflowExecution] = {}
        self.workflow_history: Dict[str, List[WorkflowExecution]] = {}
        self.gemini_client = None  # Will be injected
        
    def set_gemini_client(self, gemini_client: GeminiAIClient):
        """Set the Gemini AI client for plan generation."""
        self.gemini_client = gemini_client
    
    async def create_workflow_plan(self, session_id: str, requirements: Dict[str, Any]) -> WorkflowPlan:
        """Create an intelligent workflow plan based on requirements."""
        try:
            # Use Gemini AI to create plan if available
            if self.gemini_client:
                plan_data = await self.gemini_client.create_workflow_plan(requirements)
            else:
                plan_data = self._create_default_plan(requirements)
            
            # Convert to WorkflowPlan object
            steps = []
            for step_data in plan_data.get("steps", []):
                step = WorkflowStep(
                    step_id=step_data["step_id"],
                    name=step_data["name"],
                    description=step_data["description"],
                    agent_type=AgentType(step_data.get("agent_type", "execution")),
                    estimated_time=step_data.get("estimated_time", 60),
                    dependencies=step_data.get("dependencies", []),
                    configuration=step_data.get("configuration", {})
                )
                steps.append(step)
            
            plan = WorkflowPlan(
                plan_id=plan_data.get("plan_id", f"plan_{uuid.uuid4().hex[:8]}"),
                name=plan_data.get("name", "Forecasting Workflow"),
                description=plan_data.get("description", "Complete forecasting pipeline"),
                steps=steps,
                estimated_duration=plan_data.get("estimated_duration", 600)
            )
            
            logger.info(f"Created workflow plan with {len(steps)} steps for session {session_id}")
            return plan
            
        except Exception as e:
            logger.error(f"Failed to create workflow plan: {e}")
            return self._create_default_plan_object(requirements)
    
    async def execute_workflow(self, session_id: str, plan: WorkflowPlan, auto_approve: bool = False) -> WorkflowExecution:
        """Start executing a workflow plan."""
        workflow_id = f"workflow_{uuid.uuid4().hex[:8]}"
        
        execution = WorkflowExecution(
            id=workflow_id,
            session_id=session_id,
            plan=plan,
            auto_approve=auto_approve,
            estimated_completion=datetime.now() + timedelta(seconds=plan.estimated_duration)
        )
        
        self.active_workflows[workflow_id] = execution
        
        # Start execution asynchronously
        asyncio.create_task(self._execute_workflow_async(execution))
        
        logger.info(f"Started workflow execution {workflow_id} for session {session_id}")
        return execution
    
    async def _execute_workflow_async(self, execution: WorkflowExecution):
        """Execute workflow steps asynchronously."""
        try:
            execution.status = WorkflowStatusType.RUNNING
            
            while True:
                # Get next step to execute
                next_step = execution.get_next_step()
                
                if not next_step:
                    # No more steps - workflow complete
                    execution.status = WorkflowStatusType.COMPLETED
                    execution.end_time = datetime.now()
                    execution.calculate_progress()
                    
                    logger.info(f"Workflow {execution.id} completed successfully")
                    break
                
                # Check if step needs approval
                if not execution.auto_approve and not execution.user_approvals.get(next_step.step_id, False):
                    # Wait for user approval
                    execution.status = WorkflowStatusType.PAUSED
                    logger.info(f"Workflow {execution.id} paused for approval of step {next_step.step_id}")
                    
                    # Wait for approval (in real implementation, this would be event-driven)
                    await self._wait_for_approval(execution, next_step)
                    
                    execution.status = WorkflowStatusType.RUNNING
                
                # Execute the step
                await self._execute_step(execution, next_step)
                
                # Update progress
                execution.calculate_progress()
                
        except Exception as e:
            logger.error(f"Workflow {execution.id} failed: {e}")
            execution.status = WorkflowStatusType.FAILED
            execution.end_time = datetime.now()
    
    async def _execute_step(self, execution: WorkflowExecution, step: WorkflowStep):
        """Execute a single workflow step."""
        try:
            logger.info(f"Executing step {step.step_id}: {step.name}")
            
            execution.current_step = step.step_id
            step.status = StepStatus.IN_PROGRESS.value
            
            # Create task for the step
            task = Task(
                task_id=f"task_{step.step_id}_{uuid.uuid4().hex[:8]}",
                name=step.name,
                description=step.description,
                priority=5,
                required_capabilities=[step.agent_type.value],
                input_data=step.configuration,
                configuration=step.configuration
            )
            
            # Execute step based on type
            result = await self._execute_step_by_type(step, task, execution.session_id)
            
            # Store results
            execution.step_results[step.step_id] = result
            execution.completed_steps.append(step.step_id)
            step.status = StepStatus.COMPLETED.value
            step.results = result
            
            execution.current_step = None
            
            logger.info(f"Step {step.step_id} completed successfully")
            
        except Exception as e:
            logger.error(f"Step {step.step_id} failed: {e}")
            
            execution.failed_steps.append(step.step_id)
            step.status = StepStatus.FAILED.value
            execution.current_step = None
            
            # Decide whether to continue or fail the workflow
            if self._is_critical_step(step):
                raise Exception(f"Critical step {step.step_id} failed: {e}")
    
    async def _execute_step_by_type(self, step: WorkflowStep, task: Task, session_id: str) -> Dict[str, Any]:
        """Execute step based on its type and integrate with existing services."""
        
        if step.step_id == "data_analysis":
            return await self._execute_data_analysis_step(session_id, task)
        
        elif step.step_id == "preprocessing":
            return await self._execute_preprocessing_step(session_id, task)
        
        elif step.step_id == "model_training":
            return await self._execute_training_step(session_id, task)
        
        elif step.step_id == "evaluation":
            return await self._execute_evaluation_step(session_id, task)
        
        elif step.step_id == "forecasting":
            return await self._execute_forecasting_step(session_id, task)
        
        else:
            # Generic step execution
            await asyncio.sleep(step.estimated_time / 10)  # Simulate work
            return {
                "step_type": step.step_id,
                "status": "completed",
                "message": f"Step {step.name} executed successfully"
            }
    
    async def _execute_data_analysis_step(self, session_id: str, task: Task) -> Dict[str, Any]:
        """Execute data analysis step using existing EDA service."""
        try:
            # Import and use existing EDA functionality
            from forecasting_service.api.main import analyze_data
            from forecasting_service.api.models import EDARequest
            
            eda_request = EDARequest(session_id=session_id)
            eda_response = await analyze_data(eda_request)
            
            return {
                "step_type": "data_analysis",
                "status": "completed",
                "eda_report": eda_response.eda_report,
                "message": "Data analysis completed successfully"
            }
            
        except Exception as e:
            logger.error(f"Data analysis step failed: {e}")
            return {
                "step_type": "data_analysis",
                "status": "failed",
                "error": str(e),
                "message": "Data analysis failed"
            }
    
    async def _execute_preprocessing_step(self, session_id: str, task: Task) -> Dict[str, Any]:
        """Execute preprocessing step using existing preprocessing service."""
        try:
            from forecasting_service.api.main import preprocess_data
            
            config = task.configuration or {}
            preprocessing_response = await preprocess_data(session_id, config)
            
            return {
                "step_type": "preprocessing",
                "status": "completed",
                "preprocessing_result": preprocessing_response,
                "message": "Data preprocessing completed successfully"
            }
            
        except Exception as e:
            logger.error(f"Preprocessing step failed: {e}")
            return {
                "step_type": "preprocessing",
                "status": "failed",
                "error": str(e),
                "message": "Data preprocessing failed"
            }
    
    async def _execute_training_step(self, session_id: str, task: Task) -> Dict[str, Any]:
        """Execute model training step using existing training service."""
        try:
            from forecasting_service.api.main import train_models
            from forecasting_service.api.models import TrainingRequest
            
            config = task.configuration or {}
            
            training_request = TrainingRequest(
                session_id=session_id,
                algorithms=[
                    {"algorithm": "prophet", "enabled": True},
                    {"algorithm": "xgboost", "enabled": True},
                    {"algorithm": "lightgbm", "enabled": True}
                ],
                forecast_horizon=config.get("forecast_horizon", 30),
                validation_split=config.get("validation_split", 0.2)
            )
            
            training_response = await train_models(training_request)
            
            return {
                "step_type": "model_training",
                "status": "completed",
                "training_results": training_response.training_results,
                "best_model": training_response.best_model,
                "message": "Model training completed successfully"
            }
            
        except Exception as e:
            logger.error(f"Training step failed: {e}")
            return {
                "step_type": "model_training",
                "status": "failed",
                "error": str(e),
                "message": "Model training failed"
            }
    
    async def _execute_evaluation_step(self, session_id: str, task: Task) -> Dict[str, Any]:
        """Execute model evaluation step using existing metrics service."""
        try:
            from forecasting_service.api.main import get_detailed_metrics
            
            metrics_response = await get_detailed_metrics(session_id)
            
            return {
                "step_type": "evaluation",
                "status": "completed",
                "metrics": metrics_response,
                "message": "Model evaluation completed successfully"
            }
            
        except Exception as e:
            logger.error(f"Evaluation step failed: {e}")
            return {
                "step_type": "evaluation",
                "status": "failed",
                "error": str(e),
                "message": "Model evaluation failed"
            }
    
    async def _execute_forecasting_step(self, session_id: str, task: Task) -> Dict[str, Any]:
        """Execute forecasting step using existing forecast service."""
        try:
            from forecasting_service.api.main import generate_forecast
            from forecasting_service.api.models import ForecastRequest
            
            config = task.configuration or {}
            
            forecast_request = ForecastRequest(
                session_id=session_id,
                forecast_horizon=config.get("forecast_horizon", 30),
                include_confidence_intervals=True
            )
            
            forecast_response = await generate_forecast(forecast_request)
            
            return {
                "step_type": "forecasting",
                "status": "completed",
                "forecast_data": forecast_response.forecast_data,
                "confidence_intervals": forecast_response.confidence_intervals,
                "message": "Forecast generation completed successfully"
            }
            
        except Exception as e:
            logger.error(f"Forecasting step failed: {e}")
            return {
                "step_type": "forecasting",
                "status": "failed",
                "error": str(e),
                "message": "Forecast generation failed"
            }
    
    async def _wait_for_approval(self, execution: WorkflowExecution, step: WorkflowStep):
        """Wait for user approval of a workflow step."""
        # In a real implementation, this would be event-driven
        # For now, we'll simulate waiting
        timeout = 300  # 5 minutes timeout
        start_time = datetime.now()
        
        while not execution.user_approvals.get(step.step_id, False):
            await asyncio.sleep(1)
            
            # Check timeout
            if (datetime.now() - start_time).total_seconds() > timeout:
                raise Exception(f"Timeout waiting for approval of step {step.step_id}")
            
            # Check if workflow was cancelled
            if execution.status == WorkflowStatusType.CANCELLED:
                raise Exception("Workflow was cancelled")
    
    def _is_critical_step(self, step: WorkflowStep) -> bool:
        """Determine if a step is critical for workflow continuation."""
        critical_steps = ["data_analysis", "model_training"]
        return step.step_id in critical_steps
    
    async def approve_step(self, workflow_id: str, step_id: str, approved: bool = True):
        """Approve or reject a workflow step."""
        execution = self.active_workflows.get(workflow_id)
        if not execution:
            raise ValueError(f"Workflow {workflow_id} not found")
        
        execution.user_approvals[step_id] = approved
        
        if approved:
            logger.info(f"Step {step_id} approved for workflow {workflow_id}")
        else:
            logger.info(f"Step {step_id} rejected for workflow {workflow_id}")
            execution.status = WorkflowStatusType.CANCELLED
    
    async def pause_workflow(self, workflow_id: str):
        """Pause a running workflow."""
        execution = self.active_workflows.get(workflow_id)
        if execution and execution.status == WorkflowStatusType.RUNNING:
            execution.status = WorkflowStatusType.PAUSED
            logger.info(f"Paused workflow {workflow_id}")
    
    async def resume_workflow(self, workflow_id: str):
        """Resume a paused workflow."""
        execution = self.active_workflows.get(workflow_id)
        if execution and execution.status == WorkflowStatusType.PAUSED:
            execution.status = WorkflowStatusType.RUNNING
            logger.info(f"Resumed workflow {workflow_id}")
    
    async def cancel_workflow(self, workflow_id: str):
        """Cancel a workflow."""
        execution = self.active_workflows.get(workflow_id)
        if execution:
            execution.status = WorkflowStatusType.CANCELLED
            execution.end_time = datetime.now()
            logger.info(f"Cancelled workflow {workflow_id}")
    
    async def get_workflow_status(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """Get current status of a workflow."""
        execution = self.active_workflows.get(workflow_id)
        if not execution:
            return None
        
        return {
            "workflow_id": workflow_id,
            "session_id": execution.session_id,
            "status": execution.status.value,
            "progress": execution.calculate_progress(),
            "current_step": execution.current_step,
            "completed_steps": execution.completed_steps,
            "failed_steps": execution.failed_steps,
            "start_time": execution.start_time.isoformat(),
            "estimated_completion": execution.estimated_completion.isoformat() if execution.estimated_completion else None,
            "step_results": execution.step_results
        }
    
    def _create_default_plan(self, requirements: Dict[str, Any]) -> Dict[str, Any]:
        """Create a default workflow plan when AI generation fails."""
        return {
            "plan_id": f"default_plan_{uuid.uuid4().hex[:8]}",
            "name": "Standard Forecasting Workflow",
            "description": "Complete forecasting pipeline with data analysis, preprocessing, training, and forecasting",
            "steps": [
                {
                    "step_id": "data_analysis",
                    "name": "Data Analysis",
                    "description": "Analyze data quality, patterns, and characteristics",
                    "agent_type": "data_analysis",
                    "estimated_time": 60,
                    "dependencies": []
                },
                {
                    "step_id": "preprocessing",
                    "name": "Data Preprocessing",
                    "description": "Clean data, handle missing values, and detect outliers",
                    "agent_type": "preprocessing",
                    "estimated_time": 120,
                    "dependencies": ["data_analysis"]
                },
                {
                    "step_id": "model_training",
                    "name": "Model Training",
                    "description": "Train multiple forecasting algorithms",
                    "agent_type": "modeling",
                    "estimated_time": 300,
                    "dependencies": ["preprocessing"]
                },
                {
                    "step_id": "evaluation",
                    "name": "Model Evaluation",
                    "description": "Evaluate and compare model performance",
                    "agent_type": "evaluation",
                    "estimated_time": 60,
                    "dependencies": ["model_training"]
                },
                {
                    "step_id": "forecasting",
                    "name": "Forecast Generation",
                    "description": "Generate forecasts using the best model",
                    "agent_type": "execution",
                    "estimated_time": 30,
                    "dependencies": ["evaluation"]
                }
            ],
            "estimated_duration": 570
        }
    
    def _create_default_plan_object(self, requirements: Dict[str, Any]) -> WorkflowPlan:
        """Create a default WorkflowPlan object."""
        plan_data = self._create_default_plan(requirements)
        
        steps = []
        for step_data in plan_data["steps"]:
            step = WorkflowStep(
                step_id=step_data["step_id"],
                name=step_data["name"],
                description=step_data["description"],
                agent_type=AgentType(step_data["agent_type"]),
                estimated_time=step_data["estimated_time"],
                dependencies=step_data["dependencies"]
            )
            steps.append(step)
        
        return WorkflowPlan(
            plan_id=plan_data["plan_id"],
            name=plan_data["name"],
            description=plan_data["description"],
            steps=steps,
            estimated_duration=plan_data["estimated_duration"]
        )