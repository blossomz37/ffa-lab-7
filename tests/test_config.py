#!/usr/bin/env python3
"""
Test configuration and utilities
Shared configuration and helper functions for all tests
"""

import os
from pathlib import Path

# Test configuration
TEST_CONFIG = {
    'timeout': 300,  # 5 minutes per test
    'api_timeout': 90,  # 90 seconds for API calls
    'rate_limit_delay': 2,  # seconds between API calls
    'max_retries': 2,
    'test_image_min_size': 1000,  # minimum bytes for valid image
    'test_content_min_length': 10,  # minimum characters for valid text
}

# File paths
PROJECT_ROOT = Path(__file__).parent.parent
TOOLS_DIR = PROJECT_ROOT / "tools"
TESTS_DIR = PROJECT_ROOT / "tests"
OUTPUT_DIR = PROJECT_ROOT / "output"
MCP_DIR = PROJECT_ROOT / "mcp-writing-assistant"
PERSONA_DIR = PROJECT_ROOT / "docs" / "writers_room_personas"

# Test data
SAMPLE_PROMPTS = {
    'simple': "Generate a short description of a cyberpunk city.",
    'detailed': "Write a detailed description of a cyberpunk detective walking through a neon-lit marketplace in Neo-Tokyo 2099.",
    'creative': "Create an engaging opening paragraph for a science fiction story about memory theft.",
}

SAMPLE_IMAGE_DESCRIPTIONS = {
    'simple': "A futuristic city skyline",
    'detailed': "A cyberpunk detective with glowing eyes in a rain-soaked alley with neon reflections",
    'artistic': "A steampunk library with floating books and magical lighting",
}

SAMPLE_STORY_CONTENT = """
Neo-Tokyo 2099 - The Neon Underground

Detective Sarah Chen's cybernetic eye flickered as she scanned the crowd in the Shibuya Underground Market. 
Three victims in the past week, all with the same surgical precision - their memories extracted with 
military-grade neural interfaces. The Memory Thief was getting bolder, and the trail was growing cold.

The marketplace buzzed with illegal tech vendors hawking everything from bootleg consciousness 
uploads to black market sensory enhancers. Holographic advertisements danced between the stalls, 
promising digital immortality to anyone with enough credits.

Sarah's partner Mike approached, his artificial arm whirring softly as he gestured toward a shadowy 
corner where someone in a hooded jacket was making a hasty exit.

"Another witness just vanished," Mike said, his voice barely audible over the electronic music 
pounding from the nearby VR arcade. "Same story - saw something, then nothing. Clean memory wipe."
"""

def get_api_keys():
    """Get API keys from environment"""
    return {
        'openrouter': os.environ.get('open_router_key'),
        'openai': os.environ.get('open_ai_key'),
    }

def get_models():
    """Get model configurations from environment"""
    return {
        'text_model_1': os.environ.get('text_model_1', 'google/gemini-2.5-flash'),
        'text_model_2': os.environ.get('text_model_2', 'anthropic/claude-sonnet-4'),
        'text_model_3': os.environ.get('text_model_3', 'mistralai/magistral-medium-2506'),
        'text_model_4': os.environ.get('text_model_4', 'google/gemini-2.5-pro'),
        'text_model_5': os.environ.get('text_model_5', 'anthropic/claude-3.7-sonnet'),
        'text_model_6': os.environ.get('text_model_6', 'deepseek/deepseek-chat-v3-0324'),
        'image_model_1': os.environ.get('image_model_1', 'google/gemini-2.5-flash-image-preview'),
    }

def check_environment():
    """Check if test environment is properly configured"""
    issues = []
    
    # Check API keys
    api_keys = get_api_keys()
    if not api_keys['openrouter']:
        issues.append("Missing OpenRouter API key (open_router_key)")
    
    # Check directories
    required_dirs = [TOOLS_DIR, OUTPUT_DIR]
    for directory in required_dirs:
        if not directory.exists():
            issues.append(f"Missing directory: {directory}")
    
    # Check tool files
    required_tools = ['text_generator.py', 'image_generator.py', 'writers_room.py']
    for tool in required_tools:
        tool_path = TOOLS_DIR / tool
        if not tool_path.exists():
            issues.append(f"Missing tool: {tool_path}")
    
    return issues

def setup_test_environment():
    """Set up test environment (create directories, etc.)"""
    # Create output directories
    output_dirs = [
        OUTPUT_DIR / 'test_images',
        OUTPUT_DIR / 'test_text', 
        OUTPUT_DIR / 'test_writers_room',
        OUTPUT_DIR / 'mcp_images',
        OUTPUT_DIR / 'mcp_text',
        OUTPUT_DIR / 'writers_room',
    ]
    
    for directory in output_dirs:
        directory.mkdir(parents=True, exist_ok=True)
    
    return True

def cleanup_test_files():
    """Clean up temporary test files"""
    # Remove test output files older than 1 hour
    import time
    current_time = time.time()
    
    cleanup_dirs = [
        OUTPUT_DIR / 'test_images',
        OUTPUT_DIR / 'test_text',
        OUTPUT_DIR / 'test_writers_room',
    ]
    
    for directory in cleanup_dirs:
        if directory.exists():
            for file_path in directory.iterdir():
                if file_path.is_file():
                    file_age = current_time - file_path.stat().st_mtime
                    if file_age > 3600:  # 1 hour
                        try:
                            file_path.unlink()
                        except:
                            pass  # Ignore cleanup errors

def get_test_summary():
    """Get summary of test configuration"""
    api_keys = get_api_keys()
    models = get_models()
    
    return {
        'api_keys_configured': {
            'openrouter': bool(api_keys['openrouter']),
            'openai': bool(api_keys['openai']),
        },
        'models_configured': len([m for m in models.values() if m]),
        'directories_exist': {
            'tools': TOOLS_DIR.exists(),
            'output': OUTPUT_DIR.exists(),
            'mcp': MCP_DIR.exists(),
            'personas': PERSONA_DIR.exists(),
        },
        'persona_count': len(list(PERSONA_DIR.glob('persona_*.md'))) if PERSONA_DIR.exists() else 0,
    }

if __name__ == "__main__":
    # Test configuration check
    print("🔧 Test Configuration Check")
    print("-" * 30)
    
    issues = check_environment()
    if issues:
        print("❌ Environment issues found:")
        for issue in issues:
            print(f"   - {issue}")
    else:
        print("✅ Environment looks good")
    
    summary = get_test_summary()
    print(f"\n📊 Configuration Summary:")
    print(f"   API Keys: OpenRouter({'✅' if summary['api_keys_configured']['openrouter'] else '❌'}), "
          f"OpenAI({'✅' if summary['api_keys_configured']['openai'] else '❌'})")
    print(f"   Models: {summary['models_configured']} configured")
    print(f"   Personas: {summary['persona_count']} found")
    
    # Set up test environment
    setup_test_environment()
    print("\n✅ Test environment ready")