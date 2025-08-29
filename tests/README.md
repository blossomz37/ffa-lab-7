# Consolidated MCP Testing

This directory contains tests for the **consolidated MCP Writing Assistant** with 4 streamlined tools.

## Consolidation Summary

**Before**: 11 tools with significant overlap and DOCX dependencies  
**After**: 4 unified tools with simplified architecture

### Consolidated Tools (4)

1. **`generate_content`** - Unified text/image generation (replaces: generate_text, generate_from_prompt_file, process_chapter)
2. **`generate_image`** - Standalone image generation (unchanged)
3. **`writers_room`** - Unified discussions (replaces: writers_room_discussion, chat_with_writers_room)
4. **`writers_room_session`** - Session management (simplified, no DOCX)

### Removed Tools (7)

- `generate_text` → merged into `generate_content`
- `generate_from_prompt_file` → merged into `generate_content`
- `process_chapter` → merged into `generate_content`
- `chat_with_writers_room` → merged into `writers_room`
- `writers_room_discussion` → merged into `writers_room`
- `convert_to_docx` → removed (DOCX functionality eliminated)
- `convert_content_to_docx` → removed (DOCX functionality eliminated)
- `apply_editorial_changes` → removed (DOCX functionality eliminated)
- `manage_session` → merged into `writers_room_session`

## Running Tests

### Quick Verification
```bash
cd tests
python quick_mcp_test.py
```

### Full Test Suite
```bash
cd tests
python run_consolidated_tests.py
```

### Individual Testing
Test individual tools via Claude Desktop once the MCP server is running.

## Test File Architecture

### Two-File Test System

The testing system uses a **separation of concerns** pattern:

1. **`run_consolidated_tests.py`** (Test Runner/Orchestrator)
   - **Role**: Entry point and test orchestrator
   - **Purpose**: Provides clean wrapper with nice formatting
   - **What it does**:
     - Shows intro banner with list of 4 tools being tested
     - Executes `test_consolidated_mcp.py` as a subprocess
     - Reports overall pass/fail status
     - Handles interrupts gracefully

2. **`test_consolidated_mcp.py`** (Actual Test Implementation)
   - **Role**: Contains the actual test logic
   - **Purpose**: Validates each MCP tool's availability and functionality
   - **What it does**:
     - Runs handshake script to get available tools list
     - Checks MCP server startup
     - Verifies each of the 4 consolidated tools exists
     - Reports detailed test results for each tool

**Why this pattern?**
- **Separation of concerns**: Runner handles orchestration, tests handle validation
- **Better error handling**: Runner can catch test crashes cleanly
- **Improved output**: Runner provides consistent formatting regardless of test outcomes
- **Flexibility**: You can run tests directly or through the runner

### Test Structure

```
tests/
├── quick_mcp_test.py           # Quick consolidation verification
├── run_consolidated_tests.py   # Test orchestrator (wrapper)
├── test_consolidated_mcp.py    # Actual test implementation
├── test_config.py              # Shared configuration and utilities
├── tests_input/                # Test input data
│   └── test_the_little_prince_and_the_pauper.md
└── tests_output/               # Test output files (gitignored)
```

## Benefits of Consolidation

1. **Reduced Complexity**: 4 tools instead of 11
2. **No Redundancy**: Each tool has a clear, distinct purpose
3. **Simplified Dependencies**: No DOCX/Python subprocess complexity
4. **Easier Maintenance**: Fewer code paths to maintain
5. **Better User Experience**: Clearer tool purposes, less cognitive load

## Architecture Changes

- **Hybrid → Pure TypeScript**: No more Python subprocess dependencies
- **No DOCX Dependencies**: Removed all Word document processing
- **Unified Interfaces**: Similar parameters across related tools
- **Smart Auto-detection**: Tools automatically detect mode/behavior

## Testing the Consolidation

The consolidation maintains all core functionality while simplifying the interface:

- ✅ Text generation: Use `generate_content`
- ✅ Image generation: Use `generate_image` or `generate_content` with `generateImage: true`
- ✅ Writer's room discussions: Use `writers_room` (auto-detects chat vs discussion)
- ✅ Session management: Use `writers_room_session`
- ❌ DOCX processing: Removed (use external tools if needed)

## Backwards Compatibility

The new tools provide **functional compatibility** but **not interface compatibility**. Users will need to:

1. Update tool names in their workflows
2. Adjust parameters (many are now optional with smart defaults)
3. Remove DOCX-related workflows

The consolidation prioritizes **simplicity** and **maintainability** over backwards compatibility.

## Prerequisites

### Required
- Node.js 18+ for MCP server
- OpenRouter API key in `.env` file
- Internet connection for API calls

### Optional
- OpenAI API key for DALL-E fallback testing
- Persona files in `docs/writers_room_personas/`

### Environment Setup

Create `.env` file in project root:
```bash
open_router_key=your_openrouter_api_key
open_ai_key=your_openai_api_key  # Optional, for DALL-E testing
text_model_1=google/gemini-2.5-flash
text_model_2=mistralai/magistral-medium-2506
text_model_3=anthropic/claude-3.7-sonnet
text_model_4=deepseek/deepseek-chat-v3-0324
image_model_1=google/gemini-2.5-flash-image-preview
```

## Legacy Test Archive

Previous test files (for the 11-tool system) have been moved to `archived_old_tests/`:

- `test_text_generator.py` - Text generation tests
- `test_image_generator.py` - Image generation tests  
- `test_writers_room.py` - Writer's room tests
- `test_docx_editor.py` - DOCX processing tests (functionality removed)
- `test_mcp_server.py` - Integration tests (needs updating)
- `run_all_tests.py` - Old comprehensive test runner

These files are preserved for reference but are no longer compatible with the consolidated architecture.