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
        return {
            model: options.model || 'gpt-3.5-turbo',
            messages,
            max_tokens: options.maxTokens || 500,
            temperature: options.temperature || 0.1
        };
    }

    /**
     * Parse OpenAI response
     */
    parseResponse(responseData) {
        if (responseData.choices && responseData.choices[0] && responseData.choices[0].message) {
            return responseData.choices[0].message.content;
        }
        throw new Error('Invalid OpenAI response format');
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
