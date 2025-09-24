"""
Advanced Intent Analysis System for Enhanced Agentic Chatbot
Provides sophisticated intent recognition and parameter extraction
"""

import re
import json
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

from .models import IntentAnalysis, IntentType
from .gemini_client import GeminiAIClient

logger = logging.getLogger(__name__)


class ConfidenceLevel(str, Enum):
    """Confidence levels for intent analysis."""
    VERY_HIGH = "very_high"  # 0.9+
    HIGH = "high"           # 0.7-0.9
    MEDIUM = "medium"       # 0.5-0.7
    LOW = "low"            # 0.3-0.5
    VERY_LOW = "very_low"  # <0.3


@dataclass
class IntentPattern:
    """Pattern for intent recognition."""
    intent: IntentType
    keywords: List[str]
    patterns: List[str]
    required_params: List[str]
    optional_params: List[str]
    confidence_boost: float = 0.0


class AdvancedIntentAnalyzer:
    """Advanced intent analysis with pattern matching and AI integration."""
    
    def __init__(self, gemini_client: Optional[GeminiAIClient] = None):
        self.gemini_client = gemini_client
        self.intent_patterns = self._initialize_patterns()
        self.parameter_extractors = self._initialize_extractors()
        
    def _initialize_patterns(self) -> List[IntentPattern]:
        """Initialize intent recognition patterns."""
        return [
            # Data Upload Patterns
            IntentPattern(
                intent=IntentType.DATA_UPLOAD,
                keywords=["upload", "data", "file", "csv", "excel", "dataset", "import"],
                patterns=[
                    r"upload.*(?:data|file|csv|excel)",
                    r"(?:data|file|csv|excel).*upload",
                    r"import.*(?:data|file)",
                    r"load.*(?:data|dataset)",
                    r"add.*(?:data|file)"
                ],
                required_params=[],
                optional_params=["file_type", "columns"]
            ),
            
            # Model Training Patterns
            IntentPattern(
                intent=IntentType.MODEL_TRAINING,
                keywords=["train", "model", "algorithm", "build", "create", "fit"],
                patterns=[
                    r"train.*(?:model|algorithm)",
                    r"(?:model|algorithm).*train",
                    r"build.*(?:model|forecast)",
                    r"create.*(?:model|prediction)",
                    r"fit.*(?:model|algorithm)",
                    r"run.*(?:training|algorithm)"
                ],
                required_params=[],
                optional_params=["algorithms", "horizon", "validation_split"]
            ),
            
            # Preprocessing Patterns
            IntentPattern(
                intent=IntentType.PREPROCESSING,
                keywords=["clean", "preprocess", "prepare", "transform", "outlier", "missing"],
                patterns=[
                    r"clean.*data",
                    r"preprocess.*data",
                    r"prepare.*data",
                    r"transform.*data",
                    r"(?:remove|handle).*(?:outlier|missing)",
                    r"data.*(?:cleaning|preparation)"
                ],
                required_params=[],
                optional_params=["methods", "outlier_method", "missing_strategy"]
            ),
            
            # Evaluation Patterns
            IntentPattern(
                intent=IntentType.EVALUATION,
                keywords=["evaluate", "performance", "accuracy", "metrics", "compare", "results"],
                patterns=[
                    r"(?:evaluate|check).*(?:performance|accuracy)",
                    r"(?:model|algorithm).*(?:performance|accuracy)",
                    r"(?:compare|show).*(?:results|metrics)",
                    r"how.*(?:good|accurate|perform)",
                    r"(?:mape|rmse|mae|r2).*(?:score|value)"
                ],
                required_params=[],
                optional_params=["metrics", "models"]
            ),
            
            # Forecasting Patterns
            IntentPattern(
                intent=IntentType.FORECASTING,
                keywords=["forecast", "predict", "future", "projection", "estimate"],
                patterns=[
                    r"(?:forecast|predict).*(?:future|next|days?|weeks?|months?)",
                    r"(?:generate|create).*(?:forecast|prediction)",
                    r"(?:future|next).*(?:values?|sales?|demand)",
                    r"(?:\d+).*(?:day|week|month).*(?:forecast|prediction)",
                    r"what.*(?:will|expect).*(?:future|next)"
                ],
                required_params=[],
                optional_params=["horizon", "confidence_intervals", "scenarios"]
            ),
            
            # Help Patterns
            IntentPattern(
                intent=IntentType.HELP,
                keywords=["help", "how", "what", "explain", "guide", "tutorial"],
                patterns=[
                    r"(?:help|guide).*(?:me|with)",
                    r"how.*(?:do|to|can)",
                    r"what.*(?:is|are|can|should)",
                    r"explain.*(?:how|what|why)",
                    r"(?:show|tell).*(?:me|how)",
                    r"(?:tutorial|guide|documentation)"
                ],
                required_params=[],
                optional_params=["topic", "specific_question"]
            ),
            
            # Configuration Patterns
            IntentPattern(
                intent=IntentType.CONFIGURATION,
                keywords=["configure", "settings", "parameters", "options", "customize"],
                patterns=[
                    r"(?:configure|set|change).*(?:settings|parameters)",
                    r"(?:customize|modify).*(?:options|settings)",
                    r"(?:adjust|tune).*(?:parameters|settings)",
                    r"(?:settings|configuration).*(?:for|of)",
                    r"(?:parameters|options).*(?:change|modify)"
                ],
                required_params=[],
                optional_params=["component", "parameters", "values"]
            ),
            
            # Export Patterns
            IntentPattern(
                intent=IntentType.EXPORT,
                keywords=["export", "download", "save", "output", "generate", "report"],
                patterns=[
                    r"(?:export|download|save).*(?:results|data|report)",
                    r"(?:generate|create).*(?:report|output)",
                    r"(?:output|save).*(?:to|as).*(?:csv|excel|pdf)",
                    r"(?:download|get).*(?:results|forecast)",
                    r"(?:report|summary).*(?:generate|create)"
                ],
                required_params=[],
                optional_params=["format", "content", "destination"]
            )
        ]
    
    def _initialize_extractors(self) -> Dict[str, callable]:
        """Initialize parameter extraction functions."""
        return {
            "horizon": self._extract_forecast_horizon,
            "algorithms": self._extract_algorithms,
            "file_type": self._extract_file_type,
            "metrics": self._extract_metrics,
            "time_period": self._extract_time_period,
            "numbers": self._extract_numbers,
            "dates": self._extract_dates,
            "confidence_level": self._extract_confidence_level
        }
    
    async def analyze_intent(self, message: str, context: Dict[str, Any] = None) -> IntentAnalysis:
        """Analyze user message to determine intent and extract parameters."""
        context = context or {}
        
        try:
            # First try AI-powered analysis if available
            if self.gemini_client:
                ai_analysis = await self._ai_intent_analysis(message, context)
                if ai_analysis and ai_analysis.confidence > 0.6:
                    return ai_analysis
            
            # Fallback to pattern-based analysis
            pattern_analysis = self._pattern_based_analysis(message, context)
            
            # Combine results if both are available
            if self.gemini_client and ai_analysis:
                return self._combine_analyses(ai_analysis, pattern_analysis)
            
            return pattern_analysis
            
        except Exception as e:
            logger.error(f"Intent analysis error: {e}")
            return self._fallback_analysis(message)
    
    async def _ai_intent_analysis(self, message: str, context: Dict[str, Any]) -> Optional[IntentAnalysis]:
        """Use AI for intent analysis."""
        try:
            prompt = self._build_ai_prompt(message, context)
            response = await self.gemini_client._generate_content_async(prompt)
            
            # Parse AI response
            return self._parse_ai_response(response, message)
            
        except Exception as e:
            logger.warning(f"AI intent analysis failed: {e}")
            return None
    
    def _build_ai_prompt(self, message: str, context: Dict[str, Any]) -> str:
        """Build prompt for AI intent analysis."""
        return f"""
        Analyze this user message for forecasting intent and extract parameters.
        
        Message: "{message}"
        Context: {json.dumps(context, default=str)}
        
        Available intents:
        - data_upload: User wants to upload or discuss data
        - model_training: User wants to train forecasting models  
        - preprocessing: User wants to clean or preprocess data
        - evaluation: User wants to evaluate model performance
        - forecasting: User wants to generate forecasts
        - help: User needs help or explanations
        - configuration: User wants to configure settings
        - export: User wants to export results
        - general: General conversation or unclear intent
        
        Extract parameters like:
        - horizon: forecast horizon (number of periods)
        - algorithms: specific algorithms mentioned
        - file_type: data file type (csv, excel, etc.)
        - metrics: performance metrics mentioned
        - confidence_intervals: if user wants confidence intervals
        - time_period: time periods mentioned (days, weeks, months)
        
        Respond with JSON only:
        {{
            "intent": "intent_name",
            "confidence": 0.95,
            "parameters": {{"horizon": 30, "algorithms": ["prophet", "xgboost"]}},
            "entities": [{{"type": "number", "value": 30, "text": "30 days"}}],
            "reasoning": "User explicitly asked to train models for 30-day forecasting"
        }}
        """
    
    def _parse_ai_response(self, response: str, original_message: str) -> Optional[IntentAnalysis]:
        """Parse AI response into IntentAnalysis object."""
        try:
            # Clean response and extract JSON
            response = response.strip()
            if response.startswith("```json"):
                response = response[7:-3]
            elif response.startswith("```"):
                response = response[3:-3]
            
            data = json.loads(response)
            
            return IntentAnalysis(
                intent=IntentType(data.get("intent", "general")),
                confidence=float(data.get("confidence", 0.5)),
                parameters=data.get("parameters", {}),
                entities=data.get("entities", []),
                reasoning=data.get("reasoning", "")
            )
            
        except (json.JSONDecodeError, ValueError, KeyError) as e:
            logger.warning(f"Failed to parse AI response: {e}")
            return None
    
    def _pattern_based_analysis(self, message: str, context: Dict[str, Any]) -> IntentAnalysis:
        """Analyze intent using pattern matching."""
        message_lower = message.lower()
        best_match = None
        best_score = 0.0
        
        for pattern in self.intent_patterns:
            score = self._calculate_pattern_score(message_lower, pattern)
            
            if score > best_score:
                best_score = score
                best_match = pattern
        
        if best_match and best_score > 0.3:
            # Extract parameters
            parameters = self._extract_parameters(message, best_match)
            
            # Extract entities
            entities = self._extract_entities(message)
            
            return IntentAnalysis(
                intent=best_match.intent,
                confidence=min(0.95, best_score + best_match.confidence_boost),
                parameters=parameters,
                entities=entities,
                reasoning=f"Pattern-based analysis matched {best_match.intent.value} with score {best_score:.2f}"
            )
        
        # Default to general intent
        return IntentAnalysis(
            intent=IntentType.GENERAL,
            confidence=0.5,
            parameters={},
            entities=[],
            reasoning="No strong pattern match found"
        )
    
    def _calculate_pattern_score(self, message: str, pattern: IntentPattern) -> float:
        """Calculate how well a message matches a pattern."""
        score = 0.0
        message_lower = message.lower()
        
        # Keyword matching (case insensitive)
        keyword_matches = sum(1 for keyword in pattern.keywords if keyword.lower() in message_lower)
        keyword_score = keyword_matches / len(pattern.keywords) if pattern.keywords else 0
        score += keyword_score * 0.4
        
        # Regex pattern matching (case insensitive)
        pattern_matches = sum(1 for regex in pattern.patterns if re.search(regex, message_lower, re.IGNORECASE))
        pattern_score = pattern_matches / len(pattern.patterns) if pattern.patterns else 0
        score += pattern_score * 0.6
        
        # Boost score if multiple keywords match
        if keyword_matches > 1:
            score += 0.1
        
        # Boost score if both keywords and patterns match
        if keyword_matches > 0 and pattern_matches > 0:
            score += 0.1
        
        return min(1.0, score)  # Cap at 1.0
    
    def _extract_parameters(self, message: str, pattern: IntentPattern) -> Dict[str, Any]:
        """Extract parameters from message based on pattern."""
        parameters = {}
        
        # Extract all possible parameters
        for param_name, extractor in self.parameter_extractors.items():
            try:
                value = extractor(message)
                if value is not None:
                    parameters[param_name] = value
            except Exception as e:
                logger.debug(f"Parameter extraction failed for {param_name}: {e}")
        
        return parameters
    
    def _extract_entities(self, message: str) -> List[Dict[str, Any]]:
        """Extract named entities from message."""
        entities = []
        message_lower = message.lower()
        
        # Extract numbers
        numbers = re.findall(r'\b\d+\b', message)
        for num in numbers:
            entities.append({
                "type": "number",
                "value": int(num),
                "text": num
            })
        
        # Extract time periods (more comprehensive patterns)
        time_patterns = [
            (r'\b(\d+)[-\s]*(day|days)\b', 'days'),
            (r'\b(\d+)[-\s]*(week|weeks)\b', 'weeks'),
            (r'\b(\d+)[-\s]*(month|months)\b', 'months'),
            (r'\b(\d+)[-\s]*(year|years)\b', 'years'),
            (r'\b(\d+)[-\s]*(period|periods)\b', 'periods')
        ]
        
        for pattern, unit in time_patterns:
            matches = re.findall(pattern, message_lower)
            for match in matches:
                entities.append({
                    "type": "time_period",
                    "value": {"amount": int(match[0]), "unit": unit},
                    "text": f"{match[0]} {match[1]}"
                })
        
        # Extract algorithms (more comprehensive matching)
        algorithm_patterns = [
            ("prophet", ["prophet", "facebook prophet"]),
            ("xgboost", ["xgboost", "xgb", "gradient boost"]),
            ("lightgbm", ["lightgbm", "lgb", "light gbm"]),
            ("arima", ["arima", "auto arima"]),
            ("lstm", ["lstm", "neural network"]),
            ("catboost", ["catboost", "cat boost"])
        ]
        
        for algo_name, variants in algorithm_patterns:
            for variant in variants:
                if variant in message_lower:
                    entities.append({
                        "type": "algorithm",
                        "value": algo_name,
                        "text": variant
                    })
                    break  # Only add once per algorithm
        
        return entities
    
    def _combine_analyses(self, ai_analysis: IntentAnalysis, pattern_analysis: IntentAnalysis) -> IntentAnalysis:
        """Combine AI and pattern-based analyses."""
        # Use AI analysis as base if confidence is higher
        if ai_analysis.confidence >= pattern_analysis.confidence:
            base_analysis = ai_analysis
            secondary_analysis = pattern_analysis
        else:
            base_analysis = pattern_analysis
            secondary_analysis = ai_analysis
        
        # Merge parameters
        combined_parameters = secondary_analysis.parameters.copy()
        combined_parameters.update(base_analysis.parameters)
        
        # Merge entities
        combined_entities = base_analysis.entities + secondary_analysis.entities
        
        # Remove duplicates from entities
        seen_entities = set()
        unique_entities = []
        for entity in combined_entities:
            entity_key = (entity.get("type"), str(entity.get("value")))
            if entity_key not in seen_entities:
                seen_entities.add(entity_key)
                unique_entities.append(entity)
        
        return IntentAnalysis(
            intent=base_analysis.intent,
            confidence=min(0.95, (base_analysis.confidence + secondary_analysis.confidence) / 2 + 0.1),
            parameters=combined_parameters,
            entities=unique_entities,
            reasoning=f"Combined analysis: {base_analysis.reasoning} + {secondary_analysis.reasoning}"
        )
    
    def _fallback_analysis(self, message: str) -> IntentAnalysis:
        """Fallback analysis when all else fails."""
        message_lower = message.lower()
        
        # Simple keyword-based fallback
        if any(word in message_lower for word in ["upload", "data", "file"]):
            intent = IntentType.DATA_UPLOAD
        elif any(word in message_lower for word in ["train", "model", "algorithm"]):
            intent = IntentType.MODEL_TRAINING
        elif any(word in message_lower for word in ["forecast", "predict", "future"]):
            intent = IntentType.FORECASTING
        elif any(word in message_lower for word in ["help", "how", "what"]):
            intent = IntentType.HELP
        else:
            intent = IntentType.GENERAL
        
        return IntentAnalysis(
            intent=intent,
            confidence=0.4,
            parameters={},
            entities=[],
            reasoning="Fallback keyword-based analysis"
        )
    
    # Parameter extraction methods
    def _extract_forecast_horizon(self, message: str) -> Optional[int]:
        """Extract forecast horizon from message."""
        # Look for patterns like "30 days", "next 2 weeks", "3 months"
        patterns = [
            r'(\d+)[-\s]*(?:day|days)',
            r'(\d+)[-\s]*(?:week|weeks)',
            r'(\d+)[-\s]*(?:month|months)',
            r'next\s*(\d+)',
            r'(\d+)[-\s]*(?:period|periods)',
            r'horizon\s*(?:of\s*)?(\d+)',
            r'(\d+)[-\s]*day\s*forecast',
            r'forecast.*?(\d+)',
            r'predict.*?(\d+)'
        ]
        
        message_lower = message.lower()
        for pattern in patterns:
            match = re.search(pattern, message_lower)
            if match:
                horizon = int(match.group(1))
                # Convert weeks/months to days for consistency
                if 'week' in message_lower:
                    horizon *= 7
                elif 'month' in message_lower:
                    horizon *= 30
                return horizon
        
        return None
    
    def _extract_algorithms(self, message: str) -> Optional[List[str]]:
        """Extract algorithm names from message."""
        algorithms = []
        algo_map = {
            "prophet": ["prophet", "facebook prophet"],
            "xgboost": ["xgboost", "xgb", "gradient boost"],
            "lightgbm": ["lightgbm", "lgb", "light gbm"],
            "arima": ["arima", "auto arima"],
            "lstm": ["lstm", "neural network", "deep learning"],
            "catboost": ["catboost", "cat boost"]
        }
        
        message_lower = message.lower()
        for algo, variants in algo_map.items():
            if any(variant in message_lower for variant in variants):
                algorithms.append(algo)
        
        return algorithms if algorithms else None
    
    def _extract_file_type(self, message: str) -> Optional[str]:
        """Extract file type from message."""
        file_types = ["csv", "excel", "xlsx", "xls", "json", "parquet"]
        message_lower = message.lower()
        
        for file_type in file_types:
            if file_type in message_lower:
                return file_type
        
        return None
    
    def _extract_metrics(self, message: str) -> Optional[List[str]]:
        """Extract performance metrics from message."""
        metrics = []
        metric_map = {
            "mape": ["mape", "mean absolute percentage error"],
            "mae": ["mae", "mean absolute error"],
            "rmse": ["rmse", "root mean square error"],
            "mse": ["mse", "mean square error"],
            "r2": ["r2", "r-squared", "coefficient of determination"],
            "accuracy": ["accuracy", "accurate"]
        }
        
        message_lower = message.lower()
        for metric, variants in metric_map.items():
            if any(variant in message_lower for variant in variants):
                metrics.append(metric)
        
        return metrics if metrics else None
    
    def _extract_time_period(self, message: str) -> Optional[Dict[str, Any]]:
        """Extract time period information from message."""
        patterns = [
            (r'(\d+)\s*(day|days)', 'days'),
            (r'(\d+)\s*(week|weeks)', 'weeks'),
            (r'(\d+)\s*(month|months)', 'months'),
            (r'(\d+)\s*(year|years)', 'years')
        ]
        
        for pattern, unit in patterns:
            match = re.search(pattern, message.lower())
            if match:
                return {
                    "amount": int(match.group(1)),
                    "unit": unit
                }
        
        return None
    
    def _extract_numbers(self, message: str) -> Optional[List[int]]:
        """Extract all numbers from message."""
        numbers = re.findall(r'\b\d+\b', message)
        return [int(num) for num in numbers] if numbers else None
    
    def _extract_dates(self, message: str) -> Optional[List[str]]:
        """Extract date mentions from message."""
        date_patterns = [
            r'\b\d{4}-\d{2}-\d{2}\b',  # YYYY-MM-DD
            r'\b\d{2}/\d{2}/\d{4}\b',  # MM/DD/YYYY
            r'\b\d{2}-\d{2}-\d{4}\b',  # MM-DD-YYYY
        ]
        
        dates = []
        for pattern in date_patterns:
            matches = re.findall(pattern, message)
            dates.extend(matches)
        
        return dates if dates else None
    
    def _extract_confidence_level(self, message: str) -> Optional[str]:
        """Extract confidence level requirements from message."""
        if "confidence" in message.lower():
            if any(word in message.lower() for word in ["high", "95%", "99%"]):
                return "high"
            elif any(word in message.lower() for word in ["low", "80%", "85%"]):
                return "low"
            else:
                return "medium"
        
        return None
    
    def get_confidence_level(self, confidence: float) -> ConfidenceLevel:
        """Convert numeric confidence to confidence level."""
        if confidence >= 0.9:
            return ConfidenceLevel.VERY_HIGH
        elif confidence >= 0.7:
            return ConfidenceLevel.HIGH
        elif confidence >= 0.5:
            return ConfidenceLevel.MEDIUM
        elif confidence >= 0.3:
            return ConfidenceLevel.LOW
        else:
            return ConfidenceLevel.VERY_LOW
    
    def validate_intent_parameters(self, intent: IntentType, parameters: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """Validate that required parameters are present for an intent."""
        errors = []
        
        # Find the pattern for this intent
        pattern = next((p for p in self.intent_patterns if p.intent == intent), None)
        if not pattern:
            return True, []
        
        # Check required parameters
        for required_param in pattern.required_params:
            if required_param not in parameters:
                errors.append(f"Missing required parameter: {required_param}")
        
        # Validate parameter values
        if "horizon" in parameters:
            horizon = parameters["horizon"]
            if not isinstance(horizon, int) or horizon <= 0 or horizon > 365:
                errors.append("Forecast horizon must be between 1 and 365 days")
        
        if "algorithms" in parameters:
            algorithms = parameters["algorithms"]
            valid_algorithms = ["prophet", "xgboost", "lightgbm", "arima", "lstm", "catboost"]
            if isinstance(algorithms, list):
                invalid_algos = [a for a in algorithms if a not in valid_algorithms]
                if invalid_algos:
                    errors.append(f"Invalid algorithms: {invalid_algos}")
        
        return len(errors) == 0, errors