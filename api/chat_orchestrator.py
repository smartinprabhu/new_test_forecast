"""
Enhanced Chat Orchestrator API.
Main FastAPI application that provides chat endpoints and integrates with
the existing forecasting service while adding conversation management.
"""

import os
import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any
from fastapi import FastAPI, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import google.generativeai as genai

# Import existing forecasting service components
from forecasting_service.api.main import app as forecasting_app
from forecasting_service.api.models import *
from forecasting_service.session.manager import SessionManager

# Import enhanced components
from ..session.enhanced_manager import (
    EnhancedSessionManager, 
    ConversationMessage, 
    UserType, 
    UserPreferences,
    ConversationContext
)
from ..gemini.client import GeminiClient
from ..agents.orchestrator import EnhancedAgentOrchestrator, AgentType, TaskPriority
from ..agents.workflow_manager import WorkflowManager


# Configure Gemini AI
genai.configure(api_key="AIzaSyC9HUwhTJvg828gaLS7sfcG1DB5fGoB0CA")

# Initialize FastAPI app
app = FastAPI(
    title="Enhanced Agentic Chatbot API",
    description="Intelligent conversational interface for forecasting service with multi-agent orchestration",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global managers
enhanced_session_manager = EnhancedSessionManager()
gemini_client = GeminiClient()
agent_orchestrator = EnhancedAgentOrchestrator()

# Import and initialize integration manager
from ..agents.integration import AgentIntegrationManager
integration_manager = AgentIntegrationManager(agent_orchestrator, enhanced_session_manager)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket

    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]

    async def send_personal_message(self, message: dict, session_id: str):
        if session_id in self.active_connections:
            try:
                await self.active_connections[session_id].send_json(message)
            except:
                # Connection closed, remove it
                self.disconnect(session_id)

connection_manager = ConnectionManager()


# Request/Response Models
class ChatRequest(BaseModel):
    message: str
    session_id: str
    context: Dict[str, Any] = Field(default_factory=dict)
    user_type: Optional[str] = "business"


class ChatResponse(BaseModel):
    response: str
    action_required: Optional[str] = None
    config: Dict[str, Any] = Field(default_factory=dict)
    agent_status: List[Dict[str, Any]] = Field(default_factory=list)
    next_steps: List[str] = Field(default_factory=list)
    requires_approval: bool = False
    workflow_step: Optional[str] = None
    interactive_elements: List[Dict[str, Any]] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class SessionCreateRequest(BaseModel):
    user_id: Optional[str] = None
    user_type: str = "business"


class SessionResponse(BaseModel):
    session_id: str
    user_id: Optional[str]
    user_type: str
    created_at: str
    preferences: Dict[str, Any]


class PreferencesUpdateRequest(BaseModel):
    session_id: str
    preferences: Dict[str, Any]


