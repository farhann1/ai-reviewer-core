/**
 * LLM Provider Registry and Coordinator
 */

const axios = require('axios');
const OpenAIProvider = require('./providers/openai');

class LLMCoordinator {
    constructor() {
        this.provider = new OpenAIProvider();
    }

    /**
     * Get the OpenAI provider instance
     */
    getProvider() {
        return this.provider;
    }

    /**
     * Make a request to the OpenAI API
     */
    async makeRequest(endpoint, apiKey, messages, options = {}) {
        if (!endpoint) {
            throw new Error('LLM_ENDPOINT is required');
        }
        if (!apiKey) {
            throw new Error('LLM_API_KEY is required');
        }

        const provider = this.getProvider();
        
        try {
            const requestBody = provider.formatRequest(messages, options);
            const headers = provider.getHeaders(apiKey);

            const response = await axios.post(endpoint, requestBody, { headers });
            const content = provider.parseResponse(response.data);
            
            return content;
        } catch (error) {
            if (error.response) {
                throw new Error(`LLM API Error (${provider.name}): ${error.response.status} - ${error.response.data?.error?.message || error.message}`);
            }
            throw new Error(`LLM Request Failed (${provider.name}): ${error.message}`);
        }
    }

    /**
     * Get review from LLM
     */
    async getReview(hunk) {
        const messages = [
            { 
                role: 'system', 
                content: 'You are an AI assistant that reviews code changes. Always respond with pure JSON only, no markdown formatting.' 
            },
            { 
                role: 'user', 
                content: this.buildReviewPrompt(hunk)
            }
        ];

        const options = {
            maxTokens: 1000,
            temperature: 0.1
        };

        const content = await this.makeRequest(
            process.env.LLM_ENDPOINT, 
            process.env.LLM_API_KEY, 
            messages, 
            options
        );

        return this.parseReviewResponse(content);
    }

    /**
     * Get summary from LLM
     */
    async getSummary(diffData) {
        const messages = [
            { 
                role: 'system', 
                content: 'You are an AI assistant that summarizes incremental code changes in pull requests. Focus on what\'s new or modified since the last review.' 
            },
            { 
                role: 'user', 
                content: this.buildSummaryPrompt(diffData)
            }
        ];

        const options = {
            maxTokens: 1500,
            temperature: 0.1
        };

        return await this.makeRequest(
            process.env.LLM_ENDPOINT, 
            process.env.LLM_API_KEY, 
            messages, 
            options
        );
    }

    /**
     * Build review prompt
     */
    buildReviewPrompt(hunk) {
        return `Below data is in JSON format and was constructed from Git diff data consisting of GNU hunks for a particular file.
                        The changes array contains objects with:
                        - content: the line content
                        - type: 'addition', 'deletion', or 'context'
                        - lineNumber: the actual line number in the new file
                        
                        ${JSON.stringify(hunk)} 

                        Review the code changes and provide review comments. For each comment:
                        - Only comment on added or modified lines (type: 'addition')
                        - Use the exact lineNumber provided in the changes array
                        - If you have no concerns, return an empty comments array
                        
                        Output Format: Return ONLY a JSON object (no markdown, no code blocks) with this structure:
                        {
                          "comments": [
                            {
                              "body": "Comment body here",
                              "line": <exact_line_number>
                            }
                          ] 
                        }`;
    }

    /**
     * Build summary prompt
     */
    buildSummaryPrompt(diffData) {
        return `Please review the following incremental changes in this pull request and provide a concise summary:
                        - Focus on what has changed since the last review
                        - Highlight any new additions or modifications
                        - Note any resolved or new concerns
                        - Keep the summary professional and constructive

                        Changes:
                        ${diffData}`;
    }

    /**
     * Parse review response and handle JSON
     */
    parseReviewResponse(content) {
        // Clean up any markdown formatting that might be present
        const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
        
        try {
            return JSON.parse(cleanedContent);
        } catch (error) {
            console.error('Failed to parse LLM response:', cleanedContent);
            throw new Error('Invalid JSON response from LLM');
        }
    }
}

// Create singleton instance
const coordinator = new LLMCoordinator();

module.exports = {
    getReviewFromLLM: (hunk) => coordinator.getReview(hunk),
    getSummaryFromLLM: (diffData) => coordinator.getSummary(diffData),
    // Export for testing
    __test__: {
        LLMCoordinator,
        coordinator
    }
};
