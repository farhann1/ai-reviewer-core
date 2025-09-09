/**
 * @ai-reviewer/core - Main entry point
 * 
 * Platform-agnostic AI code review library
 */

const CodeReviewer = require('./reviewer');
const parseDiff = require('./parseDiff');
const { getReviewFromLLM, getSummaryFromLLM } = require('./llm');
const LLMCoordinator = require('./llm/index');
const OpenAIProvider = require('./llm/providers/openai');

module.exports = {
  // Main classes
  CodeReviewer,
  LLMCoordinator,
  OpenAIProvider,
  
  // Utility functions
  parseDiff,
  getReviewFromLLM,
  getSummaryFromLLM,
  
  // Factory functions
  createReviewer: () => new CodeReviewer(),
  createLLMCoordinator: () => new LLMCoordinator(),
  
  // Version info
  version: require('../package.json').version
};
