# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive AI-powered writing assistance toolkit that combines TypeScript/Node.js MCP (Model Context Protocol) servers with Python backend tools. The system provides text generation, image creation, multi-persona writer's room discussions, document processing (DOCX with track changes), and HTML comparison generation for editorial workflows.

**Key Capabilities:**
- AI text generation with multiple model support via OpenRouter API
- Image generation with intelligent fallback mechanisms
- Four-persona writer's room for collaborative story analysis
- DOCX conversion with Microsoft Word track changes support
- Persistent session management for iterative editing
- Dynamic persona selection based on role (e.g., Director facilitates discussions)

## Common Commands

### Python Environment Setup
```bash
# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

### MCP Server (TypeScript/Node.js)
```bash
cd mcp-writing-assistant

# Install Node dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Start the MCP server
npm run start

# Development mode (runs TypeScript directly)
npm run dev

# Smoke test (verify handshake)
npm run smoke
```

### Testing
```bash
# Run all tests with output files
./test.sh all

# Run specific test suites
./test.sh text       # Text generation
./test.sh image      # Image generation
./test.sh writers    # Writer's room
./test.sh mcp        # MCP server integration

# View recent test results
./test.sh recent

# Clean old test files
./test.sh cleanup

# Run Python tests
python tests/run_all_tests.py
```

### Monitoring and Status
```bash
# Check MCP server status
./mcp-status.sh

# Monitor MCP server logs (real-time)
./monitor-mcp.sh
```

## Architecture

### Hybrid TypeScript/Python Architecture
The system uses a unique hybrid architecture:
- **Frontend Layer**: TypeScript MCP server (`mcp-writing-assistant/`) handles Claude Desktop integration
- **Backend Layer**: Python scripts (`tools/`) perform AI processing and document manipulation
- **Communication**: MCP server spawns Python subprocesses via `execSync()`
- **Virtual Environment Aware**: Automatically detects and uses Python from activated venv

### MCP Tools Available (4 total - Consolidated)

1. **`generate_content`** - Unified content generation tool
   - **Purpose**: Combines text generation, image generation, and chapter analysis
   - **Parameters**: 
     - Text input: `prompt`, `promptFile` (supports .env references), `content`, `contentFile`
     - Options: `context`, `systemMessage`, `model`, `temperature`, `maxTokens`, `outputFile`
     - Image generation: `generateImage`, `imageDescription`, `styleHints`, `imageFilename`
   - **Features**: 
     - File/content flexibility: Direct text or file paths
     - Auto-extracts image descriptions from structured output (JSON)
     - Supports .env references (e.g., "text_prompt_1")
     - Smart fallback: Primary attempt → Placeholder on failure
   - **Saves to**: `output/mcp_text/` and `output/mcp_images/`

2. **`generate_image`** - Standalone image generation
   - **Parameters**: description (required), context, styleHints, outputFilename, model
   - **Fallback chain**: Primary attempt → Simplified prompt → Placeholder image
   - **Saves to**: `output/mcp_images/`

3. **`writers_room`** - Unified writer's room discussions
   - **Purpose**: Combines multi-persona discussions and interactive chat
   - **Parameters**:
     - Mode control: `mode` ("discussion" or "chat" - auto-detects if not specified)
     - Core: `message` (required), `content`, `topic`
     - Targeting: `targetPersona` (Atlas, Riley, Phoenix, Sage), `personas` (array)
     - Options: `rounds` (1-5, discussion mode only)
   - **Two modes**:
     - **Discussion mode**: All personas analyze content in parallel/sequential rounds
     - **Chat mode**: Interactive conversation with specific persona or auto-selected director
   - **Saves to**: `output/writers_room/` (JSON + Markdown)

4. **`writers_room_session`** - Persistent session management
   - **Purpose**: Create and manage long-term editorial sessions
   - **Parameters**: 
     - `action` (required): create, continue, list, read, delete
     - `sessionId`, `message`, `content`, `filePath`
     - `personas`, `mode` (parallel/sequential)
   - **Features**:
     - Persistent conversation history
     - CRUD operations for session management
     - No DOCX dependencies (removed for simplicity)
   - **Saves to**: `output/writers_room/` (session JSON files)

### Writer's Room Persona System
Four distinct personas, each mapped to different AI models:
- **Atlas** (Story Director & Structure Analyst) - google/gemini-2.5-flash
- **Riley** (Reader Advocate) - mistralai/magistral-medium-2506
- **Phoenix** (Prose Craftsperson) - anthropic/claude-3.7-sonnet
- **Sage** (Research Scholar) - deepseek/deepseek-chat-v3-0324

Persona configurations are in `docs/writers_room_personas/persona_[1-4].yaml`

### Content Generation Pipeline
1. **Unified Generation**: Single tool handles text, images, and chapter analysis
2. **Smart File Resolution**: Supports .env references and relative paths
3. **Image Integration**: Auto-extracts descriptions from structured text output
4. **Fallback Mechanisms**: Graceful degradation with placeholder generation

### Output Directory Structure
```
output/
├── mcp_images/        # Images from MCP tools
├── mcp_text/          # Text outputs from MCP
└── writers_room/      # Discussion transcripts and sessions (JSON + Markdown)
```

**Note**: DOCX tools and related directories have been removed for simplified architecture.

## Key Implementation Details

### Rate Limiting and Concurrency
- OpenRouter API: 2 requests per second limit
- Built-in delays between API calls (2 seconds)
- Semaphore-based concurrency control for parallel operations
- 90-second timeout for all API requests

### Error Handling Patterns
- **Two-Step Fallback**: Primary attempt → Simplified retry for images
- **Placeholder Generation**: Always provides output, even on complete failure
- **Graceful Degradation**: Continue with partial results on failures
- **Validation**: Zod schema validation for all MCP tool inputs

### Environment Configuration (.env)
Required environment variables:
```bash
# API Keys
open_router_key=sk-or-v1-...
open_ai_key=sk-proj-...  # For DALL-E fallback

