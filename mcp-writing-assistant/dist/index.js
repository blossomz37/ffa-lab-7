#!/usr/bin/env node
/**
 * MCP Writing Assistant Server - Consolidated Version
 * Provides text generation, image creation, and writer's room discussion tools
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import * as yaml from 'js-yaml';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });
// Debug logging
const DEBUG = process.env.MCP_DEBUG === 'true';
function debugLog(...args) {
    if (DEBUG) {
        console.error(`[MCP-DEBUG ${new Date().toISOString()}]`, ...args);
    }
}
// Configuration from environment
const OPENROUTER_API_KEY = process.env.open_router_key || '';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Model configurations
const TEXT_MODEL = process.env.text_model_1 || 'google/gemini-2.5-flash';
const IMAGE_MODEL = process.env.image_model_1 || 'google/gemini-2.5-flash-image-preview';
// Prompt and content file paths from environment
const PROMPT_PATHS = {
    'text_prompt_1': process.env.text_prompt_1 || '',
    'image_prompt_1': process.env.image_prompt_1 || '',
    'chapter_1': process.env.chapter_1 || '',
    'story_dossier': process.env.story_dossier || '',
    // Add any other configured paths from .env
    'chapter_descript_1': process.env.text_prompt_1 || '', // Alias for backward compatibility
    'Story_Dossier': process.env.story_dossier || '', // Case variant
    'Chapter_1': process.env.chapter_1 || '' // Case variant
};
// Output directories
const OUTPUT_DIR = path.join(__dirname, '../../output');
const OUTPUT_IMAGES = path.join(OUTPUT_DIR, 'mcp_images');
const OUTPUT_TEXT = path.join(OUTPUT_DIR, 'mcp_text');
const OUTPUT_WRITERS_ROOM = path.join(OUTPUT_DIR, 'writers_room');
// Ensure output directories exist
[OUTPUT_IMAGES, OUTPUT_TEXT, OUTPUT_WRITERS_ROOM].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});
// Note: Python dependencies removed in consolidation
// Concurrency and rate limiting
const MAX_CONCURRENT_TASKS = parseInt(process.env.MAX_CONCURRENT_TASKS || '2', 10);
const OPENROUTER_RPS = parseInt(process.env.OPENROUTER_RPS || '2', 10);
class Semaphore {
    max;
    count = 0;
    queue = [];
    constructor(max) { this.max = Math.max(1, max); }
    async acquire() {
        if (this.count < this.max) {
            this.count++;
            return;
        }
        await new Promise(resolve => this.queue.push(resolve));
        this.count++;
    }
    release() {
        if (this.count > 0)
            this.count--;
        const next = this.queue.shift();
        if (next)
            next();
    }
}
class RateLimiter {
    capacity;
    tokens;
    queue = [];
    interval;
    constructor(rps) {
        this.capacity = Math.max(1, rps);
        this.tokens = this.capacity;
        this.interval = setInterval(() => {
            this.tokens = this.capacity;
            this.drain();
        }, 1000);
        this.interval.unref?.();
    }
    drain() {
        while (this.tokens > 0 && this.queue.length > 0) {
            this.tokens--;
            const next = this.queue.shift();
            if (next)
                next();
        }
    }
    async take() {
        if (this.tokens > 0) {
            this.tokens--;
            return;
        }
        await new Promise(resolve => this.queue.push(resolve));
    }
}
const concurrency = new Semaphore(MAX_CONCURRENT_TASKS);
const openrouterLimiter = new RateLimiter(OPENROUTER_RPS);
// Helper functions
async function makeOpenRouterRequest(messages, model, temperature = 0.7, maxTokens = 8192, retries = 2) {
    await openrouterLimiter.take();
    await concurrency.acquire();
    try {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await fetch(OPENROUTER_BASE_URL, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'http://localhost',
                        'X-Title': 'MCP Writing Assistant'
                    },
                    body: JSON.stringify({
                        model,
                        messages,
                        temperature,
                        max_tokens: maxTokens,
                        top_p: 1,
                        frequency_penalty: 0,
                        presence_penalty: 0
                    })
                });
                if (!response.ok) {
                    let error = await response.text();
                    if (error && error.length > 512)
                        error = error.slice(0, 512) + '...';
                    throw new Error(`API Error: ${response.status} - ${error}`);
                }
                const result = await response.json();
                if (!result.choices?.[0]?.message?.content) {
                    throw new Error(`Empty response from model ${model}. Response: ${JSON.stringify(result)}`);
                }
                const content = result.choices[0].message.content.trim();
                if (content.length < 10) {
                    throw new Error(`Model ${model} returned insufficient content: "${content}"`);
                }
                return result;
            }
            catch (err) {
                debugLog(`Attempt ${attempt + 1} failed for model ${model}:`, err);
                if (attempt === retries)
                    throw err;
                await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
            }
        }
        throw new Error('Unhandled retry loop termination');
    }
    finally {
        concurrency.release();
    }
}
function extractImageFromResponse(response) {
    try {
        if (response.choices && response.choices.length > 0) {
            const message = response.choices[0].message;
            if (message.images && Array.isArray(message.images)) {
                for (const img of message.images) {
                    if (img.type === 'image_url' && img.image_url?.url?.startsWith('data:image')) {
                        return img.image_url.url;
                    }
                }
            }
            const content = message.content || '';
            if (typeof content === 'string' && content.includes('data:image')) {
                const start = content.indexOf('data:image');
                const end = content.indexOf('"', start);
                if (start !== -1 && end !== -1) {
                    return content.substring(start, end);
                }
            }
        }
    }
    catch (error) {
        console.error('Error extracting image:', error);
    }
    return null;
}
function saveImage(base64Data, filename) {
    if (base64Data.includes(',')) {
        base64Data = base64Data.split(',')[1];
    }
    const imageData = Buffer.from(base64Data, 'base64');
    const filepath = path.join(OUTPUT_IMAGES, filename.endsWith('.png') ? filename : `${filename}.png`);
    fs.writeFileSync(filepath, imageData);
    return filepath;
}
// Placeholder 1x1 PNG (transparent) used when all generation attempts fail
const PLACEHOLDER_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PqTUMwAAAABJRU5ErkJggg==';
function loadPersonas() {
    const personas = new Map();
    const personaModels = {
        'persona_1': process.env.text_model_1 || 'google/gemini-2.5-flash',
        'persona_2': process.env.text_model_2 || 'mistralai/magistral-medium-2506',
        'persona_3': process.env.text_model_3 || 'anthropic/claude-3.7-sonnet',
        'persona_4': process.env.text_model_4 || 'deepseek/deepseek-chat-v3-0324'
    };
    for (const [key, model] of Object.entries(personaModels)) {
        const envPath = process.env[`writers_room_${key}`];
        const defaultPath = path.join(__dirname, `../../docs/writers_room_personas/${key}.yaml`);
        // Resolve relative paths from the project root
        let personaPath = envPath || defaultPath;
        if (envPath && !path.isAbsolute(envPath)) {
            personaPath = path.join(__dirname, '../..', envPath);
        }
        if (fs.existsSync(personaPath)) {
            try {
                const fileContent = fs.readFileSync(personaPath, 'utf-8');
                let personaData;
                if (personaPath.endsWith('.yaml') || personaPath.endsWith('.yml')) {
                    personaData = yaml.load(fileContent);
                }
                else {
                    // Fallback for .md files
                    personaData = {
                        name: fileContent.match(/name:\s*(.+)/)?.[1] || key,
                        role: fileContent.match(/role:\s*(.+)/)?.[1] || 'Writer',
                        content: fileContent
                    };
                }
                // Ensure we have the required fields
                const personaObj = {
                    model,
                    name: personaData.name || key,
                    role: personaData.role || 'Writer',
                    title: personaData.title || personaData.name || key,
                    specialties: personaData.specialties || [],
                    manner_of_speaking: personaData.manner_of_speaking || [],
                    strengths: personaData.strengths || [],
                    weaknesses: personaData.weaknesses || [],
                    deliverables: personaData.deliverables || [],
                    constraint: personaData.constraint || '',
                    content: fileContent // Keep raw content for system message
                };
                personas.set(key, personaObj);
            }
            catch (error) {
                console.error(`Error loading persona ${key} from ${personaPath}:`, error);
            }
        }
    }
    return personas;
}
// Create server instance
const server = new Server({
    name: 'mcp-writing-assistant',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
// MCP server status
console.error('[MCP] Starting consolidated writing assistant server...');
// Define consolidated tools (4 total)
const TOOLS = [
    {
        name: 'generate_content',
        description: 'Unified content generation - text, images, and chapter analysis with flexible input options',
        inputSchema: {
            type: 'object',
            properties: {
                // Text generation options
                prompt: { type: 'string', description: 'Direct prompt for text generation' },
                promptFile: { type: 'string', description: 'Path to prompt file (supports .env references like "text_prompt_1")' },
                content: { type: 'string', description: 'Direct content to analyze or process' },
                contentFile: { type: 'string', description: 'Path to content file to analyze' },
                context: { type: 'string', description: 'Additional context for generation' },
                systemMessage: { type: 'string', description: 'System instruction for the AI' },
                // Generation options
                generateImage: { type: 'boolean', description: 'Also generate image from text output' },
                model: { type: 'string', description: 'Override default text model' },
                temperature: { type: 'number', minimum: 0, maximum: 1, description: 'Response creativity (0-1)' },
                maxTokens: { type: 'number', description: 'Maximum response length' },
                outputFile: { type: 'string', description: 'Save text output to file' },
                // Image options (when generateImage=true)
                imageDescription: { type: 'string', description: 'Override image description (extracted from text if not provided)' },
                styleHints: { type: 'string', description: 'Image style instructions' },
                imageFilename: { type: 'string', description: 'Custom image filename' }
            }
        }
    },
    {
        name: 'generate_image',
        description: 'Generate images from descriptions with fallback mechanisms',
        inputSchema: {
            type: 'object',
            properties: {
                description: { type: 'string', description: 'Image description/prompt' },
                context: { type: 'string', description: 'Additional context for the image' },
                styleHints: { type: 'string', description: 'Style instructions (e.g., "cyberpunk, noir")' },
                aspectRatio: {
                    type: 'string',
                    description: 'Aspect ratio (e.g., "16:9", "1:1", "4:3", "9:16", "widescreen", "square", "portrait")'
                },
                resolution: {
                    type: 'string',
                    description: 'Resolution hint (e.g., "4K", "HD", "1920x1080", "high resolution")'
                },
                outputFilename: { type: 'string', description: 'Filename for saved image' },
                model: { type: 'string', description: 'Override the default image model' }
            },
            required: ['description']
        }
    },
    {
        name: 'writers_room',
        description: 'Unified writer\'s room discussions - supports both multi-persona discussions and interactive chat',
        inputSchema: {
            type: 'object',
            properties: {
                mode: {
                    type: 'string',
                    enum: ['discussion', 'chat'],
                    description: 'Mode: "discussion" for multi-persona analysis, "chat" for interactive conversation'
                },
                message: { type: 'string', description: 'Your message/question for the writers room' },
                topic: { type: 'string', description: 'Discussion topic (for discussion mode)' },
                content: { type: 'string', description: 'Story/chapter content to discuss or analyze' },
                targetPersona: {
                    type: 'string',
                    description: 'Specific persona to chat with (Atlas, Riley, Phoenix, Sage) - for chat mode'
                },
                personas: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Specific personas to include in discussion (default: all 4)'
                },
                rounds: {
                    type: 'number',
                    minimum: 1,
                    maximum: 5,
                    description: 'Number of discussion rounds (discussion mode only)'
                }
            },
            required: ['message']
        }
    },
    {
        name: 'writers_room_session',
        description: 'Create and manage persistent writer\'s room sessions for iterative editing',
        inputSchema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['create', 'continue', 'list', 'read', 'delete'],
                    description: 'Session action to perform'
                },
                sessionId: { type: 'string', description: 'Session ID (generated for create, required for others)' },
                message: { type: 'string', description: 'Your message or question for the session' },
                content: { type: 'string', description: 'Content to analyze or discuss in the session' },
                filePath: { type: 'string', description: 'Path to file to include in session' },
                personas: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Specific personas to include (default: all)'
                },
                mode: {
                    type: 'string',
                    enum: ['parallel', 'sequential'],
                    description: 'Processing mode - parallel (all at once) or sequential (conversation)'
                }
            },
            required: ['action']
        }
    }
];
// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS
}));
// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    debugLog(`Tool called: ${name}`, args);
    try {
        switch (name) {
            case 'generate_content': {
                const params = args;
                // Build prompt from various sources
                let finalPrompt = params.prompt || '';
                let finalContent = params.content || '';
                // Handle prompt file
                if (params.promptFile) {
                    let actualPromptPath = params.promptFile;
                    // Check if it's a reference to an env variable
                    if (!params.promptFile.includes('/') && !params.promptFile.includes('\\')) {
                        const promptKey = params.promptFile.replace(/\.md$/, '');
                        if (PROMPT_PATHS[promptKey]) {
                            actualPromptPath = PROMPT_PATHS[promptKey];
                        }
                        else if (PROMPT_PATHS[params.promptFile]) {
                            actualPromptPath = PROMPT_PATHS[params.promptFile];
                        }
                    }
                    // Try relative path in docs/prompts
                    if (!fs.existsSync(actualPromptPath) && !actualPromptPath.startsWith('/')) {
                        const tryPath = path.join(__dirname, '../../docs/prompts', params.promptFile);
                        if (fs.existsSync(tryPath)) {
                            actualPromptPath = tryPath;
                        }
                    }
                    if (!fs.existsSync(actualPromptPath)) {
                        throw new Error(`Prompt file not found: ${params.promptFile}. Tried: ${actualPromptPath}`);
                    }
                    finalPrompt = fs.readFileSync(actualPromptPath, 'utf-8');
                }
                // Handle content file
                if (params.contentFile) {
                    let actualContentPath = params.contentFile;
                    // Check if it's a reference to an env variable
                    if (!params.contentFile.includes('/') && !params.contentFile.includes('\\')) {
                        const contentKey = params.contentFile.replace(/\.md$/, '');
                        if (PROMPT_PATHS[contentKey]) {
                            actualContentPath = PROMPT_PATHS[contentKey];
                        }
                        else if (PROMPT_PATHS[params.contentFile]) {
                            actualContentPath = PROMPT_PATHS[params.contentFile];
                        }
                    }
                    if (!fs.existsSync(actualContentPath) && !actualContentPath.startsWith('/')) {
                        const tryPath = path.join(__dirname, '../../docs/story', params.contentFile);
                        if (fs.existsSync(tryPath)) {
                            actualContentPath = tryPath;
                        }
                    }
                    if (!fs.existsSync(actualContentPath)) {
                        throw new Error(`Content file not found: ${params.contentFile}. Tried: ${actualContentPath}`);
                    }
                    finalContent = fs.readFileSync(actualContentPath, 'utf-8');
                }
                // Build messages
                const messages = [];
                if (params.systemMessage) {
                    messages.push({ role: 'system', content: params.systemMessage });
                }
                let userContent = finalPrompt;
                if (finalContent) {
                    userContent = finalContent + '\n\n' + finalPrompt;
                }
                if (params.context) {
                    userContent = params.context + '\n\n' + userContent;
                }
                messages.push({ role: 'user', content: userContent });
                // Generate text
                const response = await makeOpenRouterRequest(messages, params.model || TEXT_MODEL, params.temperature || 0.7, params.maxTokens || 8192);
                const textContent = response.choices[0].message.content;
                let result = textContent;
                // Save text output if requested
                if (params.outputFile) {
                    const filepath = path.join(OUTPUT_TEXT, params.outputFile);
                    fs.writeFileSync(filepath, textContent, 'utf-8');
                    result = `Text saved to: ${filepath}\n\n---\n\n${textContent}`;
                }
                // Generate image if requested
                if (params.generateImage) {
                    let imageDesc = params.imageDescription || textContent;
                    // Try to extract image description from structured output
                    if (!params.imageDescription) {
                        try {
                            const parsed = JSON.parse(textContent);
                            imageDesc = parsed.promotional_image?.image_description ||
                                parsed.image_description ||
                                textContent.substring(0, 500);
                        }
                        catch {
                            const match = textContent.match(/image[_ ]description[:\s]+([^\n]+)/i);
                            if (match)
                                imageDesc = match[1];
                        }
                    }
                    const imageMessages = [
                        { role: 'user', content: `Generate an image: ${imageDesc}` }
                    ];
                    if (params.styleHints) {
                        imageMessages[0].content += `. Style: ${params.styleHints}`;
                    }
                    const imageResponse = await makeOpenRouterRequest(imageMessages, IMAGE_MODEL, 0.9, 512);
                    const imageData = extractImageFromResponse(imageResponse);
                    if (imageData) {
                        const filename = params.imageFilename || `generated_${Date.now()}`;
                        const filepath = saveImage(imageData, filename);
                        result += `\n\nImage generated: ${filepath}`;
                    }
                    else {
                        // Fallback to placeholder
                        const filename = params.imageFilename || `placeholder_${Date.now()}`;
                        const filepath = saveImage(PLACEHOLDER_IMAGE, filename);
                        result += `\n\nImage generation failed; placeholder created: ${filepath}`;
                    }
                }
                return {
                    content: [
                        {
                            type: 'text',
                            text: result
                        }
                    ]
                };
            }
            case 'generate_image': {
                const params = args;
                let systemPrompt = 'You are an AI that generates detailed, high-quality images based on descriptions.';
                if (params.styleHints) {
                    systemPrompt += ` Apply these style elements: ${params.styleHints}`;
                }
                let userPrompt = `Generate an image: ${params.description}`;
                // Add aspect ratio to the prompt
                if (params.aspectRatio) {
                    userPrompt += ` | Aspect ratio: ${params.aspectRatio}`;
                }
                // Add resolution to the prompt
                if (params.resolution) {
                    userPrompt += ` | Resolution: ${params.resolution}`;
                }
                if (params.context) {
                    userPrompt = `Context: ${params.context}\n\n${userPrompt}`;
                }
                const messages = [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ];
                const response = await makeOpenRouterRequest(messages, params.model || IMAGE_MODEL, 0.9, 512);
                const imageData = extractImageFromResponse(response);
                if (imageData) {
                    const filename = params.outputFilename || `image_${Date.now()}`;
                    const filepath = saveImage(imageData, filename);
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Image generated successfully!\n\nSaved to: ${filepath}\n\nDescription: ${params.description}`
                            }
                        ]
                    };
                }
                else {
                    // Try simplified fallback
                    const fallbackResponse = await makeOpenRouterRequest([{ role: 'user', content: `Please generate this image: ${params.description}` }], params.model || IMAGE_MODEL, 0.9, 512);
                    const fallbackImage = extractImageFromResponse(fallbackResponse);
                    if (fallbackImage) {
                        const filename = params.outputFilename || `image_${Date.now()}`;
                        const filepath = saveImage(fallbackImage, filename);
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: `Image generated (fallback)!\n\nSaved to: ${filepath}`
                                }
                            ]
                        };
                    }
                    // Final fallback to placeholder
                    const filename = params.outputFilename || `placeholder_${Date.now()}`;
                    const filepath = saveImage(PLACEHOLDER_IMAGE, filename);
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Image generation failed; placeholder created at: ${filepath}`
                            }
                        ]
                    };
                }
            }
            case 'writers_room': {
                const params = args;
                const personas = loadPersonas();
                const mode = params.mode || (params.targetPersona ? 'chat' : 'discussion');
                if (personas.size === 0) {
                    throw new Error('No personas configured. Please set writers_room_persona_* in .env');
                }
                if (mode === 'chat') {
                    // Interactive chat mode
                    const entries = Array.from(personas.entries());
                    const nameToKey = {};
                    for (const [key, p] of entries)
                        nameToKey[p.name.toLowerCase()] = key;
                    let targetKey;
                    let targetPersona;
                    if (params.targetPersona) {
                        const req = String(params.targetPersona).toLowerCase();
                        targetKey = nameToKey[req] || (personas.has(params.targetPersona) ? params.targetPersona : '');
                        targetPersona = personas.get(targetKey);
                        if (!targetPersona) {
                            const available = entries.map(([, v]) => v.name).sort();
                            throw new Error(`Persona ${params.targetPersona} not found. Available: ${available.join(', ')}`);
                        }
                    }
                    else {
                        // Default to director or first persona
                        const director = entries.find(([, p]) => /director/i.test(p.role));
                        [targetKey, targetPersona] = director || entries[0];
                    }
                    const formatList = (items) => {
                        if (Array.isArray(items)) {
                            return items.map(item => `• ${item}`).join('\n');
                        }
                        return items ? `• ${items}` : '• (none specified)';
                    };
                    const systemMessage = `You are ${targetPersona.name}, a ${targetPersona.role} in a writer's room.

Your specialties:
${formatList(targetPersona.specialties)}

Your manner of speaking:
${formatList(targetPersona.manner_of_speaking)}

Your strengths:
${formatList(targetPersona.strengths)}

Your potential blind spots:
${formatList(targetPersona.weaknesses)}

Your typical deliverables:
${formatList(targetPersona.deliverables)}

Special constraint: ${targetPersona.constraint || 'None specified'}

Respond in character, focusing on your area of expertise. Be constructive but honest.`;
                    let conversationContext = params.message;
                    if (params.content) {
                        conversationContext = `Story/Content Context:\n${params.content}\n\nUser Message: ${params.message}`;
                    }
                    const messages = [
                        { role: 'system', content: systemMessage },
                        { role: 'user', content: conversationContext }
                    ];
                    const response = await makeOpenRouterRequest(messages, targetPersona.model, 0.8, 8192);
                    const responseContent = response.choices[0].message.content;
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `**${targetPersona.name}** (${targetPersona.role}):\n\n${responseContent}`
                            }
                        ]
                    };
                }
                else {
                    // Multi-persona discussion mode
                    if (!params.content) {
                        throw new Error('Content is required for discussion mode');
                    }
                    // Map provided names to persona keys; default to all personas if none provided
                    const entries = Array.from(personas.entries());
                    const nameToKey = {};
                    for (const [key, p] of entries)
                        nameToKey[p.name.toLowerCase()] = key;
                    let personasToUse;
                    if (Array.isArray(params.personas) && params.personas.length > 0) {
                        personasToUse = params.personas.map((p) => {
                            const lowered = String(p).toLowerCase();
                            if (personas.has(p))
                                return p; // allow raw key if provided
                            if (nameToKey[lowered])
                                return nameToKey[lowered];
                            throw new Error(`Unknown persona: ${p}. Available: ${entries.map(([, v]) => v.name).join(', ')}`);
                        });
                    }
                    else {
                        personasToUse = entries.map(([key]) => key);
                    }
                    const discussion = [];
                    const allResponses = [];
                    const rounds = params.rounds || 1;
                    for (let round = 0; round < rounds; round++) {
                        const roundResponses = [];
                        for (const personaKey of personasToUse) {
                            const persona = personas.get(personaKey);
                            if (!persona)
                                continue;
                            const formatList = (items) => {
                                if (Array.isArray(items)) {
                                    return items.map(item => `• ${item}`).join('\n');
                                }
                                return items ? `• ${items}` : '• (none specified)';
                            };
                            const systemMessage = `You are ${persona.name}, a ${persona.role} in a writer's room discussion.

Your specialties:
${formatList(persona.specialties)}

Your manner of speaking:
${formatList(persona.manner_of_speaking)}

Your strengths:
${formatList(persona.strengths)}

Your potential blind spots:
${formatList(persona.weaknesses)}

Your typical deliverables:
${formatList(persona.deliverables)}

Special constraint: ${persona.constraint || 'None specified'}

Respond in character, focusing on your area of expertise. Be constructive but honest.`;
                            let conversationContext = `Story/Chapter Content:\n${params.content}\n\n`;
                            if (allResponses.length > 0) {
                                conversationContext += 'Previous discussion:\n';
                                for (const resp of allResponses) {
                                    conversationContext += `\n${resp.name}: ${resp.content.substring(0, 300)}...\n`;
                                }
                            }
                            conversationContext += `\nTopic: ${params.topic || params.message}`;
                            const messages = [
                                { role: 'system', content: systemMessage },
                                { role: 'user', content: conversationContext }
                            ];
                            const response = await makeOpenRouterRequest(messages, persona.model, 0.8, 8192);
                            const responseContent = response.choices[0].message.content;
                            const responseData = {
                                persona: personaKey,
                                name: persona.name,
                                role: persona.role,
                                content: responseContent
                            };
                            roundResponses.push(responseData);
                            allResponses.push(responseData);
                        }
                        discussion.push({
                            round: round + 1,
                            responses: roundResponses
                        });
                    }
                    // Save discussion
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const filename = `discussion_${timestamp}.json`;
                    const filepath = path.join(OUTPUT_WRITERS_ROOM, filename);
                    fs.writeFileSync(filepath, JSON.stringify({
                        topic: params.topic || params.message,
                        timestamp: new Date().toISOString(),
                        rounds: discussion
                    }, null, 2));
                    // Create readable output
                    let readableOutput = `# Writer's Room Discussion\n\nTopic: ${params.topic || params.message}\n\n`;
                    for (const round of discussion) {
                        readableOutput += `\n## Round ${round.round}\n\n`;
                        for (const response of round.responses) {
                            readableOutput += `### ${response.name} (${response.role})\n\n${response.content}\n\n---\n\n`;
                        }
                    }
                    const mdFilepath = filepath.replace('.json', '.md');
                    fs.writeFileSync(mdFilepath, readableOutput);
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Discussion completed!\n\nSaved to:\n- JSON: ${filepath}\n- Markdown: ${mdFilepath}\n\n${readableOutput}`
                            }
                        ]
                    };
                }
            }
            case 'writers_room_session': {
                const params = args;
                const action = params.action;
                if (action === 'list') {
                    const sessionFiles = fs.readdirSync(OUTPUT_WRITERS_ROOM)
                        .filter(f => f.startsWith('session_') && f.endsWith('.json'))
                        .map(f => f.replace('.json', ''))
                        .sort();
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Active sessions:\n${sessionFiles.length > 0 ? sessionFiles.map(s => `- ${s}`).join('\n') : 'No active sessions'}`
                            }
                        ]
                    };
                }
                if (action === 'create') {
                    const sessionId = `session_${Date.now()}`;
                    const sessionData = {
                        id: sessionId,
                        created: new Date().toISOString(),
                        messages: [],
                        personas: params.personas || ['persona_1', 'persona_2', 'persona_3', 'persona_4'],
                        mode: params.mode || 'parallel'
                    };
                    if (params.message) {
                        sessionData.messages.push({
                            timestamp: new Date().toISOString(),
                            type: 'user',
                            content: params.message
                        });
                    }
                    const sessionPath = path.join(OUTPUT_WRITERS_ROOM, `${sessionId}.json`);
                    fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2));
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Session created: ${sessionId}\n\nUse action="continue" with this sessionId to add messages.`
                            }
                        ]
                    };
                }
                if (!params.sessionId) {
                    throw new Error('sessionId is required for this action');
                }
                const sessionPath = path.join(OUTPUT_WRITERS_ROOM, `${params.sessionId}.json`);
                if (action === 'read') {
                    if (!fs.existsSync(sessionPath)) {
                        throw new Error(`Session ${params.sessionId} not found`);
                    }
                    const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Session: ${sessionData.id}\nCreated: ${sessionData.created}\nMessages: ${sessionData.messages.length}\n\n${JSON.stringify(sessionData, null, 2)}`
                            }
                        ]
                    };
                }
                if (action === 'delete') {
                    if (fs.existsSync(sessionPath)) {
                        fs.unlinkSync(sessionPath);
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: `Session ${params.sessionId} deleted`
                                }
                            ]
                        };
                    }
                    else {
                        throw new Error(`Session ${params.sessionId} not found`);
                    }
                }
                if (action === 'continue') {
                    if (!fs.existsSync(sessionPath)) {
                        throw new Error(`Session ${params.sessionId} not found`);
                    }
                    const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
                    if (params.message) {
                        sessionData.messages.push({
                            timestamp: new Date().toISOString(),
                            type: 'user',
                            content: params.message
                        });
                        // Save updated session
                        fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2));
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: `Message added to session ${params.sessionId}\n\nTotal messages: ${sessionData.messages.length}`
                                }
                            ]
                        };
                    }
                    else {
                        throw new Error('message is required for continue action');
                    }
                }
                throw new Error(`Unknown session action: ${action}`);
            }
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${error instanceof Error ? error.message : String(error)}`
                }
            ]
        };
    }
});
// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('MCP Writing Assistant Server (Consolidated) running');
}
main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map