# Chat Endpoints
@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Main chat endpoint that processes user messages and coordinates responses.
    """
    try:
        # Get or create session
        session = enhanced_session_manager.get_session(request.session_id)
        if not session:
            # Create new enhanced session
            user_type = UserType(request.user_type) if request.user_type else UserType.BUSINESS
            session = enhanced_session_manager.create_enhanced_session(
                user_id=None, 
                user_type=user_type
            )
            request.session_id = session.session_id
        
        # Create conversation message for user input
        user_message = ConversationMessage(
            id=str(uuid.uuid4()),
            type="user",
            content=request.message,
            timestamp=datetime.now()
        )
        
        # Add user message to conversation history
        enhanced_session_manager.add_conversation_message(request.session_id, user_message)
        
        # Get conversation context
        context = enhanced_session_manager.get_conversation_context(request.session_id)
        user_preferences = enhanced_session_manager.get_user_preferences(request.session_id)
        
        # Analyze user intent with Gemini AI
        intent_analysis = await gemini_client.analyze_intent(
            message=request.message,
            context=context,
            preferences=user_preferences,
            session_data=session.data
        )
        
        # Update conversation context with new intent
        enhanced_session_manager.update_conversation_context(
            request.session_id,
            current_intent=intent_analysis.get('intent'),
            last_action=intent_analysis.get('suggested_action')
        )
        
        # Route to appropriate handler based on intent
        response = await route_intent_to_handler(
            intent_analysis, 
            request.session_id, 
            request.message,
            context,
            user_preferences
        )
        
        # Create conversation message for assistant response
        assistant_message = ConversationMessage(
            id=str(uuid.uuid4()),
            type="assistant",
            content=response.response,
            timestamp=datetime.now(),
            workflow_step=response.workflow_step,
            requires_approval=response.requires_approval,
            metadata=response.metadata
        )
        
        # Add assistant message to conversation history
        enhanced_session_manager.add_conversation_message(request.session_id, assistant_message)
        
        # Send real-time update via WebSocket
        await connection_manager.send_personal_message({
            "type": "chat_response",
            "data": response.dict()
        }, request.session_id)
        
        return response
        
    except Exception as e:
        error_response = ChatResponse(
            response=f"I encountered an error processing your request: {str(e)}. Please try again or rephrase your question.",
            action_required="error_recovery",
            metadata={"error": str(e)}
        )
        return error_response


async def route_intent_to_handler(intent_analysis: Dict[str, Any], 
                                session_id: str, 
                                message: str,
                                context: ConversationContext,
                                preferences: UserPreferences) -> ChatResponse:
    """Route user intent to appropriate handler."""
    
    intent = intent_analysis.get('intent', 'general')
    confidence = intent_analysis.get('confidence', 0.0)
    
    # If confidence is low, ask for clarification
    if confidence < 0.7:
        return await handle_clarification_request(message, session_id, intent_analysis)
    
    # Route to specific handlers
    if intent == "data_upload":
        return await handle_data_upload_intent(session_id, intent_analysis)
    elif intent == "model_training":
        return await handle_training_intent(session_id, intent_analysis)
    elif intent == "preprocessing":
        return await handle_preprocessing_intent(session_id, intent_analysis)
    elif intent == "evaluation":
        return await handle_evaluation_intent(session_id, intent_analysis)
    elif intent == "forecasting":
        return await handle_forecasting_intent(session_id, intent_analysis)
    elif intent == "data_analysis":
        return await handle_analysis_intent(session_id, intent_analysis)
    elif intent == "help":
        return await handle_help_intent(session_id, intent_analysis, preferences)
    elif intent == "workflow_control":
        return await handle_workflow_control_intent(session_id, intent_analysis)
    else:
        return await handle_general_query(message, session_id, context, preferences)


async def handle_data_upload_intent(session_id: str, intent_analysis: Dict[str, Any]) -> ChatResponse:
    """Handle data upload related queries."""
    return ChatResponse(
        response="I'm ready to help you upload and analyze your data! Please upload your dataset using the file upload button below. I support CSV, Excel, JSON, and Parquet formats.",
        action_required="data_upload",
        interactive_elements=[
            {
                "type": "file_upload",
                "id": "data_upload",
                "label": "Upload Dataset",
                "accept": ".csv,.xlsx,.json,.parquet",
                "action": "upload_data"
            }
        ],
        next_steps=[
            "Upload your dataset",
            "I'll automatically analyze the data quality and patterns",
            "We can then discuss preprocessing and modeling options"
        ]
    )


async def handle_training_intent(session_id: str, intent_analysis: Dict[str, Any]) -> ChatResponse:
    """Handle model training related queries."""
    # Check if we have data
    session = enhanced_session_manager.get_session(session_id)
    if not session or session.data.raw_data is None:
        return ChatResponse(
            response="To train models, I'll need your dataset first. Please upload your data and I'll help you train the best forecasting models for your specific use case.",
            action_required="data_upload_required",
            next_steps=["Upload your dataset", "I'll analyze it and recommend the best algorithms"]
        )
    
    # Create training task using agent orchestrator
    training_task = agent_orchestrator.create_task(
        name="Train Forecasting Models",
        task_type="algorithm_training",
        agent_type=AgentType.MODEL_TRAINER,
        parameters={
            'session_id': session_id,
            'algorithms': intent_analysis.get('parameters', {}).get('algorithms', ['prophet', 'xgboost', 'lightgbm'])
        },
        priority=TaskPriority.HIGH
    )
    
    # Assign and start the task
    if agent_orchestrator.assign_task(training_task.id):
        # Start task execution in background
        asyncio.create_task(agent_orchestrator._execute_task_async(training_task.id))
        
        return ChatResponse(
            response=f"I've started training multiple forecasting models on your data. The training agent is working on Prophet, XGBoost, and LightGBM algorithms to find the best performer for your data patterns.",
            action_required="model_training",
            config={"task_id": training_task.id, "algorithms": ["prophet", "xgboost", "lightgbm"]},
            workflow_step="training",
            interactive_elements=[
                {
                    "type": "button",
                    "id": "check_progress",
                    "label": "Check Progress",
                    "action": "check_training_progress"
                }
            ],
            next_steps=[
                "Training Prophet, XGBoost, and LightGBM models",
                "Evaluating performance with cross-validation",
                "Selecting the best performing model",
                "Ready to generate forecasts"
            ]
        )
    else:
        return ChatResponse(
            response="I'm currently busy with other tasks. Please try again in a moment.",
            action_required="retry_later"
        )


async def handle_preprocessing_intent(session_id: str, intent_analysis: Dict[str, Any]) -> ChatResponse:
    """Handle data preprocessing related queries."""
    session = enhanced_session_manager.get_session(session_id)
    if not session or session.data.raw_data is None:
        return ChatResponse(
            response="I need your dataset before I can help with preprocessing. Please upload your data first.",
            action_required="data_upload_required"
        )
    
    # Create preprocessing task
    preprocessing_task = agent_orchestrator.create_task(
        name="Preprocess Data",
        task_type="data_cleaning",
        agent_type=AgentType.PREPROCESSING,
        parameters={'session_id': session_id},
        priority=TaskPriority.HIGH
    )
    
    # Assign and start the task
    if agent_orchestrator.assign_task(preprocessing_task.id):
        asyncio.create_task(agent_orchestrator._execute_task_async(preprocessing_task.id))
        
        return ChatResponse(
            response="I've started preprocessing your data. The preprocessing agent is cleaning missing values, detecting outliers, and creating useful features for better forecasting accuracy.",
            action_required="preprocessing",
            config={"task_id": preprocessing_task.id},
            workflow_step="preprocessing",
            interactive_elements=[
                {
                    "type": "button",
                    "id": "check_progress",
                    "label": "Check Progress",
                    "action": "check_preprocessing_progress"
                }
            ],
            next_steps=[
                "Cleaning missing values and outliers",
                "Creating lag and rolling window features",
                "Adding calendar features",
                "Finalizing processed dataset"
            ]
        )
    else:
        return ChatResponse(
            response="I'm currently busy with other tasks. Please try again in a moment.",
            action_required="retry_later"
        )


async def handle_evaluation_intent(session_id: str, intent_analysis: Dict[str, Any]) -> ChatResponse:
    """Handle model evaluation related queries."""
    session = enhanced_session_manager.get_session(session_id)
    if not session or len(session.data.models) == 0:
        return ChatResponse(
            response="I don't see any trained models to evaluate. Let's train some models first, then I can show you detailed performance metrics.",
            action_required="training_required",
            next_steps=["Train forecasting models", "I'll evaluate their performance automatically"]
        )
    
    # Get evaluation results
    evaluation_results = await get_model_evaluation(session_id)
    
    return ChatResponse(
        response=f"Here's how your models performed:\n\n{evaluation_results['summary']}",
        action_required="evaluation",
        config=evaluation_results,
        interactive_elements=[
            {
                "type": "button",
                "id": "view_detailed_metrics",
                "label": "View Detailed Metrics",
                "action": "show_detailed_metrics"
            },
            {
                "type": "button",
                "id": "compare_models",
                "label": "Compare Models",
                "action": "show_model_comparison"
            }
        ]
    )


async def handle_forecasting_intent(session_id: str, intent_analysis: Dict[str, Any]) -> ChatResponse:
    """Handle forecast generation related queries."""
    session = enhanced_session_manager.get_session(session_id)
    if not session or len(session.data.models) == 0:
        return ChatResponse(
            response="To generate forecasts, I need trained models first. Let me help you train some models on your data.",
            action_required="training_required"
        )
    
    forecast_config = await generate_forecast_config(session_id, intent_analysis)
    
    return ChatResponse(
        response=f"I'll generate a {forecast_config.get('horizon', 30)}-day forecast using your best performing model with confidence intervals.",
        action_required="forecasting",
        config=forecast_config,
        requires_approval=True,
        workflow_step="forecasting",
        interactive_elements=[
            {
                "type": "button",
                "id": "generate_forecast",
                "label": "Generate Forecast",
                "action": "execute_forecasting"
            },
            {
                "type": "slider",
                "id": "forecast_horizon",
                "label": "Forecast Days",
                "min": 7,
                "max": 365,
                "value": forecast_config.get('horizon', 30)
            }
        ]
    )


async def handle_analysis_intent(session_id: str, intent_analysis: Dict[str, Any]) -> ChatResponse:
    """Handle data analysis related queries."""
    session = enhanced_session_manager.get_session(session_id)
    if not session or session.data.raw_data is None:
        return ChatResponse(
            response="I need your dataset to perform analysis. Please upload your data first.",
            action_required="data_upload_required"
        )
    
    # Trigger EDA analysis
    analysis_results = await perform_eda_analysis(session_id)
    
    return ChatResponse(
        response=f"I've analyzed your data and found some interesting patterns:\n\n{analysis_results['summary']}",
        action_required="data_analysis",
        config=analysis_results,
        interactive_elements=[
            {
                "type": "button",
                "id": "view_charts",
                "label": "View Charts",
                "action": "show_analysis_charts"
            },
            {
                "type": "button",
                "id": "detailed_report",
                "label": "Detailed Report",
                "action": "show_detailed_analysis"
            }
        ]
    )


async def handle_help_intent(session_id: str, intent_analysis: Dict[str, Any], 
                           preferences: UserPreferences) -> ChatResponse:
    """Handle help and guidance requests."""
    help_level = preferences.preferred_explanation_level if preferences else "business"
    
    if help_level == "technical":
        help_content = """I'm an AI assistant that helps with forecasting tasks. Here's what I can do:

