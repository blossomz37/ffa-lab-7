# MCP Writing Assistant - Class Project

A consolidated AI-powered writing assistant implemented as an MCP (Model Context Protocol) server with 4 streamlined tools.

## 🎯 Project Overview

This project demonstrates:
- **MCP Server Development** using TypeScript and Node.js
- **AI API Integration** via OpenRouter with multiple models
- **Multi-persona AI Systems** for creative writing assistance

## 🛠️ Consolidated Architecture 

**4 MCP Tools:**

1. **`generate_content`** - Unified text/image generation
2. **`generate_image`** - Standalone image creation  
3. **`writers_room`** - Multi-persona discussions and chat
4. **`writers_room_session`** - Persistent session management

## 🏗️ Project Structure

```
Lab-7/
├── CLAUDE.md                    # Development documentation
├── mcp-writing-assistant/       # Main MCP server
│   ├── src/index.ts            # Server implementation
│   ├── package.json            # Dependencies
│   └── dist/                   # Compiled JavaScript
├── docs/                       # Configuration files
│   ├── prompts/               # AI prompts
│   └── writers_room_personas/ # 4 AI personas (YAML)
├── tests/                      # Testing suite
│   ├── quick_mcp_test.py      # Verification script
│   └── test_config.py         # Configuration tests
├── output/                     # Generated content
└── .env.example               # Environment template
```

## 🚀 Quick Start

### 1. Environment Setup
```bash
# Copy and edit environment file
cp .env.example .env
# Add your OpenRouter API key to .env
```

### 2. Install Dependencies
```bash
cd mcp-writing-assistant
npm install
```

### 3. Build Server
```bash
npm run build
```

### 4. Test Installation
```bash
cd ../tests
python quick_mcp_test.py
```

## 🤖 Writer's Room Personas

The system includes 4 AI personas, each using different models:

1. **Atlas** (Story Director) - Gemini 2.5 Flash
2. **Riley** (Reader Advocate) - Mistral Medium  
3. **Phoenix** (Prose Craftsperson) - Claude 3.7 Sonnet
4. **Sage** (Research Scholar) - DeepSeek Chat

## 💻 Technical Highlights

- **Pure TypeScript MCP Server** - No Python subprocess dependencies
- **Rate Limiting & Concurrency** - Professional API handling
- **Smart Fallback Mechanisms** - Graceful degradation on failures
- **Dynamic Mode Detection** - Automatic chat vs discussion modes
- **File Reference Resolution** - Environment variable mapping

## 🎓 Learning Objectives

This project demonstrates:
- MCP protocol implementation
- API integration patterns
- Multi-model AI orchestration
- TypeScript/Node.js development
- Error handling and resilience

## 📚 Key Files to Study

- `mcp-writing-assistant/src/index.ts` - Main server implementation
- `docs/writers_room_personas/` - AI persona configurations
- `CLAUDE.md` - Complete architecture documentation
- `.env.example` - Configuration template

## 🧪 Testing

Run the verification script to ensure everything works:
```bash
cd tests
python quick_mcp_test.py
```

## 📖 Documentation

See `CLAUDE.md` for complete technical documentation including:
- Detailed tool specifications
- Development workflow
- Architecture decisions
- Configuration options

## 🎯 Assignment Ideas

- Extend with new MCP tools
- Add persona customization
- Implement conversation memory
- Add new AI model integrations
- Create web interface
- Build conversation analytics

---

**Note:** Development artifacts, old tests, and experimental code have been moved to `.archive/` to keep the project clean for educational use.