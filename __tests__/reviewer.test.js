const CodeReviewer = require('../src/reviewer');

// Mock dependencies
jest.mock('../src/parseDiff');
jest.mock('../src/llm');

const parseDiff = require('../src/parseDiff');
const { getReviewFromLLM, getSummaryFromLLM } = require('../src/llm');

describe('CodeReviewer', () => {
    let reviewer;

    beforeEach(() => {
        reviewer = new CodeReviewer();
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        test('should create instance with correct name', () => {
            expect(reviewer.name).toBe('AI Code Reviewer');
        });
    });

    describe('reviewChanges', () => {
        const mockDiffData = `diff --git a/test.js b/test.js
index 123..456 100644
--- a/test.js
+++ b/test.js
@@ -1,2 +1,3 @@
 const a = 1;
+const b = 2;
 const c = 3;`;

        const mockHunks = [
            {
                filename: 'test.js',
                changes: [
                    { content: ' const a = 1;', type: 'context', lineNumber: 1 },
                    { content: '+const b = 2;', type: 'addition', lineNumber: 2 },
                    { content: ' const c = 3;', type: 'context', lineNumber: 3 }
                ],
                hunkHeader: { oldStart: 1, newStart: 1 }
            }
        ];

        test('should process diff and return complete results', async () => {
            // Setup mocks
            parseDiff.mockReturnValue(mockHunks);
            getSummaryFromLLM.mockResolvedValue('Added variable b');
            getReviewFromLLM.mockResolvedValue({
                comments: [
                    { body: 'Consider using const consistently', line: 2 }
                ]
            });

            const results = await reviewer.reviewChanges(mockDiffData);

            expect(results).toHaveProperty('summary');
            expect(results).toHaveProperty('comments');
            expect(results).toHaveProperty('hunks');
            expect(results).toHaveProperty('metadata');

            expect(results.summary).toBe('Added variable b');
            expect(results.comments).toHaveLength(1);
            expect(results.comments[0]).toEqual({
                body: 'Consider using const consistently',
                line: 2,
                filename: 'test.js',
                hunkHeader: { oldStart: 1, newStart: 1 }
            });
            expect(results.hunks).toEqual(mockHunks);
            expect(results.metadata.totalHunks).toBe(1);
            expect(results.metadata.totalComments).toBe(1);
            expect(results.metadata.reviewedAt).toBeDefined();
        });

        test('should skip summary generation when disabled', async () => {
            parseDiff.mockReturnValue(mockHunks);
            getReviewFromLLM.mockResolvedValue({ comments: [] });

            const results = await reviewer.reviewChanges(mockDiffData, { generateSummary: false });

            expect(getSummaryFromLLM).not.toHaveBeenCalled();
            expect(results.summary).toBeNull();
        });

        test('should handle multiple hunks correctly', async () => {
            const multipleHunks = [
                { ...mockHunks[0], filename: 'file1.js' },
                { ...mockHunks[0], filename: 'file2.js' }
            ];

            parseDiff.mockReturnValue(multipleHunks);
            getSummaryFromLLM.mockResolvedValue('Multiple files changed');
            getReviewFromLLM.mockResolvedValue({ comments: [{ body: 'Good code', line: 1 }] });

            const results = await reviewer.reviewChanges(mockDiffData);

            expect(getReviewFromLLM).toHaveBeenCalledTimes(2);
            expect(results.comments).toHaveLength(2);
            expect(results.metadata.totalHunks).toBe(2);
        });

        test('should throw error for invalid diff data', async () => {
            await expect(reviewer.reviewChanges(null)).rejects.toThrow('Valid diff data is required');
            await expect(reviewer.reviewChanges('')).rejects.toThrow('Valid diff data is required');
            await expect(reviewer.reviewChanges(123)).rejects.toThrow('Valid diff data is required');
        });

        test('should handle parseDiff errors', async () => {
            parseDiff.mockImplementation(() => {
                throw new Error('Invalid diff format');
            });

            await expect(reviewer.reviewChanges(mockDiffData)).rejects.toThrow('Review failed: Invalid diff format');
        });

        test('should handle empty hunks', async () => {
            parseDiff.mockReturnValue([]);
            getSummaryFromLLM.mockResolvedValue('No changes detected');

            const results = await reviewer.reviewChanges(mockDiffData);

            expect(results.hunks).toEqual([]);
            expect(results.comments).toEqual([]);
            expect(results.metadata.totalHunks).toBe(0);
            expect(results.metadata.totalComments).toBe(0);
        });
    });

    describe('reviewHunk', () => {
        const mockHunk = {
            filename: 'test.js',
            changes: [
                { content: '+const newVar = true;', type: 'addition', lineNumber: 5 }
            ],
            hunkHeader: { oldStart: 4, newStart: 4 }
        };

        test('should review hunk and enhance comments', async () => {
            getReviewFromLLM.mockResolvedValue({
                comments: [
                    { body: 'Consider using a more descriptive name', line: 5 }
                ]
            });

            const results = await reviewer.reviewHunk(mockHunk);

            expect(getReviewFromLLM).toHaveBeenCalledWith(mockHunk);
            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                body: 'Consider using a more descriptive name',
                line: 5,
                filename: 'test.js',
                hunkHeader: { oldStart: 4, newStart: 4 }
            });
        });

        test('should handle empty comments response', async () => {
            getReviewFromLLM.mockResolvedValue({ comments: [] });

            const results = await reviewer.reviewHunk(mockHunk);

            expect(results).toEqual([]);
        });

        test('should handle invalid comments response', async () => {
            getReviewFromLLM.mockResolvedValue({ comments: null });

            const results = await reviewer.reviewHunk(mockHunk);

            expect(results).toEqual([]);
        });

        test('should handle LLM errors gracefully', async () => {
            getReviewFromLLM.mockRejectedValue(new Error('API rate limit exceeded'));

            const results = await reviewer.reviewHunk(mockHunk);

            expect(results).toEqual([]);
        });

        test('should throw error for invalid hunk data', async () => {
            await expect(reviewer.reviewHunk(null)).rejects.toThrow('Invalid hunk data');
            await expect(reviewer.reviewHunk({})).rejects.toThrow('Invalid hunk data');
            await expect(reviewer.reviewHunk({ filename: 'test.js' })).rejects.toThrow('Invalid hunk data');
            await expect(reviewer.reviewHunk({ changes: [] })).rejects.toThrow('Invalid hunk data');
        });
    });

    describe('generateSummary', () => {
        const mockDiffData = 'diff --git a/test.js b/test.js';

        test('should generate summary successfully', async () => {
            getSummaryFromLLM.mockResolvedValue('Added new functionality for user authentication');

            const result = await reviewer.generateSummary(mockDiffData);

            expect(getSummaryFromLLM).toHaveBeenCalledWith(mockDiffData);
            expect(result).toBe('Added new functionality for user authentication');
        });

        test('should handle LLM errors gracefully', async () => {
            getSummaryFromLLM.mockRejectedValue(new Error('Network timeout'));

            const result = await reviewer.generateSummary(mockDiffData);

            expect(result).toBe('Summary generation failed');
        });

        test('should pass options to LLM call', async () => {
            getSummaryFromLLM.mockResolvedValue('Summary with options');
            const options = { maxLength: 100 };

            await reviewer.generateSummary(mockDiffData, options);

            expect(getSummaryFromLLM).toHaveBeenCalledWith(mockDiffData);
        });
    });

    describe('filterComments', () => {
        const mockComments = [
            { body: 'Short', filename: 'test.js', line: 1 },
            { body: 'This is a longer comment with more details', filename: 'test.js', line: 2 },
            { body: 'Comment in spec file', filename: 'test.spec.js', line: 3 },
            { body: 'Comment in source file', filename: 'src/main.js', line: 4 },
            { body: 'Another detailed comment explaining the issue', filename: 'src/utils.js', line: 5 }
        ];

        test('should filter by minimum length', () => {
            const filtered = reviewer.filterComments(mockComments, { minLength: 20 });

            expect(filtered).toHaveLength(4);
            expect(filtered.every(c => c.body.length >= 20)).toBe(true);
        });

        test('should exclude files by pattern', () => {
            const filtered = reviewer.filterComments(mockComments, { excludeFiles: 'spec' });

            expect(filtered).toHaveLength(4);
            expect(filtered.every(c => !c.filename.includes('spec'))).toBe(true);
        });

        test('should exclude files by multiple patterns', () => {
            const filtered = reviewer.filterComments(mockComments, { 
                excludeFiles: ['spec', 'test.js'] 
            });

            expect(filtered).toHaveLength(2);
            expect(filtered.every(c => !c.filename.includes('spec') && !c.filename.includes('test.js'))).toBe(true);
        });

        test('should include only specified files', () => {
            const filtered = reviewer.filterComments(mockComments, { includeFiles: 'src' });

            expect(filtered).toHaveLength(2);
            expect(filtered.every(c => c.filename.includes('src'))).toBe(true);
        });

        test('should include files by multiple patterns', () => {
            const filtered = reviewer.filterComments(mockComments, { 
                includeFiles: ['src', 'test.js'] 
            });

            expect(filtered).toHaveLength(4);
        });

        test('should combine multiple filters', () => {
            const filtered = reviewer.filterComments(mockComments, {
                minLength: 15,
                excludeFiles: 'spec',
                includeFiles: 'src'
            });

            expect(filtered).toHaveLength(2);
            expect(filtered.every(c => 
                c.body.length >= 15 && 
                !c.filename.includes('spec') && 
                c.filename.includes('src')
            )).toBe(true);
        });

        test('should return empty array when no comments match filters', () => {
            const filtered = reviewer.filterComments(mockComments, { minLength: 1000 });

            expect(filtered).toEqual([]);
        });

        test('should return original comments when no filters applied', () => {
            const filtered = reviewer.filterComments(mockComments, {});

            expect(filtered).toEqual(mockComments);
        });

        test('should not modify original comments array', () => {
            const originalLength = mockComments.length;
            
            reviewer.filterComments(mockComments, { minLength: 50 });

            expect(mockComments).toHaveLength(originalLength);
        });
    });

    describe('integration scenarios', () => {
        test('should handle complete workflow with errors in some hunks', async () => {
            const multipleHunks = [
                {
                    filename: 'good.js',
                    changes: [{ content: '+good code', type: 'addition', lineNumber: 1 }],
                    hunkHeader: { oldStart: 1, newStart: 1 }
                },
                {
                    filename: 'bad.js', 
                    changes: [{ content: '+bad code', type: 'addition', lineNumber: 1 }],
                    hunkHeader: { oldStart: 1, newStart: 1 }
                }
            ];

            parseDiff.mockReturnValue(multipleHunks);
            getSummaryFromLLM.mockResolvedValue('Mixed quality changes');
            
            // First hunk succeeds, second fails
            getReviewFromLLM
                .mockResolvedValueOnce({ comments: [{ body: 'Good work', line: 1 }] })
                .mockRejectedValueOnce(new Error('LLM error'));

            const results = await reviewer.reviewChanges('mock diff');

            expect(results.comments).toHaveLength(1);
            expect(results.comments[0].filename).toBe('good.js');
            expect(results.metadata.totalComments).toBe(1);
        });

        test('should handle large diff with many hunks', async () => {
            // Create 10 hunks
            const manyHunks = Array.from({ length: 10 }, (_, i) => ({
                filename: `file${i}.js`,
                changes: [{ content: `+change ${i}`, type: 'addition', lineNumber: 1 }],
                hunkHeader: { oldStart: 1, newStart: 1 }
            }));

            parseDiff.mockReturnValue(manyHunks);
            getSummaryFromLLM.mockResolvedValue('Large refactoring');
            getReviewFromLLM.mockResolvedValue({ comments: [{ body: 'Looks good', line: 1 }] });

            const results = await reviewer.reviewChanges('large diff');

            expect(getReviewFromLLM).toHaveBeenCalledTimes(10);
            expect(results.comments).toHaveLength(10);
            expect(results.metadata.totalHunks).toBe(10);
        });
    });
});