**Technical Capabilities:**
- Multi-algorithm training (Prophet, XGBoost, LightGBM, CatBoost)
- Advanced preprocessing with feature engineering
- Cross-validation and hyperparameter tuning
- Statistical analysis and pattern detection
- API integration with existing forecasting services

**Commands you can try:**
- "Train models on my data"
- "Preprocess my dataset"
- "Show model performance metrics"
- "Generate 30-day forecast"
- "Analyze data patterns"
"""
    else:
        help_content = """I'm here to help you create accurate forecasts for your business! Here's what I can do:

**What I Help With:**
- Upload and analyze your data
- Clean and prepare data for forecasting
- Train multiple AI models to find the best one
- Generate forecasts with confidence levels
- Explain results in business terms

**Just tell me what you'd like to do:**
- "I want to forecast sales for next month"
- "Help me analyze my data"
- "Train models to predict demand"
- "Show me how accurate my forecasts are"
"""
    
    return ChatResponse(
        response=help_content,
        action_required="help",
        interactive_elements=[
            {
                "type": "button",
                "id": "upload_data",
                "label": "Upload Data",
                "action": "data_upload"
            },
            {
                "type": "button",
                "id": "demo_data",
                "label": "Try Demo Data",
                "action": "load_demo_data"
            }
        ]
    )


async def handle_clarification_request(message: str, session_id: str, 
                                     intent_analysis: Dict[str, Any]) -> ChatResponse:
    """Handle cases where intent is unclear."""
    possible_intents = intent_analysis.get('possible_intents', [])
    
    clarification_text = "I want to make sure I understand what you'd like to do. Are you looking to:"
    
    interactive_elements = []
    for i, intent in enumerate(possible_intents[:4]):  # Limit to top 4 options
        interactive_elements.append({
            "type": "button",
            "id": f"clarify_{intent}",
            "label": intent.replace('_', ' ').title(),
            "action": f"clarify_intent_{intent}"
        })
    
    return ChatResponse(
        response=clarification_text,
        action_required="clarification",
        interactive_elements=interactive_elements
    )


async def handle_general_query(message: str, session_id: str, 
                             context: ConversationContext,
                             preferences: UserPreferences) -> ChatResponse:
    """Handle general queries using Gemini AI."""
    response = await gemini_client.generate_response(
        message=message,
        context=context,
        preferences=preferences
    )
    
    return ChatResponse(
        response=response,
        action_required="general_response"
    )


# Helper functions for generating configurations
async def generate_training_config(session_id: str, intent_analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Generate training configuration based on data and intent."""
    return {
        "algorithms": [
            {"name": "prophet", "enabled": True},
            {"name": "xgboost", "enabled": True},
            {"name": "lightgbm", "enabled": True}
        ],
        "forecast_horizon": intent_analysis.get('parameters', {}).get('horizon', 30),
        "cross_validation": True,
        "hyperparameter_tuning": True
    }


