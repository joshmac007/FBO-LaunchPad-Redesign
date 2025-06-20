"""
FBO LaunchPad Backend Package
"""

# Import the main create_app function from app.py
from .app import create_app

# Make create_app available when importing from src
__all__ = ['create_app']
