/**
 * Core AI Code Reviewer - Platform Agnostic
 * 
 * This module contains the core review logic that works across all platforms
 */

const parseDiff = require('./parseDiff');
const { getReviewFromLLM, getSummaryFromLLM } = require('./llm');

class CodeReviewer {
    constructor() {
        this.name = 'AI Code Reviewer';
    }

    /**
     * Review code changes and generate comments
     * @param {string} diffData - Git diff content
     * @param {Object} options - Review options
     * @returns {Object} Review results with comments and summary
     */
    async reviewChanges(diffData, options = {}) {
        if (!diffData || typeof diffData !== 'string') {
            throw new Error('Valid diff data is required');
        }

        const results = {
            summary: null,
            comments: [],
            hunks: [],
            metadata: {
                reviewedAt: new Date().toISOString(),
                totalHunks: 0,
                totalComments: 0
            }
        };

        try {
            // Parse the diff into structured hunks
            const hunks = parseDiff(diffData);
            results.hunks = hunks;
            results.metadata.totalHunks = hunks.length;

            // Generate summary if requested
            if (options.generateSummary !== false) {
                results.summary = await this.generateSummary(diffData, options);
            }

            // Review each hunk and collect comments
            for (const hunk of hunks) {
                const hunkComments = await this.reviewHunk(hunk, options);
                results.comments.push(...hunkComments);
            }

            results.metadata.totalComments = results.comments.length;
            return results;

        } catch (error) {
            throw new Error(`Review failed: ${error.message}`);
        }
    }

    /**
     * Review a single hunk and generate comments
     * @param {Object} hunk - Parsed hunk data
     * @param {Object} options - Review options
     * @returns {Array} Array of comments for this hunk
     */
    async reviewHunk(hunk, options = {}) {
        if (!hunk || !hunk.filename || !hunk.changes) {
            throw new Error('Invalid hunk data');
        }

        try {
            const reviewResponse = await getReviewFromLLM(hunk);
            
            if (!reviewResponse.comments || !Array.isArray(reviewResponse.comments)) {
                console.warn('No valid comments in review response for', hunk.filename);
                return [];
            }

            // Enhance comments with file information
            return reviewResponse.comments.map(comment => ({
                ...comment,
                filename: hunk.filename,
                hunkHeader: hunk.hunkHeader
            }));

        } catch (error) {
            console.error(`Failed to review hunk in ${hunk.filename}:`, error.message);
            return [];
        }
    }

    /**
     * Generate summary of changes
     * @param {string} diffData - Git diff content
     * @param {Object} options - Summary options
     * @returns {string} Generated summary
     */
    async generateSummary(diffData, options = {}) {
        try {
            return await getSummaryFromLLM(diffData);
        } catch (error) {
            console.error('Failed to generate summary:', error.message);
            return 'Summary generation failed';
        }
    }

    /**
     * Filter comments based on criteria
     * @param {Array} comments - Array of comments
     * @param {Object} filters - Filter criteria
     * @returns {Array} Filtered comments
     */
    filterComments(comments, filters = {}) {
        let filtered = [...comments];

        if (filters.minLength) {
            filtered = filtered.filter(c => c.body && c.body.length >= filters.minLength);
        }

        if (filters.excludeFiles) {
            const excludePatterns = Array.isArray(filters.excludeFiles) ? filters.excludeFiles : [filters.excludeFiles];
            filtered = filtered.filter(c => !excludePatterns.some(pattern => c.filename.includes(pattern)));
        }

        if (filters.includeFiles) {
            const includePatterns = Array.isArray(filters.includeFiles) ? filters.includeFiles : [filters.includeFiles];
            filtered = filtered.filter(c => includePatterns.some(pattern => c.filename.includes(pattern)));
        }

        return filtered;
    }

    /**
     * Format review results for output
     * @param {Object} results - Review results
     * @param {string} format - Output format ('json', 'markdown', 'text')
     * @returns {string} Formatted output
     */
    formatResults(results, format = 'json') {
        switch (format.toLowerCase()) {
            case 'markdown':
                return this.formatAsMarkdown(results);
            case 'text':
                return this.formatAsText(results);
            case 'json':
            default:
                return JSON.stringify(results, null, 2);
        }
    }

    /**
     * Format results as markdown
     */
    formatAsMarkdown(results) {
        let output = `# AI Code Review\n\n`;
        
        if (results.summary) {
            output += `## Summary\n${results.summary}\n\n`;
        }

        if (results.comments.length > 0) {
            output += `## Comments (${results.comments.length})\n\n`;
            for (const comment of results.comments) {
                output += `### ${comment.filename}:${comment.line}\n`;
                output += `${comment.body}\n\n`;
            }
        } else {
            output += `## Comments\nNo issues found.\n\n`;
        }

        output += `---\n*Reviewed ${results.metadata.totalHunks} hunks at ${results.metadata.reviewedAt}*\n`;
        return output;
    }

    /**
     * Format results as plain text
     */
    formatAsText(results) {
        let output = `AI Code Review\n${'='.repeat(50)}\n\n`;
        
        if (results.summary) {
            output += `Summary:\n${results.summary}\n\n`;
        }

        if (results.comments.length > 0) {
            output += `Comments (${results.comments.length}):\n\n`;
            for (const comment of results.comments) {
                output += `${comment.filename}:${comment.line}\n`;
                output += `  ${comment.body}\n\n`;
            }
        } else {
            output += `No issues found.\n\n`;
        }

        output += `Reviewed ${results.metadata.totalHunks} hunks at ${results.metadata.reviewedAt}\n`;
        return output;
    }
}

module.exports = CodeReviewer;