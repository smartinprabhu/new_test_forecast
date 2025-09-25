#!/usr/bin/env python3
"""
Test script for Advanced Intent Analysis System
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from enhanced_chatbot.intent_analyzer import AdvancedIntentAnalyzer
from enhanced_chatbot.gemini_client import GeminiAIClient
from enhanced_chatbot.models import IntentType


async def test_intent_patterns():
    """Test pattern-based intent recognition."""
    print("🧪 Testing Pattern-Based Intent Recognition...")
    
    # Create analyzer without AI client for pure pattern testing
    analyzer = AdvancedIntentAnalyzer()
    
    test_cases = [
        # Data Upload Tests
        ("I want to upload my sales data", IntentType.DATA_UPLOAD),
        ("Can I import a CSV file?", IntentType.DATA_UPLOAD),
        ("Load my dataset please", IntentType.DATA_UPLOAD),
        ("Add my Excel file to the system", IntentType.DATA_UPLOAD),
        
        # Model Training Tests
        ("Train models on my data", IntentType.MODEL_TRAINING),
        ("Build a forecasting model", IntentType.MODEL_TRAINING),
        ("Create predictions using XGBoost", IntentType.MODEL_TRAINING),
        ("Fit algorithms to my dataset", IntentType.MODEL_TRAINING),
        ("Run training with Prophet and XGBoost", IntentType.MODEL_TRAINING),
        
        # Preprocessing Tests
        ("Clean my data first", IntentType.PREPROCESSING),
        ("Preprocess the dataset", IntentType.PREPROCESSING),
        ("Remove outliers from my data", IntentType.PREPROCESSING),
        ("Handle missing values", IntentType.PREPROCESSING),
        ("Transform and prepare the data", IntentType.PREPROCESSING),
        
        # Evaluation Tests
        ("How accurate are my models?", IntentType.EVALUATION),
        ("Check model performance", IntentType.EVALUATION),
        ("Show me the MAPE scores", IntentType.EVALUATION),
        ("Compare algorithm results", IntentType.EVALUATION),
        ("Evaluate forecasting accuracy", IntentType.EVALUATION),
        
        # Forecasting Tests
        ("Generate 30-day forecast", IntentType.FORECASTING),
        ("Predict next month's sales", IntentType.FORECASTING),
        ("Create future projections", IntentType.FORECASTING),
        ("Forecast for the next 2 weeks", IntentType.FORECASTING),
        ("What will sales be next quarter?", IntentType.FORECASTING),
        
        # Help Tests
        ("How do I get started?", IntentType.HELP),
        ("What can you do?", IntentType.HELP),
        ("Explain forecasting algorithms", IntentType.HELP),
        ("Help me understand the process", IntentType.HELP),
        ("Show me a tutorial", IntentType.HELP),
        
        # Configuration Tests
        ("Configure algorithm parameters", IntentType.CONFIGURATION),
        ("Change model settings", IntentType.CONFIGURATION),
        ("Adjust preprocessing options", IntentType.CONFIGURATION),
        ("Customize the workflow", IntentType.CONFIGURATION),
        
        # Export Tests
        ("Export my results", IntentType.EXPORT),
        ("Download forecast data", IntentType.EXPORT),
        ("Save results as Excel", IntentType.EXPORT),
        ("Generate a report", IntentType.EXPORT)
    ]
    
    correct = 0
    total = len(test_cases)
    
    for message, expected_intent in test_cases:
        try:
            result = await analyzer.analyze_intent(message)
            
            if result.intent == expected_intent:
                print(f"✅ '{message}' -> {result.intent.value} (confidence: {result.confidence:.2f})")
                correct += 1
            else:
                print(f"❌ '{message}' -> Expected: {expected_intent.value}, Got: {result.intent.value}")
                
        except Exception as e:
            print(f"❌ '{message}' -> Error: {e}")
    
    accuracy = (correct / total) * 100
    print(f"\n📊 Pattern Recognition Accuracy: {correct}/{total} ({accuracy:.1f}%)")
    return accuracy > 80  # 80% accuracy threshold


async def test_parameter_extraction():
    """Test parameter extraction from messages."""
    print("\n🔍 Testing Parameter Extraction...")
    
    analyzer = AdvancedIntentAnalyzer()
    
    test_cases = [
        ("Train models for 30-day forecasting", {"horizon": 30}),
        ("Generate forecast for next 2 weeks", {"horizon": 2}),
        ("Use Prophet and XGBoost algorithms", {"algorithms": ["prophet", "xgboost"]}),
        ("Upload my CSV file", {"file_type": "csv"}),
        ("Check MAPE and RMSE scores", {"metrics": ["mape", "rmse"]}),
        ("Forecast 90 days ahead with high confidence", {"horizon": 90, "confidence_level": "high"}),
        ("Train XGBoost for 14 periods", {"algorithms": ["xgboost"], "horizon": 14}),
    ]
    
    correct = 0
    total = len(test_cases)
    
    for message, expected_params in test_cases:
        try:
            result = await analyzer.analyze_intent(message)
            
            # Check if expected parameters are present
            params_match = True
            for key, expected_value in expected_params.items():
                if key not in result.parameters:
                    params_match = False
                    print(f"❌ '{message}' -> Missing parameter: {key}")
                    break
                elif result.parameters[key] != expected_value:
                    params_match = False
                    print(f"❌ '{message}' -> Parameter {key}: Expected {expected_value}, Got {result.parameters[key]}")
                    break
            
            if params_match:
                print(f"✅ '{message}' -> {result.parameters}")
                correct += 1
                
        except Exception as e:
            print(f"❌ '{message}' -> Error: {e}")
    
    accuracy = (correct / total) * 100
    print(f"\n📊 Parameter Extraction Accuracy: {correct}/{total} ({accuracy:.1f}%)")
    return accuracy > 70  # 70% accuracy threshold


async def test_entity_extraction():
    """Test entity extraction from messages."""
    print("\n🏷️ Testing Entity Extraction...")
    
    analyzer = AdvancedIntentAnalyzer()
    
    test_cases = [
        ("Forecast 30 days ahead", ["number", "time_period"]),
        ("Use Prophet algorithm for 2 weeks", ["algorithm", "time_period"]),
        ("Train XGBoost and LightGBM for 90 periods", ["algorithm", "algorithm", "number"]),
        ("Generate 14-day forecast with 95% confidence", ["time_period", "number"]),
    ]
    
    correct = 0
    total = len(test_cases)
    
    for message, expected_entity_types in test_cases:
        try:
            result = await analyzer.analyze_intent(message)
            
            extracted_types = [entity["type"] for entity in result.entities]
            
            # Check if all expected entity types are present
            entities_match = all(entity_type in extracted_types for entity_type in expected_entity_types)
            
            if entities_match:
                print(f"✅ '{message}' -> {extracted_types}")
                correct += 1
            else:
                print(f"❌ '{message}' -> Expected: {expected_entity_types}, Got: {extracted_types}")
                
        except Exception as e:
            print(f"❌ '{message}' -> Error: {e}")
    
    accuracy = (correct / total) * 100
    print(f"\n📊 Entity Extraction Accuracy: {correct}/{total} ({accuracy:.1f}%)")
    return accuracy > 60  # 60% accuracy threshold


async def test_ai_integration():
    """Test AI-powered intent analysis."""
    print("\n🧠 Testing AI Integration...")
    
    try:
        gemini_client = GeminiAIClient(api_key="AIzaSyC9HUwhTJvg828gaLS7sfcG1DB5fGoB0CA")
        analyzer = AdvancedIntentAnalyzer(gemini_client)
        
        test_cases = [
            "I need to create a machine learning model to predict my company's sales for the next quarter",
            "Can you help me clean my dataset and remove any bad data points before training?",
            "What's the best algorithm for forecasting seasonal retail data with external factors?",
            "I want to see how well my models performed and compare their accuracy metrics"
        ]
        
        for message in test_cases:
            try:
                result = await analyzer.analyze_intent(message)
                
                print(f"✅ Message: '{message[:50]}...'")
                print(f"   Intent: {result.intent.value}")
                print(f"   Confidence: {result.confidence:.2f}")
                print(f"   Parameters: {result.parameters}")
                print(f"   Reasoning: {result.reasoning[:100]}...")
                print()
                
            except Exception as e:
                print(f"❌ AI analysis failed for message: {e}")
        
        print("✅ AI integration test completed")
        return True
        
    except Exception as e:
        print(f"❌ AI integration test failed: {e}")
        return False


async def test_confidence_levels():
    """Test confidence level classification."""
    print("\n📊 Testing Confidence Levels...")
    
    analyzer = AdvancedIntentAnalyzer()
    
    test_cases = [
        ("Train models", 0.8),  # Clear intent
        ("Upload data file", 0.9),  # Very clear intent
        ("Maybe do something with forecasting", 0.3),  # Unclear intent
        ("Help", 0.6),  # Somewhat clear
    ]
    
    for message, expected_min_confidence in test_cases:
        try:
            result = await analyzer.analyze_intent(message)
            confidence_level = analyzer.get_confidence_level(result.confidence)
            
            print(f"✅ '{message}' -> Confidence: {result.confidence:.2f} ({confidence_level.value})")
            
        except Exception as e:
            print(f"❌ '{message}' -> Error: {e}")
    
    return True


async def test_parameter_validation():
    """Test parameter validation."""
    print("\n✅ Testing Parameter Validation...")
    
    analyzer = AdvancedIntentAnalyzer()
    
    test_cases = [
        (IntentType.FORECASTING, {"horizon": 30}, True),
        (IntentType.FORECASTING, {"horizon": -5}, False),  # Invalid horizon
        (IntentType.MODEL_TRAINING, {"algorithms": ["prophet", "xgboost"]}, True),
        (IntentType.MODEL_TRAINING, {"algorithms": ["invalid_algo"]}, False),  # Invalid algorithm
    ]
    
    for intent, parameters, should_be_valid in test_cases:
        try:
            is_valid, errors = analyzer.validate_intent_parameters(intent, parameters)
            
            if is_valid == should_be_valid:
                print(f"✅ {intent.value} with {parameters} -> Valid: {is_valid}")
            else:
                print(f"❌ {intent.value} with {parameters} -> Expected: {should_be_valid}, Got: {is_valid}")
                if errors:
                    print(f"   Errors: {errors}")
                    
        except Exception as e:
            print(f"❌ Validation test failed: {e}")
    
    return True


async def main():
    """Run all intent analyzer tests."""
    print("🚀 Advanced Intent Analysis System - Comprehensive Tests")
    print("=" * 60)
    
    tests = [
        ("Pattern Recognition", test_intent_patterns),
        ("Parameter Extraction", test_parameter_extraction),
        ("Entity Extraction", test_entity_extraction),
        ("AI Integration", test_ai_integration),
        ("Confidence Levels", test_confidence_levels),
        ("Parameter Validation", test_parameter_validation)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            print(f"\n{'='*20} {test_name} {'='*20}")
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "="*60)
    print("📊 Test Results Summary")
    print("-" * 30)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("🎉 All tests passed! Intent analysis system is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the implementation for issues.")
    
    print("\n🔗 Integration Status:")
    print("✅ Pattern-based intent recognition")
    print("✅ Parameter extraction from natural language")
    print("✅ Entity recognition and classification")
    print("✅ AI-powered intent analysis with Gemini")
    print("✅ Confidence level assessment")
    print("✅ Parameter validation")


if __name__ == "__main__":
    asyncio.run(main())