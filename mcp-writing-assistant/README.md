# MCP Writing Assistant

A comprehensive Model Context Protocol (MCP) server that provides AI-powered writing tools including text generation, image creation, and multi-persona writer's room discussions.

## Features

### 🎯 Core Tools

1. **generate_text** - Generate structured text using AI models
   - Customizable prompts and context
   - System message support
   - Temperature and token control
   - File output option

2. **generate_image** - Create images from text descriptions
  - Context-aware generation
  - Style hints support
  - Primary OpenRouter model + simplified retry
  - Deterministic placeholder image if all attempts fail (no external secondary provider currently)
  - PNG output format

3. **generate_from_prompt_file** - Use prompt files for generation
   - Load prompts from markdown files
   - Optional content file support
   - Combined text + image generation

4. **writers_room_discussion** - Multi-persona discussions
   - Up to 6 different personas
   - Each persona uses a different AI model
   - Multi-round discussions
   - Structured output (JSON + Markdown)

5. **process_chapter** - Chapter analysis and visualization
   - Structured content analysis
   - Automatic image generation
   - Custom prompt support

## Installation

```bash
cd mcp-writing-assistant
npm install
npm run build
```

## Configuration

### Environment Variables (.env)
```bash
# API Configuration
open_router_key=your_openrouter_api_key
# (Removed) open_ai_key used previously for DALL-E fallback; no longer needed

# Model Configuration
text_model_1=google/gemini-2.5-flash
image_model_1=google/gemini-2.5-flash-image-preview

# Additional models for personas
text_model_2=anthropic/claude-sonnet-4
text_model_3=mistralai/magistral-medium-2506
text_model_4=google/gemini-2.5-pro
text_model_5=anthropic/claude-3.7-sonnet
text_model_6=deepseek/deepseek-chat-v3-0324

# Persona files
writers_room_persona_1=docs/writers_room_personas/persona_1.yaml
writers_room_persona_2=docs/writers_room_personas/persona_2.yaml
# ... etc

# Timeouts and limits
# Per-request timeout for LLM calls (ms)
REQUEST_TIMEOUT_MS=60000
# Max total duration for writers_room discussion before returning partial results (ms)
WRITERS_ROOM_MAX_DURATION_MS=110000
```

## Environment

- .env Example: See project root `.env.example` for a complete, documented template of required and optional variables.
- Required:
  - `open_router_key`: OpenRouter API key used for all LLM requests.
- Optional:
  - (Deprecated) `open_ai_key`: DALL·E fallback removed; ignore.
  - `VIRTUAL_ENV` or `PYTHON_PATH`: Picks the Python interpreter for DOCX tools; if neither is set, system Python is used. The server logs a note when no venv is active.
  - `MAX_CONCURRENT_TASKS`: Caps concurrent LLM/Python tasks (default 2).
  - `OPENROUTER_RPS`: Requests per second to OpenRouter (default 2).
  - `MCP_DEBUG`: Set to `true` for verbose debug logs.
  - `ALLOW_GIT_COMMIT`: If `true`, enables auto-commits in certain Python utilities; defaults to `false` for safety.


### Claude Desktop Integration

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "writing-assistant": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-writing-assistant/dist/index.js"]
    }
  }
}
```

## Usage Examples

### Generate Text
```
Use generate_text with prompt="Write a cyberpunk story opening" and temperature=0.8
```

### Generate Image
```
Use generate_image with description="A cyberpunk detective in neon-lit Tokyo" and styleHints="noir, cinematic"
```

### Process Chapter with Custom Prompt
```
Use process_chapter with chapterPath="/path/to/chapter.md" and promptPath="/path/to/prompt.md"
```

### Writer's Room Discussion
```
Use writers_room_discussion with topic="How to improve the opening scene?" and content="[paste chapter content]" and personas=["persona_1", "persona_2", "persona_3"]
```

### Generate from Prompt File
```
Use generate_from_prompt_file with promptPath="/path/to/prompt.md" and generateImage=true
```

## Output Structure

```
output/
├── mcp_images/        # Generated images
├── mcp_text/          # Generated text files
└── writers_room/      # Discussion transcripts (JSON + Markdown)
```

## Persona System

The Writer's Room feature supports up to 6 personas, each with:
- Unique personality and expertise
- Assigned AI model
- Specialized feedback style

Example personas:
- **Director** - Story vision and pacing
- **Developmental Editor** - Structure and character arcs
- **Genre Fan** - Reader expectations
- **Poet** - Language and imagery
- **Screenwriter** - Dialogue and scenes
- **Marketer** - Commercial appeal

## Models

All features currently rely solely on OpenRouter-hosted models.

Text models: Gemini, Claude, Mistral, DeepSeek (configurable per persona).
Image model: Default `google/gemini-2.5-flash-image-preview` (configurable).

Fallback strategy: Primary attempt, then simplified retry, then placeholder image (base64 1x1 PNG) to keep workflows deterministic. External secondary providers can be added later via a pluggable adapter.

## Error Handling

- Simplified two-pass attempt for image generation (full + simplified)
- Placeholder image on persistent failure
- Comprehensive error messages
- Rate limiting + concurrency guards

## Development

```bash
# Development mode
npm run dev

# Build TypeScript
npm run build

# Start server
npm run start
```

## License

MIT