async def generate_preprocessing_config(session_id: str, intent_analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Generate preprocessing configuration."""
    return {
        "handle_missing": True,
        "outlier_detection": True,
        "feature_engineering": True,
        "scaling": True,
        "calendar_features": True
    }


async def generate_forecast_config(session_id: str, intent_analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Generate forecast configuration."""
    return {
        "horizon": intent_analysis.get('parameters', {}).get('horizon', 30),
        "confidence_intervals": True,
        "include_components": True
    }


async def perform_eda_analysis(session_id: str) -> Dict[str, Any]:
    """Perform EDA analysis and return results."""
    # This would integrate with the existing EDA engine
    return {
        "summary": "Your data shows strong weekly seasonality with an upward trend. I detected 3 outliers and no missing values.",
        "patterns": ["weekly_seasonality", "upward_trend"],
        "data_quality": "good",
        "recommendations": ["Consider weekly features", "Outlier treatment recommended"]
    }


async def get_model_evaluation(session_id: str) -> Dict[str, Any]:
    """Get model evaluation results."""
    # This would integrate with the existing evaluation system
    return {
        "summary": "XGBoost performed best with 8.2% MAPE, followed by Prophet at 9.1% MAPE.",
        "best_model": "xgboost",
        "metrics": {
            "xgboost": {"mape": 8.2, "mae": 45.3, "rmse": 67.8},
            "prophet": {"mape": 9.1, "mae": 52.1, "rmse": 74.2}
        }
    }


# Session Management Endpoints
@app.post("/sessions", response_model=SessionResponse)
async def create_session(request: SessionCreateRequest):
    """Create a new enhanced session."""
    user_type = UserType(request.user_type) if request.user_type else UserType.BUSINESS
    session = enhanced_session_manager.create_enhanced_session(
        user_id=request.user_id,
        user_type=user_type
    )
    
    preferences = enhanced_session_manager.get_user_preferences(session.session_id)
    
    return SessionResponse(
        session_id=session.session_id,
        user_id=session.user_id,
        user_type=user_type.value,
        created_at=session.created_at.isoformat(),
        preferences=preferences.dict() if preferences else {}
    )


@app.get("/sessions/{session_id}")
async def get_session_info(session_id: str):
    """Get session information and summary."""
    summary = enhanced_session_manager.get_session_summary(session_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return summary


@app.put("/sessions/{session_id}/preferences")
async def update_preferences(session_id: str, request: PreferencesUpdateRequest):
    """Update user preferences for a session."""
    success = enhanced_session_manager.update_user_preferences(
        session_id, 
        request.preferences
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {"status": "preferences updated"}


@app.get("/sessions/{session_id}/history")
async def get_conversation_history(session_id: str, limit: int = 50):
    """Get conversation history for a session."""
    history = enhanced_session_manager.get_conversation_history(session_id, limit)
    return {"messages": [msg.__dict__ for msg in history]}


# WebSocket endpoint for real-time communication
@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time updates."""
    await connection_manager.connect(websocket, session_id)
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            # Echo back for now - can be extended for real-time interactions
            await connection_manager.send_personal_message({
                "type": "echo",
                "data": data
            }, session_id)
    except WebSocketDisconnect:
        connection_manager.disconnect(session_id)


# Workflow Management Endpoints
@app.post("/workflows")
async def create_workflow(workflow_request: dict):
    """Create a new workflow."""
    try:
        workflow = workflow_manager.create_workflow(
            name=workflow_request["name"],
            description=workflow_request.get("description", ""),
            steps=workflow_request["steps"],
            session_id=workflow_request.get("session_id"),
            metadata=workflow_request.get("metadata", {})
        )
        
        return {
            "workflow_id": workflow.id,
            "status": "created",
            "message": f"Workflow '{workflow.name}' created successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/workflows/{workflow_id}/execute")
async def execute_workflow(workflow_id: str):
    """Execute a workflow."""
    try:
        # Start workflow execution asynchronously
        asyncio.create_task(workflow_manager.execute_workflow(workflow_id))
        
        return {
            "workflow_id": workflow_id,
            "status": "started",
            "message": "Workflow execution started"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/workflows/{workflow_id}")
async def get_workflow_status(workflow_id: str):
    """Get workflow status."""
    status = workflow_manager.get_workflow_status(workflow_id)
    if not status:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    return status


@app.post("/workflows/{workflow_id}/pause")
async def pause_workflow(workflow_id: str):
    """Pause a running workflow."""
    success = await workflow_manager.pause_workflow(workflow_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot pause workflow")
    
    return {"status": "paused"}


@app.post("/workflows/{workflow_id}/resume")
async def resume_workflow(workflow_id: str):
    """Resume a paused workflow."""
    success = await workflow_manager.resume_workflow(workflow_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot resume workflow")
    
    return {"status": "resumed"}


@app.post("/workflows/{workflow_id}/cancel")
async def cancel_workflow(workflow_id: str):
    """Cancel a workflow."""
    success = await workflow_manager.cancel_workflow(workflow_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot cancel workflow")
    
    return {"status": "cancelled"}


@app.get("/sessions/{session_id}/workflows")
async def get_session_workflows(session_id: str):
    """Get all workflows for a session."""
    workflows = workflow_manager.get_workflows_by_session(session_id)
    return {"workflows": workflows}


# Agent Management Endpoints
@app.get("/agents")
async def get_all_agents():
    """Get status of all agents."""
    return {"agents": agent_orchestrator.get_all_agent_status()}


@app.get("/agents/{agent_id}")
async def get_agent_status(agent_id: str):
    """Get status of a specific agent."""
    status = agent_orchestrator.get_agent_status(agent_id)
    if not status:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    return status


@app.get("/agents/capabilities")
async def get_all_agent_capabilities():
    """Get detailed capabilities of all specialized agents."""
    return integration_manager.get_all_agent_capabilities()


@app.post("/agents/{agent_id}/test/{capability_name}")
async def test_agent_capability(agent_id: str, capability_name: str, test_params: dict = None):
    """Test a specific agent capability."""
    return await integration_manager.test_agent_capability(agent_id, capability_name, test_params or {})


@app.get("/integration/stats")
async def get_integration_stats():
    """Get integration statistics between orchestrator and specialized agents."""
    return integration_manager.get_integration_stats()


@app.post("/agents/{agent_id}/pause")
async def pause_agent(agent_id: str):
    """Pause an agent."""
    success = await agent_orchestrator.pause_agent(agent_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot pause agent")
    
    return {"status": "paused"}


@app.post("/agents/{agent_id}/resume")
async def resume_agent(agent_id: str):
    """Resume an agent."""
    success = await agent_orchestrator.resume_agent(agent_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot resume agent")
    
    return {"status": "resumed"}


# Task Management Endpoints
@app.get("/tasks/{task_id}")
async def get_task_status(task_id: str):
    """Get task status."""
    status = agent_orchestrator.get_task_status(task_id)
    if not status:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return status


@app.post("/tasks/{task_id}/cancel")
async def cancel_task(task_id: str):
    """Cancel a task."""
    success = await agent_orchestrator.cancel_task(task_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot cancel task")
    
    return {"status": "cancelled"}


@app.get("/sessions/{session_id}/tasks")
async def get_session_tasks(session_id: str):
    """Get all tasks for a session."""
    tasks = agent_orchestrator.get_tasks_by_session(session_id)
    return {"tasks": tasks}


# System Statistics Endpoints
@app.get("/stats")
async def get_system_stats():
    """Get comprehensive system statistics."""
    return {
        "orchestrator": agent_orchestrator.get_orchestrator_stats(),
        "workflow_manager": workflow_manager.get_manager_stats(),
        "session_manager": enhanced_session_manager.get_enhanced_session_stats()
    }


# Agent Management Endpoints
@app.get("/agents")
async def get_all_agents():
    """Get status of all agents."""
    return agent_orchestrator.get_all_agent_status()

@app.get("/agents/{session_id}/tasks")
async def get_session_tasks(session_id: str):
    """Get all tasks for a session."""
    session_tasks = []
    for task_id, task in agent_orchestrator.tasks.items():
        if task.parameters.get('session_id') == session_id:
            session_tasks.append(agent_orchestrator.get_task_status(task_id))
    return {"tasks": session_tasks}

@app.get("/system/stats")
async def get_system_stats():
    """Get comprehensive system statistics."""
    return agent_orchestrator.get_system_stats()

@app.post("/agents/{agent_id}/pause")
async def pause_agent(agent_id: str):
    """Pause an agent."""
    success = agent_orchestrator.pause_agent(agent_id)
    return {"success": success, "message": f"Agent {agent_id} {'paused' if success else 'could not be paused'}"}

@app.post("/agents/{agent_id}/resume")
async def resume_agent(agent_id: str):
    """Resume an agent."""
    success = agent_orchestrator.resume_agent(agent_id)
    return {"success": success, "message": f"Agent {agent_id} {'resumed' if success else 'could not be resumed'}"}

@app.get("/communication/stats")
async def get_communication_stats():
    """Get communication system statistics."""
    return agent_orchestrator.message_bus.get_statistics()

@app.get("/system/health")
async def get_system_health():
    """Get comprehensive system health status."""
    return agent_orchestrator.coordinator.get_system_health()

@app.post("/agents/{sender_id}/message/{recipient_id}")
async def send_agent_message(sender_id: str, recipient_id: str, message_data: dict):
    """Send a message between agents."""
    from enhanced_chatbot.agents.communication import MessageType, MessagePriority
    
    message_type = MessageType(message_data.get("type", "coordination"))
    priority = MessagePriority(message_data.get("priority", MessagePriority.NORMAL.value))
    content = message_data.get("content", {})
    
    success = agent_orchestrator.send_agent_message(
        sender_id, recipient_id, message_type, content, priority
    )
    
    return {"success": success, "message": "Message sent" if success else "Failed to send message"}

@app.post("/agents/{sender_id}/broadcast")
async def broadcast_message(sender_id: str, message_data: dict):
    """Broadcast a message to all agents."""
    from enhanced_chatbot.agents.communication import MessageType, MessagePriority
    
    message_type = MessageType(message_data.get("type", "broadcast"))
    priority = MessagePriority(message_data.get("priority", MessagePriority.NORMAL.value))
    content = message_data.get("content", {})
    
    agent_orchestrator.broadcast_message(sender_id, message_type, content, priority)
    
    return {"success": True, "message": "Broadcast sent"}

@app.post("/workflow/coordinate")
async def coordinate_workflow(workflow_data: dict):
    """Coordinate agents for a workflow."""
    result = await agent_orchestrator.coordinate_workflow(workflow_data)
    return result


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    orchestrator_running = agent_orchestrator.is_running
    
    return {
        "status": "healthy" if orchestrator_running else "degraded",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "session_manager": "active",
            "gemini_client": "active",
            "agent_orchestrator": "active" if orchestrator_running else "inactive",
            "workflow_manager": "active"
        },
        "stats": {
            "agents": len(agent_orchestrator.agents),
            "active_workflows": len(workflow_manager.active_workflows),
            "total_tasks": len(agent_orchestrator.tasks)
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)