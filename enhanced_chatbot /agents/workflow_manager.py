"""
Workflow Manager for Enhanced Agentic Chatbot.
Manages complex multi-step workflows with dependencies, error handling, and recovery.
"""

from typing import Dict, List, Optional, Any, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import asyncio
import uuid
import logging
from .orchestrator import AgentOrchestrator, AgentType, TaskPriority


class WorkflowStatus(Enum):
    """Workflow execution status."""
    CREATED = "created"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class StepStatus(Enum):
    """Workflow step status."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"
    CANCELLED = "cancelled"


@dataclass
class WorkflowStep:
    """Represents a single step in a workflow."""
    id: str
    name: str
    description: str
    agent_type: AgentType
    task_type: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    dependencies: List[str] = field(default_factory=list)
    status: StepStatus = StepStatus.PENDING
    priority: TaskPriority = TaskPriority.NORMAL
    timeout_seconds: Optional[int] = None
    retry_count: int = 0
    max_retries: int = 3
    allow_failure: bool = False  # If True, workflow continues even if step fails
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    task_id: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@dataclass
class Workflow:
    """Represents a complete workflow with multiple steps."""
    id: str
    name: str
    description: str
    steps: List[WorkflowStep]
    status: WorkflowStatus = WorkflowStatus.CREATED
    session_id: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    current_step_index: int = 0
    progress: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    
    def get_current_step(self) -> Optional[WorkflowStep]:
        """Get the current step being executed."""
        if 0 <= self.current_step_index < len(self.steps):
            return self.steps[self.current_step_index]
        return None
    
    def get_next_pending_step(self) -> Optional[WorkflowStep]:
        """Get the next pending step that can be executed."""
        for step in self.steps:
            if step.status == StepStatus.PENDING:
                # Check if dependencies are met
                if self._dependencies_met(step):
                    return step
        return None
    
    def _dependencies_met(self, step: WorkflowStep) -> bool:
        """Check if all dependencies for a step are completed."""
        if not step.dependencies:
            return True
        
        completed_steps = {s.id for s in self.steps if s.status == StepStatus.COMPLETED}
        return all(dep_id in completed_steps for dep_id in step.dependencies)
    
    def calculate_progress(self) -> float:
        """Calculate workflow progress as percentage."""
        if not self.steps:
            return 100.0
        
        completed_steps = len([s for s in self.steps if s.status == StepStatus.COMPLETED])
        return (completed_steps / len(self.steps)) * 100.0
    
    def is_complete(self) -> bool:
        """Check if workflow is complete."""
        return all(
            step.status in [StepStatus.COMPLETED, StepStatus.SKIPPED] 
            for step in self.steps
        )
    
    def has_failed(self) -> bool:
        """Check if workflow has failed."""
        return any(
            step.status == StepStatus.FAILED and not step.allow_failure
            for step in self.steps
        )


class WorkflowManager:
    """
    Manages workflow execution with the agent orchestrator.
    """
    
    def __init__(self, orchestrator: AgentOrchestrator):
        self.orchestrator = orchestrator
        self.workflows: Dict[str, Workflow] = {}
        self.logger = logging.getLogger(__name__)
        
        # Workflow execution state
        self.active_workflows: Dict[str, asyncio.Task] = {}
        self.workflow_callbacks: Dict[str, List[Callable]] = {}
        
        # Performance tracking
        self.stats = {
            "workflows_created": 0,
            "workflows_completed": 0,
            "workflows_failed": 0,
            "average_execution_time": 0.0
        }
    
    def create_workflow(self, name: str, description: str, steps: List[Dict[str, Any]], 
                       session_id: Optional[str] = None, 
                       metadata: Dict[str, Any] = None) -> Workflow:
        """Create a new workflow from step definitions."""
        workflow_id = str(uuid.uuid4())
        
        # Convert step dictionaries to WorkflowStep objects
        workflow_steps = []
        for i, step_def in enumerate(steps):
            step = WorkflowStep(
                id=step_def.get('id', f"step_{i}"),
                name=step_def['name'],
                description=step_def.get('description', ''),
                agent_type=AgentType(step_def['agent_type']),
                task_type=step_def['task_type'],
                parameters=step_def.get('parameters', {}),
                dependencies=step_def.get('dependencies', []),
                priority=TaskPriority(step_def.get('priority', TaskPriority.NORMAL.value)),
                timeout_seconds=step_def.get('timeout_seconds'),
                max_retries=step_def.get('max_retries', 3),
                allow_failure=step_def.get('allow_failure', False)
            )
            workflow_steps.append(step)
        
        workflow = Workflow(
            id=workflow_id,
            name=name,
            description=description,
            steps=workflow_steps,
            session_id=session_id,
            metadata=metadata or {}
        )
        
        self.workflows[workflow_id] = workflow
        self.stats["workflows_created"] += 1
        
        self.logger.info(f"Created workflow {workflow_id}: {name}")
        return workflow
    
    async def execute_workflow(self, workflow_id: str, 
                             progress_callback: Optional[Callable] = None) -> bool:
        """Execute a workflow asynchronously."""
        workflow = self.workflows.get(workflow_id)
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")
        
        if workflow.status != WorkflowStatus.CREATED:
            raise ValueError(f"Workflow {workflow_id} is not in CREATED state")
        
        # Register progress callback
        if progress_callback:
            if workflow_id not in self.workflow_callbacks:
                self.workflow_callbacks[workflow_id] = []
            self.workflow_callbacks[workflow_id].append(progress_callback)
        
        # Start workflow execution
        execution_task = asyncio.create_task(self._execute_workflow_steps(workflow))
        self.active_workflows[workflow_id] = execution_task
        
        try:
            success = await execution_task
            return success
        finally:
            # Clean up
            if workflow_id in self.active_workflows:
                del self.active_workflows[workflow_id]
    
    async def _execute_workflow_steps(self, workflow: Workflow) -> bool:
        """Execute workflow steps in order, handling dependencies."""
        workflow.status = WorkflowStatus.RUNNING
        workflow.started_at = datetime.now()
        
        await self._notify_workflow_progress(workflow, "started")
        
        try:
            while not workflow.is_complete() and not workflow.has_failed():
                # Find next step to execute
                next_step = workflow.get_next_pending_step()
                if not next_step:
                    # No more steps can be executed, check if we're done
                    if workflow.is_complete():
                        break
                    else:
                        # Deadlock - no steps can proceed
                        workflow.status = WorkflowStatus.FAILED
                        workflow.error = "Workflow deadlock: no steps can proceed"
                        break
                
                # Execute the step
                success = await self._execute_workflow_step(workflow, next_step)
                
                if not success and not next_step.allow_failure:
                    workflow.status = WorkflowStatus.FAILED
                    workflow.error = f"Step {next_step.name} failed and is not allowed to fail"
                    break
                
                # Update progress
                workflow.progress = workflow.calculate_progress()
                await self._notify_workflow_progress(workflow, "step_completed", {
                    "step_id": next_step.id,
                    "step_name": next_step.name,
                    "success": success
                })
            
            # Determine final status
            if workflow.is_complete():
                workflow.status = WorkflowStatus.COMPLETED
                workflow.completed_at = datetime.now()
                workflow.progress = 100.0
                self.stats["workflows_completed"] += 1
                
                # Update average execution time
                execution_time = (workflow.completed_at - workflow.started_at).total_seconds()
                self._update_average_execution_time(execution_time)
                
                await self._notify_workflow_progress(workflow, "completed")
                return True
            else:
                workflow.status = WorkflowStatus.FAILED
                workflow.completed_at = datetime.now()
                self.stats["workflows_failed"] += 1
                
                await self._notify_workflow_progress(workflow, "failed")
                return False
                
        except Exception as e:
            workflow.status = WorkflowStatus.FAILED
            workflow.error = str(e)
            workflow.completed_at = datetime.now()
            self.stats["workflows_failed"] += 1
            
            self.logger.error(f"Workflow {workflow.id} failed with error: {e}")
            await self._notify_workflow_progress(workflow, "error", {"error": str(e)})
            return False
    
    async def _execute_workflow_step(self, workflow: Workflow, step: WorkflowStep) -> bool:
        """Execute a single workflow step."""
        step.status = StepStatus.RUNNING
        step.started_at = datetime.now()
        
        try:
            # Submit task to orchestrator
            task = await self.orchestrator.submit_task(
                name=step.name,
                task_type=step.task_type,
                agent_type=step.agent_type,
                parameters=step.parameters,
                priority=step.priority,
                timeout_seconds=step.timeout_seconds,
                session_id=workflow.session_id,
                callback=self._create_step_callback(workflow, step)
            )
            
            step.task_id = task.id
            
            # Wait for task completion
            while True:
                task_status = self.orchestrator.get_task_status(task.id)
                if not task_status:
                    break
                
                if task_status["status"] in ["completed", "failed", "cancelled"]:
                    # Task finished
                    if task_status["status"] == "completed":
                        step.status = StepStatus.COMPLETED
                        step.completed_at = datetime.now()
                        step.result = task_status.get("result")
                        return True
                    else:
                        # Task failed
                        if step.retry_count < step.max_retries:
                            step.retry_count += 1
                            step.status = StepStatus.PENDING
                            self.logger.info(f"Retrying step {step.name} (attempt {step.retry_count + 1})")
                            return await self._execute_workflow_step(workflow, step)
                        else:
                            step.status = StepStatus.FAILED
                            step.completed_at = datetime.now()
                            step.error = task_status.get("result", {}).get("error", "Task failed")
                            return False
                
                await asyncio.sleep(1)  # Check every second
            
            # Task disappeared - treat as failure
            step.status = StepStatus.FAILED
            step.error = "Task disappeared from orchestrator"
            return False
            
        except Exception as e:
            step.status = StepStatus.FAILED
            step.completed_at = datetime.now()
            step.error = str(e)
            self.logger.error(f"Error executing step {step.name}: {e}")
            return False
    
    def _create_step_callback(self, workflow: Workflow, step: WorkflowStep) -> Callable:
        """Create a callback function for step completion."""
        async def callback(task, result):
            # This callback is called when the task completes
            # We can use it for additional processing if needed
            pass
        return callback
    
    async def _notify_workflow_progress(self, workflow: Workflow, event_type: str, 
                                      data: Dict[str, Any] = None):
        """Notify workflow progress callbacks."""
        callbacks = self.workflow_callbacks.get(workflow.id, [])
        
        event_data = {
            "workflow_id": workflow.id,
            "event_type": event_type,
            "status": workflow.status.value,
            "progress": workflow.progress,
            "timestamp": datetime.now().isoformat(),
            **(data or {})
        }
        
        for callback in callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(event_data)
                else:
                    callback(event_data)
            except Exception as e:
                self.logger.error(f"Error in workflow callback: {e}")
    
    def _update_average_execution_time(self, execution_time: float):
        """Update average execution time statistics."""
        completed = self.stats["workflows_completed"]
        if completed == 1:
            self.stats["average_execution_time"] = execution_time
        else:
            # Running average
            current_avg = self.stats["average_execution_time"]
            self.stats["average_execution_time"] = (
                (current_avg * (completed - 1) + execution_time) / completed
            )
    
    async def pause_workflow(self, workflow_id: str) -> bool:
        """Pause a running workflow."""
        workflow = self.workflows.get(workflow_id)
        if not workflow or workflow.status != WorkflowStatus.RUNNING:
            return False
        
        workflow.status = WorkflowStatus.PAUSED
        
        # Cancel current step if running
        current_step = workflow.get_current_step()
        if current_step and current_step.task_id:
            await self.orchestrator.cancel_task(current_step.task_id)
        
        await self._notify_workflow_progress(workflow, "paused")
        return True
    
    async def resume_workflow(self, workflow_id: str) -> bool:
        """Resume a paused workflow."""
        workflow = self.workflows.get(workflow_id)
        if not workflow or workflow.status != WorkflowStatus.PAUSED:
            return False
        
        workflow.status = WorkflowStatus.RUNNING
        await self._notify_workflow_progress(workflow, "resumed")
        
        # Continue execution
        execution_task = asyncio.create_task(self._execute_workflow_steps(workflow))
        self.active_workflows[workflow_id] = execution_task
        
        return True
    
    async def cancel_workflow(self, workflow_id: str) -> bool:
        """Cancel a workflow."""
        workflow = self.workflows.get(workflow_id)
        if not workflow:
            return False
        
        if workflow.status in [WorkflowStatus.COMPLETED, WorkflowStatus.CANCELLED]:
            return False
        
        workflow.status = WorkflowStatus.CANCELLED
        workflow.completed_at = datetime.now()
        
        # Cancel all running tasks
        for step in workflow.steps:
            if step.task_id and step.status == StepStatus.RUNNING:
                await self.orchestrator.cancel_task(step.task_id)
                step.status = StepStatus.CANCELLED
        
        # Cancel execution task
        if workflow_id in self.active_workflows:
            self.active_workflows[workflow_id].cancel()
            del self.active_workflows[workflow_id]
        
        await self._notify_workflow_progress(workflow, "cancelled")
        return True
    
    def get_workflow_status(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed workflow status."""
        workflow = self.workflows.get(workflow_id)
        if not workflow:
            return None
        
        return {
            "id": workflow.id,
            "name": workflow.name,
            "description": workflow.description,
            "status": workflow.status.value,
            "progress": workflow.progress,
            "session_id": workflow.session_id,
            "created_at": workflow.created_at.isoformat(),
            "started_at": workflow.started_at.isoformat() if workflow.started_at else None,
            "completed_at": workflow.completed_at.isoformat() if workflow.completed_at else None,
            "current_step_index": workflow.current_step_index,
            "total_steps": len(workflow.steps),
            "error": workflow.error,
            "steps": [
                {
                    "id": step.id,
                    "name": step.name,
                    "status": step.status.value,
                    "agent_type": step.agent_type.value,
                    "task_type": step.task_type,
                    "retry_count": step.retry_count,
                    "started_at": step.started_at.isoformat() if step.started_at else None,
                    "completed_at": step.completed_at.isoformat() if step.completed_at else None,
                    "error": step.error
                }
                for step in workflow.steps
            ],
            "metadata": workflow.metadata
        }
    
    def get_workflows_by_session(self, session_id: str) -> List[Dict[str, Any]]:
        """Get all workflows for a session."""
        session_workflows = [
            workflow for workflow in self.workflows.values()
            if workflow.session_id == session_id
        ]
        
        return [self.get_workflow_status(workflow.id) for workflow in session_workflows]
    
    def get_manager_stats(self) -> Dict[str, Any]:
        """Get workflow manager statistics."""
        active_count = len(self.active_workflows)
        total_workflows = len(self.workflows)
        
        status_counts = {}
        for status in WorkflowStatus:
            status_counts[status.value] = len([
                w for w in self.workflows.values() if w.status == status
            ])
        
        return {
            "total_workflows": total_workflows,
            "active_workflows": active_count,
            "workflows_by_status": status_counts,
            "performance": self.stats
        }