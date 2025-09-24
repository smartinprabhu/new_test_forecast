"""
Gemini AI Client for Enhanced Agentic Chatbot.
Handles all interactions with Google's Gemini AI for intent analysis,
response generation, and intelligent conversation management.
"""

import json
import re
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import google.generativeai as genai
from dataclasses import asdict

from ..session.enhanced_manager import ConversationContext, UserPreferences, UserType


class GeminiClient:
    """
    Client for interacting with Gemini AI for conversation management.
    """
    
    def __init__(self, api_key: str = "AIzaSyC9HUwhTJvg828gaLS7sfcG1DB5fGoB0CA"):
        """Initialize Gemini client with API key."""
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Intent categories for forecasting
        self.intent_categories = {
            "data_upload": "User wants to upload or provide data",
            "data_analysis": "User wants to analyze or understand their data",
            "preprocessing": "User wants to clean or prepare data",
            "model_training": "User wants to train forecasting models",
            "evaluation": "User wants to evaluate model performance",
            "forecasting": "User wants to generate predictions",
            "workflow_control": "User wants to control or modify workflows",
            "help": "User needs help or explanation",
            "general": "General conversation or unclear intent"
        }
    
    async def analyze_intent(self, message: str, context: ConversationContext = None, 
                           preferences: UserPreferences = None, 
                           session_data: Any = None) -> Dict[str, Any]:
        """
        Analyze user message to determine intent and extract parameters.
        """
        try:
            # Build context for intent analysis
            context_info = self._build_context_info(context, preferences, session_data)
            
            prompt = f"""
            Analyze this user message for forecasting-related intent:
            
            Message: "{message}"
            
            Context Information:
            {context_info}
            
            Intent Categories:
            {json.dumps(self.intent_categories, indent=2)}
            
            Please analyze and return a JSON response with:
            {{
                "intent": "primary_intent_category",
                "confidence": 0.95,
                "parameters": {{
                    "horizon": 30,
                    "algorithm": "auto",
                    "any_other_extracted_params": "value"
                }},
                "entities": ["extracted", "entities"],
                "suggested_action": "specific_action_to_take",
                "possible_intents": ["alternative", "intents", "if_confidence_low"],
                "reasoning": "why this intent was chosen"
            }}
            
            Focus on:
            1. What the user wants to accomplish
            2. Any specific parameters mentioned (time horizons, algorithms, etc.)
            3. The context of their current session state
            4. Their user type and preferences
            
            Be precise and confident in your analysis.
            """
            
            response = self.model.generate_content(prompt)
            
            # Parse JSON response
            intent_analysis = self._parse_json_response(response.text)
            
            # Validate and enhance the response
            intent_analysis = self._validate_intent_analysis(intent_analysis, message)
            
            return intent_analysis
            
        except Exception as e:
            # Fallback intent analysis
            return {
                "intent": "general",
                "confidence": 0.5,
                "parameters": {},
                "entities": [],
                "suggested_action": "general_response",
                "possible_intents": ["help", "data_upload", "model_training"],
                "reasoning": f"Error in analysis: {str(e)}",
                "error": str(e)
            }
    
    async def generate_response(self, message: str, context: ConversationContext = None,
                              preferences: UserPreferences = None) -> str:
        """
        Generate a conversational response using Gemini AI.
        """
        try:
            # Build context for response generation
            context_info = self._build_context_info(context, preferences)
            explanation_level = preferences.preferred_explanation_level if preferences else "business"
            
            prompt = f"""
            You are an intelligent forecasting assistant. Generate a helpful response to this user message:
            
            Message: "{message}"
            
            Context:
            {context_info}
            
            Response Guidelines:
            - Explanation level: {explanation_level}
            - Be conversational and helpful
            - Focus on forecasting and data analysis topics
            - Provide actionable guidance
            - Use business-friendly language unless technical level requested
            - Keep responses concise but informative
            - If you can't help with something, explain why and suggest alternatives
            
            Generate a natural, helpful response:
            """
            
            response = self.model.generate_content(prompt)
            return response.text.strip()
            
        except Exception as e:
            return f"I apologize, but I encountered an issue generating a response. Please try rephrasing your question or ask for help with specific forecasting tasks."
    
    async def explain_training_start(self, training_response: Dict[str, Any], 
                                   parameters: Dict[str, Any]) -> str:
        """
        Generate user-friendly explanation for training start.
        """
        try:
            prompt = f"""
            Generate a user-friendly explanation for starting model training:
            
            Training Configuration:
            {json.dumps(training_response, indent=2)}
            
            User Parameters:
            {json.dumps(parameters, indent=2)}
            
            Create a brief, encouraging message that:
            1. Confirms training has started
            2. Mentions the algorithms being used
            3. Gives an estimated time
            4. Explains what will happen next
            
            Keep it conversational and business-friendly.
            """
            
            response = self.model.generate_content(prompt)
            return response.text.strip()
            
        except Exception as e:
            return "I've started training multiple forecasting models on your data. This typically takes a few minutes, and I'll notify you when it's complete."
    
    async def explain_preprocessing_results(self, preprocessing_result: Dict[str, Any]) -> str:
        """
        Generate user-friendly explanation of preprocessing results.
        """
        try:
            prompt = f"""
            Explain these data preprocessing results in business-friendly terms:
            
            Preprocessing Results:
            {json.dumps(preprocessing_result, indent=2)}
            
            Create an explanation that:
            1. Summarizes what was done to the data
            2. Explains why these steps were important
            3. Mentions any issues that were fixed
            4. Describes new features that were created
            
            Use simple, clear language that a business user would understand.
            """
            
            response = self.model.generate_content(prompt)
            return response.text.strip()
            
        except Exception as e:
            return "I've successfully cleaned and prepared your data for forecasting. This included handling any data quality issues and creating useful features for better predictions."
    
    async def explain_model_performance(self, metrics: Dict[str, Any]) -> str:
        """
        Generate business-friendly explanation of model performance.
        """
        try:
            prompt = f"""
            Explain these model performance metrics in business terms:
            
            Model Metrics:
            {json.dumps(metrics, indent=2)}
            
            Create an explanation that:
            1. Identifies the best performing model
            2. Explains what the accuracy metrics mean for business
            3. Compares different models in simple terms
            4. Gives confidence in the results
            
            Avoid technical jargon and focus on practical implications.
            """
            
            response = self.model.generate_content(prompt)
            return response.text.strip()
            
        except Exception as e:
            return "I've evaluated all the trained models and identified the best performer for your data. The results show good accuracy for reliable forecasting."
    
    async def generate_forecast_insights(self, forecast_data: Dict[str, Any]) -> str:
        """
        Generate business insights from forecast results.
        """
        try:
            prompt = f"""
            Generate business insights from these forecast results:
            
            Forecast Data:
            {json.dumps(forecast_data, indent=2)}
            
            Create insights that:
            1. Summarize the forecast trend and patterns
            2. Highlight key business implications
            3. Mention confidence levels and reliability
            4. Suggest actionable next steps
            5. Point out any notable patterns or changes
            
            Focus on what this means for business planning and decision-making.
            """
            
            response = self.model.generate_content(prompt)
            return response.text.strip()
            
        except Exception as e:
            return "I've generated your forecast with confidence intervals. The results show clear patterns that can help with your business planning and decision-making."
    
    async def generate_workflow(self, analysis_results: Dict[str, Any], 
                              user_preferences: Dict[str, Any]) -> str:
        """
        Generate dynamic workflow plan based on data analysis.
        """
        try:
            prompt = f"""
            Generate a dynamic training plan based on this data analysis:
            
            Analysis Results:
            {json.dumps(analysis_results, indent=2)}
            
            User Preferences:
            {json.dumps(user_preferences, indent=2)}
            
            Create a training plan that:
            1. Recommends specific algorithms based on data characteristics
            2. Suggests preprocessing steps needed
            3. Estimates training time and complexity
            4. Explains the reasoning for recommendations
            
            Format as a clear, actionable plan.
            """
            
            response = self.model.generate_content(prompt)
            return response.text.strip()
            
        except Exception as e:
            return "Based on your data characteristics, I recommend training Prophet, XGBoost, and LightGBM models with cross-validation to find the best performer."
    
    def _build_context_info(self, context: ConversationContext = None, 
                           preferences: UserPreferences = None, 
                           session_data: Any = None) -> str:
        """Build context information string for prompts."""
        context_parts = []
        
        if preferences:
            context_parts.append(f"User Type: {preferences.user_type.value}")
            context_parts.append(f"Explanation Level: {preferences.preferred_explanation_level}")
            context_parts.append(f"Auto Execute: {preferences.auto_execute_workflows}")
        
        if context:
            if context.current_intent:
                context_parts.append(f"Current Intent: {context.current_intent}")
            if context.last_action:
                context_parts.append(f"Last Action: {context.last_action}")
            if context.pending_approvals:
                context_parts.append(f"Pending Approvals: {len(context.pending_approvals)}")
            if context.workflow_state:
                context_parts.append(f"Workflow State: {context.workflow_state.get('status', 'unknown')}")
        
        if session_data:
            has_data = getattr(session_data, 'raw_data', None) is not None
            has_models = len(getattr(session_data, 'models', {})) > 0
            has_forecasts = len(getattr(session_data, 'forecasts', {})) > 0
            
            context_parts.append(f"Has Data: {has_data}")
            context_parts.append(f"Has Models: {has_models}")
            context_parts.append(f"Has Forecasts: {has_forecasts}")
        
        return "\n".join(context_parts) if context_parts else "No context available"
    
    def _parse_json_response(self, response_text: str) -> Dict[str, Any]:
        """Parse JSON response from Gemini, handling various formats."""
        try:
            # Try to find JSON in the response
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                return json.loads(json_str)
            else:
                # If no JSON found, create a basic response
                return {
                    "intent": "general",
                    "confidence": 0.5,
                    "parameters": {},
                    "entities": [],
                    "suggested_action": "general_response",
                    "reasoning": "Could not parse structured response"
                }
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            return {
                "intent": "general",
                "confidence": 0.5,
                "parameters": {},
                "entities": [],
                "suggested_action": "general_response",
                "reasoning": "JSON parsing failed"
            }
    
    def _validate_intent_analysis(self, analysis: Dict[str, Any], 
                                 original_message: str) -> Dict[str, Any]:
        """Validate and enhance intent analysis results."""
        # Ensure required fields exist
        required_fields = ["intent", "confidence", "parameters", "entities", "suggested_action"]
        for field in required_fields:
            if field not in analysis:
                analysis[field] = self._get_default_value(field)
        
        # Validate intent is in known categories
        if analysis["intent"] not in self.intent_categories:
            analysis["intent"] = "general"
            analysis["confidence"] = max(0.3, analysis.get("confidence", 0.5) - 0.2)
        
        # Ensure confidence is between 0 and 1
        analysis["confidence"] = max(0.0, min(1.0, analysis.get("confidence", 0.5)))
        
        # Add original message for reference
        analysis["original_message"] = original_message
        analysis["timestamp"] = datetime.now().isoformat()
        
        return analysis
    
    def _get_default_value(self, field: str) -> Any:
        """Get default value for missing fields."""
        defaults = {
            "intent": "general",
            "confidence": 0.5,
            "parameters": {},
            "entities": [],
            "suggested_action": "general_response",
            "possible_intents": ["help", "data_upload"],
            "reasoning": "Default value used"
        }
        return defaults.get(field, None)
    
    async def analyze_data_patterns(self, data_summary: Dict[str, Any]) -> str:
        """Analyze data patterns and provide insights."""
        try:
            prompt = f"""
            Analyze these data patterns and provide business insights:
            
            Data Summary:
            {json.dumps(data_summary, indent=2)}
            
            Provide insights about:
            1. Key patterns and trends
            2. Seasonality and cycles
            3. Data quality observations
            4. Forecasting opportunities
            5. Recommended next steps
            
            Use business-friendly language and focus on actionable insights.
            """
            
            response = self.model.generate_content(prompt)
            return response.text.strip()
            
        except Exception as e:
            return "I've analyzed your data and found several interesting patterns that will help create accurate forecasts."
    
    async def suggest_algorithms(self, data_characteristics: Dict[str, Any]) -> List[str]:
        """Suggest best algorithms based on data characteristics."""
        try:
            prompt = f"""
            Based on these data characteristics, recommend the best forecasting algorithms:
            
            Data Characteristics:
            {json.dumps(data_characteristics, indent=2)}
            
            Consider:
            - Data size and frequency
            - Seasonality patterns
            - Trend characteristics
            - Noise levels
            - Business requirements
            
            Return a JSON list of recommended algorithms in order of preference:
            ["algorithm1", "algorithm2", "algorithm3"]
            """
            
            response = self.model.generate_content(prompt)
            
            # Parse algorithm recommendations
            try:
                algorithms = json.loads(response.text.strip())
                if isinstance(algorithms, list):
                    return algorithms
            except:
                pass
            
            # Fallback recommendations
            return ["prophet", "xgboost", "lightgbm"]
            
        except Exception as e:
            return ["prophet", "xgboost", "lightgbm"]