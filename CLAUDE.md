# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **consolidated MCP (Model Context Protocol) writing assistant** that provides text generation, image creation, and multi-persona writer's room discussions through a unified TypeScript/Node.js server. The system has been streamlined from 11 tools to 4 focused tools for better maintainability and user experience.

**Key Features:**
- **Automatic attachment processing** - Drag & drop files into Claude Desktop
- **4 consolidated MCP tools** with smart parameter handling
- **4-persona writer's room** with distinct AI models per persona
- **Advanced image generation** with aspect ratio and resolution control
- **8192-token responses** for long-form content generation
- **Fallback mechanisms** for reliability and error handling

## Common Commands

### MCP Server (TypeScript/Node.js)
```bash
cd mcp-writing-assistant

# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Start the MCP server
npm run start
```

### Testing
```bash
# Quick consolidated server test
python tests/quick_mcp_test.py

# Full test suite
python tests/run_consolidated_tests.py

# Individual test
python tests/test_consolidated_mcp.py
```

## Architecture

### Consolidated MCP Server
The system uses a **pure TypeScript architecture** (Python dependencies removed):
- **Single Server**: `mcp-writing-assistant/` handles all functionality
- **4 Unified Tools**: Consolidated from original 11 tools
- **Resource Support**: Automatic attachment/file processing
- **Claude Desktop Integration**: Seamless drag & drop workflow

### MCP Tools (4 Total - Consolidated)

#### 1. `generate_content` - Unified Content Generation
**Purpose**: Text generation, image creation, and chapter analysis in one tool
**Key Parameters**:
- **Input**: `content` (direct text), `contentFile` (file path), `prompt`, `promptFile`
- **Generation**: `model`, `temperature`, `maxTokens` (default: 8192)
- **Image**: `generateImage`, `aspectRatio`, `resolution`, `styleHints`
- **Output**: `outputFile`, `imageFilename`

**Features**:
- Automatic attachment processing (drag & drop files in Claude Desktop)
- Environment variable references (e.g., `"text_prompt_1"`)
- Smart content priority: direct input > attachments > file paths
- Image generation from structured text output

#### 2. `generate_image` - Standalone Image Creation
**Purpose**: Generate images with advanced control options
**Key Parameters**:
- **Required**: `description`
- **Style**: `context`, `styleHints`
- **Format**: `aspectRatio` (16:9, 1:1, 4:3, widescreen, square, portrait)
- **Quality**: `resolution` (4K, HD, 1920x1080, high resolution)
- **Output**: `outputFilename`, `model`

**Features**:
- Multiple aspect ratio formats
- Resolution hints for better quality
- Fallback chain: primary → simplified → placeholder

#### 3. `writers_room` - Multi-Persona Discussions
**Purpose**: Interactive discussions with AI writing personas
**Key Parameters**:
- **Core**: `message` (required), `content`, `topic`
- **Mode**: `mode` (discussion/chat), `targetPersona` (Atlas, Riley, Phoenix, Sage)
- **Control**: `participants` (persona array), `rounds` (1-5)

**Two Modes**:
- **Chat Mode**: Interactive conversation with specific persona
- **Discussion Mode**: Multi-persona collaborative analysis

#### 4. `writers_room_session` - Session Management  
**Purpose**: Persistent conversation sessions
**Key Parameters**:
- **Action**: `action` (create/continue/list/read/delete)
- **Session**: `sessionId`, `topic`, `message`
- **Personas**: `participants`, `mode` (parallel/sequential)

### Writer's Room Personas (4 Total)
Each persona uses a different AI model for unique perspectives:

1. **Atlas** - Story Architect (`google/gemini-2.5-flash`)
   - Structural analysis, pacing, plot development

2. **Riley** - Reader Advocate (`mistralai/magistral-medium-2506`) 
   - Accessibility, engagement, audience perspective

3. **Phoenix** - Prose Craftsperson (`anthropic/claude-3.7-sonnet`)
   - Language, style, literary craft

4. **Sage** - Research Scholar (`deepseek/deepseek-chat-v3-0324`)
   - Accuracy, world-building, continuity

