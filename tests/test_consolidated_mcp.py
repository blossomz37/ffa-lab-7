#!/usr/bin/env python3
"""
Consolidated MCP Server Tests
Tests all 4 consolidated tools: generate_content, generate_image, writers_room, writers_room_session
"""

import subprocess
import json
import sys
import os
import tempfile
from pathlib import Path

# Add project root to path for imports
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

def get_available_tools():
    """Get list of available tools via handshake script"""
    try:
        mcp_dir = project_root / "mcp-writing-assistant"
        handshake_script = mcp_dir / "dist" / "handshake.js"
        
        if not handshake_script.exists():
            raise FileNotFoundError(f"Handshake script not found: {handshake_script}")
        
        # Run handshake script
        result = subprocess.run([
            "node", str(handshake_script)
        ], capture_output=True, text=True, timeout=10)
        
        if result.returncode != 0:
            raise RuntimeError(f"Handshake failed: {result.stderr}")
        
        # Parse output to extract tool names
        output_lines = result.stdout.strip().split('\n')
        for line in output_lines:
            if line.startswith('Tools:'):
                tools = line.replace('Tools:', '').strip().split(', ')
                return [tool.strip() for tool in tools if tool.strip()]
        
        return []
        
    except Exception as e:
        print(f"Error getting tools: {e}")
        return []

def test_generate_content():
    """Test generate_content tool availability"""
    print("Checking generate_content tool...")
    tools = get_available_tools()
    if "generate_content" in tools:
        print("  ✅ generate_content tool available")
        return True
    else:
        print("  ❌ generate_content tool not found")
        return False

def test_generate_image():
    """Test generate_image tool availability"""
    print("Checking generate_image tool...")
    tools = get_available_tools()
    if "generate_image" in tools:
        print("  ✅ generate_image tool available")
        return True
    else:
        print("  ❌ generate_image tool not found")
        return False

def test_writers_room():
    """Test writers_room tool availability"""
    print("Checking writers_room tool...")
    tools = get_available_tools()
    if "writers_room" in tools:
        print("  ✅ writers_room tool available")
        return True
    else:
        print("  ❌ writers_room tool not found")
        return False

def test_writers_room_session():
    """Test writers_room_session tool availability"""
    print("Checking writers_room_session tool...")
    tools = get_available_tools()
    if "writers_room_session" in tools:
        print("  ✅ writers_room_session tool available")
        return True
    else:
        print("  ❌ writers_room_session tool not found")
        return False

def test_server_startup():
    """Test that MCP server starts without errors"""
    print("Testing MCP server startup...")
    
    try:
        mcp_dir = project_root / "mcp-writing-assistant"
        server_script = mcp_dir / "dist" / "index.js"
        
        if not server_script.exists():
            print(f"  ❌ Server script not found: {server_script}")
            return False
        
        # Quick startup test (just check it doesn't crash immediately)
        result = subprocess.run([
            "timeout", "3", "node", str(server_script)
        ], capture_output=True, timeout=5)
        
        # Timeout is expected, we just want to ensure no immediate crashes
        if result.returncode not in [0, 124]:  # 124 is timeout exit code
            print(f"  ❌ Server startup failed with code {result.returncode}")
            print(f"  Error: {result.stderr.decode()}")
            return False
        
        print("  ✅ Server startup successful")
        return True
        
    except Exception as e:
        print(f"  ❌ Server startup test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Consolidated MCP Tool Tests")
    print("=" * 40)
    
    # Check if .env exists (required for API calls)
    env_file = project_root / ".env"
    if not env_file.exists():
        print("⚠️  No .env file found - API-dependent tests will be skipped")
        print("   Create .env with your API keys to run full test suite")
        print()
    
    tests = [
        ("Server Startup", test_server_startup),
        ("Generate Content", test_generate_content),
        ("Generate Image", test_generate_image), 
        ("Writers Room", test_writers_room),
        ("Writers Room Session", test_writers_room_session)
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        print(f"\n🔧 {test_name}")
        print("-" * 30)
        
        try:
            if test_func():
                passed += 1
                print(f"✅ {test_name} PASSED")
            else:
                failed += 1
                print(f"❌ {test_name} FAILED")
                
        except Exception as e:
            failed += 1
            print(f"💥 {test_name} ERROR: {e}")
    
    print(f"\n📊 Test Results")
    print("=" * 40)
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"📈 Total: {passed + failed}")
    
    if failed == 0:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n⚠️  {failed} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())