/**
 * OpenAI provider for LLM requests
 */

class OpenAIProvider {
    constructor() {
        this.name = 'openai';
    }

    /**
     * Format request for OpenAI API
     */
    formatRequest(messages, options = {}) {
        // Validate messages
        if (!Array.isArray(messages) || messages.length === 0) {
            throw new Error('Messages must be a non-empty array');
        }
        
        // Validate message format
        for (const msg of messages) {
            if (!msg.role || !msg.content) {
                throw new Error('Each message must have role and content');
            }
        }
        
        return {
            model: options.model || 'gpt-4o-mini',
            messages,
            max_tokens: options.maxTokens || 1000,
            temperature: options.temperature || 0.1
        };
    }

    /**
     * Parse OpenAI response
     */
    parseResponse(responseData) {
        // Validate response structure
        if (!responseData?.choices?.[0]?.message?.content) {
            throw new Error('Invalid OpenAI response format');
        }
        
        const choice = responseData.choices[0];
        
        // Check if response was truncated
        if (choice.finish_reason === 'length') {
            console.warn('OpenAI response was truncated due to token limit');
        }
        
        // Validate content exists and is meaningful
        const content = choice.message.content;
        if (!content || content.trim().length === 0) {
            throw new Error('Empty response from OpenAI');
        }
        
        return content;
    }

    /**
     * Get default headers for OpenAI
     */
    getHeaders(apiKey) {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        };
    }

}

module.exports = OpenAIProvider;
