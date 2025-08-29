#!/usr/bin/env python3
"""
Consolidated Test Runner
Runs tests for the 4 consolidated MCP tools
"""

import subprocess
import sys
import os
from pathlib import Path

def main():
    """Run consolidated test suite"""
    project_root = Path(__file__).parent.parent
    test_file = Path(__file__).parent / "test_consolidated_mcp.py"
    
    print("🚀 Running Consolidated MCP Server Tests")
    print("=" * 50)
    print("Testing 4 consolidated tools:")
    print("  1. generate_content")
    print("  2. generate_image") 
    print("  3. writers_room")
    print("  4. writers_room_session")
    print("=" * 50)
    
    try:
        # Run the test file
        result = subprocess.run([
            sys.executable, str(test_file)
        ], cwd=project_root)
        
        if result.returncode == 0:
            print("\n✅ All consolidated tests passed!")
        else:
            print("\n❌ Some tests failed")
        
        return result.returncode
        
    except KeyboardInterrupt:
        print("\n🛑 Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Test runner error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())