### Attachment Processing
The server automatically processes attachments from Claude Desktop:
- **Resource Handlers**: `ListResources` and `ReadResource` implemented
- **Auto-Detection**: Files dragged into Claude Desktop are automatically read
- **Content Priority**: Direct content > Attached files > File paths
- **Format Support**: Text files (.md, .txt, .json, .yaml)

## Configuration

### Environment Setup (.env)
```bash
# API Keys (Required)
open_router_key=your_openrouter_api_key_here
open_ai_key=your_openai_api_key_here  # Optional

# Model Assignments (4 personas)
text_model_1=google/gemini-2.5-flash          # Atlas
text_model_2=mistralai/magistral-medium-2506  # Riley  
text_model_3=anthropic/claude-3.7-sonnet      # Phoenix
text_model_4=deepseek/deepseek-chat-v3-0324   # Sage
text_model_5=anthropic/claude-opus-4          # Revisions

# Image Generation
image_model_1=google/gemini-2.5-flash-image-preview

# File Paths (use absolute paths)
text_prompt_1=/Users/carlo/Lab-7/docs/prompts/chapter_summ_and_promo_image_1.md
writers_room_persona_1=/Users/carlo/Lab-7/docs/writers_room_personas/persona_1.yaml
writers_room_persona_2=/Users/carlo/Lab-7/docs/writers_room_personas/persona_2.yaml
writers_room_persona_3=/Users/carlo/Lab-7/docs/writers_room_personas/persona_3.yaml
writers_room_persona_4=/Users/carlo/Lab-7/docs/writers_room_personas/persona_4.yaml
```

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

## Key Implementation Details

### Recent Improvements
- **Token Limits**: Increased from 4096/2048 to 8192 for all text generation
- **Bug Fixes**: Fixed content mix-up issue (no more wrong story analysis)
- **Resource Support**: Added automatic attachment processing
- **Image Control**: Aspect ratio and resolution parameters
- **Error Handling**: Improved file path resolution without dangerous fallbacks

### Output Structure
```
output/
├── mcp_images/       # Generated images
├── mcp_text/         # Text outputs  
└── writers_room/     # Discussion transcripts and sessions
```

### Rate Limiting
- **OpenRouter API**: 2 requests per second
- **Concurrency**: Maximum 2 concurrent tasks
- **Timeouts**: 90 seconds for API requests
- **Graceful Fallbacks**: Always provides output even on failures

## Development Workflow

### Making Changes
1. **Edit TypeScript**: `mcp-writing-assistant/src/index.ts`
2. **Build**: `npm run build`
3. **Test**: `python tests/quick_mcp_test.py`
4. **Commit**: Include updated dist files

### Testing Strategy
- **Quick Test**: Verify 4 tools are available and server starts
- **Integration Test**: Full attachment and resource processing
- **Manual Test**: Use tools in Claude Desktop with attachments

### Troubleshooting
- **Server won't start**: Check `mcp.log` for errors
- **Wrong content**: Ensure no hardcoded fallbacks in file resolution
- **Attachments not working**: Verify resources capability is enabled
- **API errors**: Check `.env` file and API keys

## Critical Files

- `mcp-writing-assistant/src/index.ts` - Main server implementation (4 tools)
- `mcp-writing-assistant/dist/index.js` - Compiled server (commit this!)
- `docs/writers_room_personas/persona_[1-4].yaml` - Writer personas
- `tests/test_consolidated_mcp.py` - Consolidated test suite
- `.env.example` - Template configuration (no secrets)
- `memory/memory.json` - Session memory for error tracking

## Consolidation Benefits

**Before**: 11 overlapping tools with DOCX dependencies  
**After**: 4 focused tools with clean architecture

- **Reduced Complexity**: 4 tools vs 11
- **No Redundancy**: Each tool has distinct purpose  
- **Better UX**: Automatic attachment processing
- **Maintainable**: Pure TypeScript, no Python subprocesses
- **Reliable**: Fixed content mix-up bugs and fallback issues