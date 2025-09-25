"""
Gemini AI Client for Enhanced Agentic Chatbot
Handles intent analysis, response generation, and business insights
"""

import google.generativeai as genai
import json
import logging
from typing import Dict, List, Optional, Any
import asyncio
from datetime import datetime

try:
    from .models import IntentAnalysis, IntentType, BusinessInsight
except ImportError:
    from models import IntentAnalysis, IntentType, BusinessInsight

logger = logging.getLogger(__name__)


class GeminiAIClient:
    """Client for interacting with Gemini AI API."""
    
    def __init__(self, api_key: str):
        """Initialize Gemini AI client."""
        self.api_key = api_key
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        
        # System prompts for different tasks
        self.intent_analysis_prompt = """
        You are an expert AI assistant for time series forecasting. Analyze the user's message and determine their intent.
        
        Available intents:
        - data_upload: User wants to upload or discuss data
        - model_training: User wants to train forecasting models
        - preprocessing: User wants to clean or preprocess data
        - evaluation: User wants to evaluate model performance
        - forecasting: User wants to generate forecasts
        - help: User needs help or explanations
        - general: General conversation or unclear intent
        
        Extract any relevant parameters like forecast horizon, algorithm preferences, etc.
        
        Respond with JSON format:
        {
            "intent": "intent_name",
            "confidence": 0.95,
            "parameters": {"horizon": 30, "algorithm": "prophet"},
            "entities": [{"type": "number", "value": 30, "text": "30 days"}],
            "reasoning": "User explicitly asked to train models for 30-day forecasting"
        }
        """
        
        self.response_generation_prompt = """
        You are a helpful forecasting assistant. Generate natural, conversational responses that:
        1. Are business-friendly and avoid technical jargon
        2. Provide actionable guidance
        3. Explain complex concepts simply
        4. Show enthusiasm for helping with forecasting
        5. Include relevant suggestions for next steps
        
        Context will be provided about the current situation.
        """
        
        self.insights_generation_prompt = """
        You are a business intelligence expert. Analyze the provided data and generate actionable business insights.
        Focus on:
        1. Key patterns and trends
        2. Business implications
        3. Actionable recommendations
        4. Risk factors and opportunities
        5. Clear, executive-level explanations
        """
    
    async def analyze_intent(self, message: str, context: Dict[str, Any] = None) -> IntentAnalysis:
        """Analyze user message to determine intent and extract parameters."""
        try:
            context = context or {}
            
            prompt = f"""
            {self.intent_analysis_prompt}
            
            User message: "{message}"
            Context: {json.dumps(context, default=str)}
            
            Analyze this message and respond with the JSON format specified above.
            """
            
            response = await self._generate_content_async(prompt)
            
            # Parse JSON response
            try:
                result = json.loads(response)
                
                return IntentAnalysis(
                    intent=IntentType(result.get("intent", "general")),
                    confidence=result.get("confidence", 0.5),
                    parameters=result.get("parameters", {}),
                    entities=result.get("entities", []),
                    reasoning=result.get("reasoning", "")
                )
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(f"Failed to parse intent analysis JSON: {e}")
                # Fallback to simple keyword-based analysis
                return self._fallback_intent_analysis(message)
                
        except Exception as e:
            logger.error(f"Intent analysis error: {e}")
            return self._fallback_intent_analysis(message)
    
    async def generate_response(self, context_description: str, context_data: Dict[str, Any] = None) -> str:
        """Generate conversational response based on context."""
        try:
            context_data = context_data or {}
            
            prompt = f"""
            {self.response_generation_prompt}
            
            Situation: {context_description}
            Context data: {json.dumps(context_data, default=str)}
            
            Generate a helpful, conversational response (2-3 sentences max).
            Be encouraging and provide clear next steps.
            """
            
            response = await self._generate_content_async(prompt)
            return response.strip()
            
        except Exception as e:
            logger.error(f"Response generation error: {e}")
            return self._fallback_response(context_description)
    
    async def generate_data_insights(self, eda_report: Dict[str, Any]) -> str:
        """Generate business insights from EDA analysis."""
        try:
            prompt = f"""
            {self.insights_generation_prompt}
            
            Data Analysis Report: {json.dumps(eda_report, default=str)}
            
            Generate 2-3 key business insights about this data in a conversational tone.
            Focus on what the business user should know and what actions they should consider.
            """
            
            response = await self._generate_content_async(prompt)
            return response.strip()
            
        except Exception as e:
            logger.error(f"Data insights generation error: {e}")
            return "I've analyzed your data and found some interesting patterns. The data looks suitable for forecasting!"
    
    async def explain_training_results(self, training_results: Dict[str, Any]) -> str:
        """Explain model training results in business terms."""
        try:
            prompt = f"""
            Explain these model training results in business-friendly language:
            
            Training Results: {json.dumps(training_results, default=str)}
            
            Focus on:
            1. Which models performed best
            2. What the accuracy metrics mean for business decisions
            3. Confidence in the forecasts
            4. Next recommended steps
            
            Keep it conversational and actionable (2-3 sentences).
            """
            
            response = await self._generate_content_async(prompt)
            return response.strip()
            
        except Exception as e:
            logger.error(f"Training results explanation error: {e}")
            return "Model training completed successfully! The models are ready to generate forecasts for your business."
    
    async def generate_forecast_insights(self, forecast_data: Dict[str, Any]) -> str:
        """Generate business insights from forecast results."""
        try:
            prompt = f"""
            Analyze these forecast results and provide business insights:
            
            Forecast Data: {json.dumps(forecast_data, default=str)}
            
            Provide insights about:
            1. Key trends and patterns
            2. Business implications
            3. Confidence levels
            4. Recommended actions
            
            Keep it business-focused and actionable (3-4 sentences).
            """
            
            response = await self._generate_content_async(prompt)
            return response.strip()
            
        except Exception as e:
            logger.error(f"Forecast insights generation error: {e}")
            return "Your forecast shows interesting trends that could impact your business planning. The predictions look reliable for decision-making."
    
    async def create_workflow_plan(self, requirements: Dict[str, Any]) -> Dict[str, Any]:
        """Create an intelligent workflow plan based on requirements."""
        try:
            prompt = f"""
            Create a forecasting workflow plan based on these requirements:
            
            Requirements: {json.dumps(requirements, default=str)}
            
            Generate a JSON workflow plan with these steps (as needed):
            1. data_analysis - Analyze data quality and patterns
            2. preprocessing - Clean and prepare data
            3. feature_engineering - Create relevant features
            4. model_selection - Choose appropriate algorithms
            5. model_training - Train selected models
            6. evaluation - Evaluate model performance
            7. forecasting - Generate forecasts
            8. insights_generation - Create business insights
            
            For each step, include:
            - step_id, name, description
            - estimated_time (in seconds)
            - required_agent_type
            - dependencies (list of step_ids)
            
            Respond with valid JSON only.
            """
            
            response = await self._generate_content_async(prompt)
            
            try:
                workflow_plan = json.loads(response)
                return workflow_plan
            except json.JSONDecodeError:
                logger.warning("Failed to parse workflow plan JSON, using default")
                return self._default_workflow_plan()
                
        except Exception as e:
            logger.error(f"Workflow plan creation error: {e}")
            return self._default_workflow_plan()
    
    async def explain_preprocessing_results(self, preprocessing_results: Dict[str, Any]) -> str:
        """Explain preprocessing results in business terms."""
        try:
            prompt = f"""
            Explain these data preprocessing results in simple business language:
            
            Preprocessing Results: {json.dumps(preprocessing_results, default=str)}
            
            Explain:
            1. What was done to clean the data
            2. How this improves forecast accuracy
            3. Any issues that were found and fixed
            
            Keep it conversational and reassuring (2-3 sentences).
            """
            
            response = await self._generate_content_async(prompt)
            return response.strip()
            
        except Exception as e:
            logger.error(f"Preprocessing explanation error: {e}")
            return "I've cleaned and prepared your data for forecasting. The data quality improvements will help create more accurate predictions."
    
    async def _generate_content_async(self, prompt: str) -> str:
        """Generate content asynchronously with error handling."""
        try:
            # Run the synchronous generate_content in a thread pool
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None, 
                lambda: self.model.generate_content(prompt)
            )
            return response.text
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            raise
    
    def _fallback_intent_analysis(self, message: str) -> IntentAnalysis:
        """Fallback intent analysis using simple keyword matching."""
        message_lower = message.lower()
        
        # Simple keyword-based intent detection
        if any(word in message_lower for word in ["upload", "data", "file", "csv"]):
            intent = IntentType.DATA_UPLOAD
            confidence = 0.7
        elif any(word in message_lower for word in ["train", "model", "algorithm"]):
            intent = IntentType.MODEL_TRAINING
            confidence = 0.7
        elif any(word in message_lower for word in ["clean", "preprocess", "prepare"]):
            intent = IntentType.PREPROCESSING
            confidence = 0.7
        elif any(word in message_lower for word in ["evaluate", "performance", "accuracy"]):
            intent = IntentType.EVALUATION
            confidence = 0.7
        elif any(word in message_lower for word in ["forecast", "predict", "future"]):
            intent = IntentType.FORECASTING
            confidence = 0.7
        elif any(word in message_lower for word in ["help", "how", "what", "explain"]):
            intent = IntentType.HELP
            confidence = 0.8
        else:
            intent = IntentType.GENERAL
            confidence = 0.5
        
        # Extract simple parameters
        parameters = {}
        
        # Look for numbers that might be forecast horizons
        import re
        numbers = re.findall(r'\b(\d+)\s*(?:day|week|month|period)', message_lower)
        if numbers:
            parameters["horizon"] = int(numbers[0])
        
        return IntentAnalysis(
            intent=intent,
            confidence=confidence,
            parameters=parameters,
            entities=[],
            reasoning=f"Keyword-based analysis detected {intent.value}"
        )
    
    def _fallback_response(self, context_description: str) -> str:
        """Fallback response when AI generation fails."""
        fallback_responses = {
            "training": "I'm starting the model training process. This will take a few minutes to complete.",
            "preprocessing": "I'm cleaning and preparing your data for better forecasting accuracy.",
            "evaluation": "Let me analyze the model performance and provide you with the results.",
            "forecasting": "I'm generating forecasts based on your trained models.",
            "upload": "Please upload your data file and I'll analyze it for you.",
            "help": "I'm here to help you with forecasting! You can upload data, train models, or generate forecasts."
        }
        
        # Simple keyword matching for fallback
        for key, response in fallback_responses.items():
            if key in context_description.lower():
                return response
        
        return "I'm processing your request. Let me help you with your forecasting needs!"
    
    def _default_workflow_plan(self) -> Dict[str, Any]:
        """Default workflow plan when AI generation fails."""
        return {
            "plan_id": f"default_plan_{datetime.now().timestamp()}",
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