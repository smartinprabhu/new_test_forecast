"""
Integration layer between specialized agents and the orchestrator.
Handles the execution of tasks by routing them to appropriate specialized agents.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime

from .orchestrator import EnhancedAgentOrchestrator, Agent, Task, TaskStatus
from .specialized_agents import create_specialized_agent, BaseSpecializedAgent
from ..session.enhanced_manager import EnhancedSessionManager


logger = logging.getLogger(__name__)


class AgentIntegrationManager:
    """
    Manages the integration between the orchestrator and specialized agents.
    Routes tasks to appropriate specialized agent implementations.
    """
    
    def __init__(self, orchestrator: EnhancedAgentOrchestrator, session_manager: EnhancedSessionManager):
        self.orchestrator = orchestrator
        self.session_manager = session_manager
        self.specialized_agents: Dict[str, BaseSpecializedAgent] = {}
        
        # Initialize specialized agents for existing orchestrator agents
        self._initialize_specialized_agents()
    
    def _initialize_specialized_agents(self):
        """Initialize specialized agent instances for orchestrator agents."""
        for agent_id, agent in self.orchestrator.agents.items():
            try:
                specialized_agent = create_specialized_agent(agent, self.session_manager)
                self.specialized_agents[agent_id] = specialized_agent
                logger.info(f"Initialized specialized agent for {agent.name} ({agent_id})")
            except (NotImplementedError, ValueError) as e:
                logger.warning(f"Could not initialize specialized agent for {agent.name}: {e}")
    
    async def execute_agent_task(self, task_id: str) -> Dict[str, Any]:
        """
        Execute a task using the appropriate specialized agent.
        This method integrates with the orchestrator's task execution.
        """
        task = self.orchestrator.tasks.get(task_id)
        if not task or not task.assigned_agent:
            return {"success": False, "error": "Task not found or not assigned"}
        
        agent = self.orchestrator.get_agent(task.assigned_agent)
        if not agent:
            return {"success": False, "error": "Agent not found"}
        
        # Get specialized agent instance
        specialized_agent = self.specialized_agents.get(task.assigned_agent)
        if not specialized_agent:
            return {"success": False, "error": f"No specialized agent implementation for {agent.type.value}"}
        
        try:
            # Update task status
            task.status = TaskStatus.RUNNING
            task.started_at = datetime.now()
            
            logger.info(f"Executing task {task_id} with specialized agent {agent.name}")
            
            # Execute the task using specialized agent
            result = await specialized_agent.execute_capability(task.type, task)
            
            # Update task with results
            task.status = TaskStatus.COMPLETED
            task.completed_at = datetime.now()
            task.result = result
            
            # Update agent status
            agent.status = agent.status.COMPLETED if hasattr(agent.status, 'COMPLETED') else agent.status
            agent.current_task = None
            agent.progress = 100.0
            agent.update_activity()
            
            logger.info(f"Task {task_id} completed successfully")
            return {"success": True, "result": result}
            
        except Exception as e:
            # Handle task failure
            task.status = TaskStatus.FAILED
            task.completed_at = datetime.now()
            task.error = str(e)
            
            # Update agent status
            agent.status = agent.status.ERROR if hasattr(agent.status, 'ERROR') else agent.status
            agent.current_task = None
            agent.progress = 0.0
            agent.last_error = str(e)
            agent.error_count += 1
            agent.update_activity()
            
            logger.error(f"Task {task_id} failed: {e}")
            return {"success": False, "error": str(e)}
    
    def get_agent_capabilities(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed capabilities of a specialized agent."""
        agent = self.orchestrator.get_agent(agent_id)
        specialized_agent = self.specialized_agents.get(agent_id)
        
        if not agent or not specialized_agent:
            return None
        
        return {
            "agent_id": agent_id,
            "agent_name": agent.name,
            "agent_type": agent.type.value,
            "capabilities": [
                {
                    "name": cap.name,
                    "description": cap.description,
                    "input_types": cap.input_types,
                    "output_types": cap.output_types,
                    "estimated_time": cap.estimated_time,
                    "resource_requirements": cap.resource_requirements
                }
                for cap in agent.capabilities
            ],
            "specialized_implementation": specialized_agent.__class__.__name__,
            "status": agent.status.value,
            "health": agent.health_status
        }
    
    def get_all_agent_capabilities(self) -> Dict[str, Dict[str, Any]]:
        """Get capabilities of all specialized agents."""
        capabilities = {}
        for agent_id in self.specialized_agents.keys():
            cap = self.get_agent_capabilities(agent_id)
            if cap:
                capabilities[agent_id] = cap
        return capabilities
    
    async def test_agent_capability(self, agent_id: str, capability_name: str, 
                                  test_parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """Test a specific agent capability with mock data."""
        agent = self.orchestrator.get_agent(agent_id)
        specialized_agent = self.specialized_agents.get(agent_id)
        
        if not agent or not specialized_agent:
            return {"success": False, "error": "Agent not found"}
        
        # Check if agent has the capability
        if not agent.can_handle_task(capability_name):
            return {"success": False, "error": f"Agent does not have capability: {capability_name}"}
        
        try:
            # Create a test task
            test_task = Task(
                id="test_task",
                name=f"Test {capability_name}",
                type=capability_name,
                agent_type=agent.type,
                parameters=test_parameters or {}
            )
            
            # Execute the capability
            result = await specialized_agent.execute_capability(capability_name, test_task)
            
            return {
                "success": True,
                "capability": capability_name,
                "agent_id": agent_id,
                "test_result": result,
                "execution_time": (datetime.now() - datetime.now()).total_seconds()  # Placeholder
            }
            
        except Exception as e:
            return {
                "success": False,
                "capability": capability_name,
                "agent_id": agent_id,
                "error": str(e)
            }
    
    def add_specialized_agent(self, agent_id: str) -> bool:
        """Add a specialized agent for a new orchestrator agent."""
        agent = self.orchestrator.get_agent(agent_id)
        if not agent:
            return False
        
        try:
            specialized_agent = create_specialized_agent(agent, self.session_manager)
            self.specialized_agents[agent_id] = specialized_agent
            logger.info(f"Added specialized agent for {agent.name} ({agent_id})")
            return True
        except (NotImplementedError, ValueError) as e:
            logger.warning(f"Could not add specialized agent for {agent.name}: {e}")
            return False
    
    def remove_specialized_agent(self, agent_id: str) -> bool:
        """Remove a specialized agent."""
        if agent_id in self.specialized_agents:
            del self.specialized_agents[agent_id]
            logger.info(f"Removed specialized agent {agent_id}")
            return True
        return False
    
    def get_integration_stats(self) -> Dict[str, Any]:
        """Get integration statistics."""
        total_agents = len(self.orchestrator.agents)
        specialized_agents = len(self.specialized_agents)
        
        agent_types = {}
        for agent in self.orchestrator.agents.values():
            agent_type = agent.type.value
            agent_types[agent_type] = agent_types.get(agent_type, 0) + 1
        
        specialized_types = {}
        for agent_id, specialized_agent in self.specialized_agents.items():
            agent_type = self.orchestrator.get_agent(agent_id).type.value
            specialized_types[agent_type] = specialized_types.get(agent_type, 0) + 1
        
        return {
            "total_orchestrator_agents": total_agents,
            "total_specialized_agents": specialized_agents,
            "integration_coverage": (specialized_agents / total_agents) * 100 if total_agents > 0 else 0,
            "agent_type_distribution": agent_types,
            "specialized_type_distribution": specialized_types,
            "missing_implementations": [
                agent_id for agent_id in self.orchestrator.agents.keys()
                if agent_id not in self.specialized_agents
            ]
        }