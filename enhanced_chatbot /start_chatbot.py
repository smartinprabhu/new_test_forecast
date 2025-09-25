#!/usr/bin/env python3
"""
Simple startup script for Enhanced Agentic Chatbot.
This script can be used to quickly start the chatbot server.
"""

import sys
import os
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Set environment variables if needed
os.environ.setdefault("PYTHONPATH", str(project_root))

if __name__ == "__main__":
    from enhanced_chatbot.main import main
    main()