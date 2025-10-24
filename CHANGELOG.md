# Changelog

All notable changes to ai-reviewer-core will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-01-08

### Added
- Comprehensive test suite for CodeReviewer class (26 new tests)
- Input validation for OpenAI provider
- Robust error handling and response validation

### Changed  
- Updated OpenAI model from gpt-3.5-turbo to gpt-4o-mini
- Increased token limits from 500 to 1000 for better reviews
- Improved test coverage from 57% to 89%

### Fixed
- Line number mutation bug in parseDiff function
- Package URLs pointing to correct GitHub repository

### Removed
- Over-engineered formatting methods (formatResults, formatAsMarkdown, formatAsText)

## [1.0.0] - 2025-01-08

### Added
- Initial release of ai-reviewer-core
- Platform-agnostic AI code review engine
- Support for OpenAI LLM provider (gpt-4o-mini)
- Git diff parsing with structured hunk analysis
- Direct structured data output for platform integration
- Comprehensive API for code review automation
- Robust test suite for core functionality
- CommonJS and ESM module support

### Core Features
- `CodeReviewer` class for review orchestration
- `parseDiff` function for Git diff processing
- `LLMCoordinator` for AI model communication
- `OpenAIProvider` for OpenAI GPT integration
- Extensible provider system for future LLM support

### API
- `reviewChanges(diffData, options)` - Main review function
- `reviewHunk(hunk, options)` - Single hunk review
- `generateSummary(diffData, options)` - Summary generation
- `filterComments(comments, filters)` - Comment filtering
- Direct structured data output for platform integration

### Dependencies
- axios ^1.3.4 - HTTP client for LLM API calls
- dotenv ^16.0.3 - Environment variable management

### Development
- Jest test framework with comprehensive coverage
- Babel build system for CommonJS/ESM output
- ESLint for code quality
- CI/CD workflows for automated testing and publishing