# Model Assignments (4 models for 4 personas)
text_model_1=google/gemini-2.5-flash          # Atlas (Story Architect)
text_model_2=mistralai/magistral-medium-2506  # Riley (Reader Advocate)
text_model_3=anthropic/claude-3.7-sonnet      # Phoenix (Prose Craftsperson)
text_model_4=deepseek/deepseek-chat-v3-0324   # Sage (Research Scholar)
text_model_5=anthropic/claude-opus-4          # For revisions

# Image Model
image_model_1=google/gemini-2.5-flash-image-preview

# Persona Definitions (use absolute paths)
writers_room_persona_1=/Users/carlo/Lab-7/docs/writers_room_personas/persona_1.yaml
writers_room_persona_2=/Users/carlo/Lab-7/docs/writers_room_personas/persona_2.yaml
writers_room_persona_3=/Users/carlo/Lab-7/docs/writers_room_personas/persona_3.yaml
writers_room_persona_4=/Users/carlo/Lab-7/docs/writers_room_personas/persona_4.yaml

# Prompt Files
text_prompt_1=/Users/carlo/Lab-7/docs/prompts/chapter_summ_and_promo_image_1.md
image_prompt_1=/Users/carlo/Lab-7/docs/prompts/image_prompt_1.md
```

### Testing Infrastructure
- **UUID-based Test Tracking**: Each test run gets unique identifier
- **Structured Output**: JSON reports + human-readable logs
- **Component Tests**: Individual tests for each Python module
- **Integration Tests**: Full MCP server handshake and tool testing
- Test outputs in `tests/tests_output/` with `.log`, `.json`, and `_summary.txt` files

### Claude Desktop Integration
Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "writing-assistant": {
      "command": "node",
      "args": ["/Users/carlo/Lab-7/mcp-writing-assistant/dist/index.js"],
      "cwd": "/Users/carlo/Lab-7"
    }
  }
}
```

## Development Workflow

1. **Making Python Changes**: Edit files in `tools/`, test with `./test.sh`
2. **Making MCP Changes**: Edit TypeScript in `mcp-writing-assistant/src/`, run `npm run build`
3. **Modifying Personas**: Edit existing YAML files in `docs/writers_room_personas/persona_[1-4].yaml`
4. **Testing Changes**: Use component tests first, then integration tests
5. **Monitoring**: Use `./mcp-status.sh` for status, `./monitor-mcp.sh` for logs

## Critical Files and Their Purposes

- `mcp-writing-assistant/src/index.ts`: Consolidated MCP server implementation (4 tools)
- `mcp-writing-assistant/src/index.ts.backup`: Pre-consolidation backup (11 tools)
- `mcp-writing-assistant/src/handshake.ts`: MCP protocol testing
- `docs/writers_room_personas/persona_[1-4].yaml`: Writer's room persona definitions
- `tests/test_mcp_server.py`: Integration testing (needs updating for new tools)