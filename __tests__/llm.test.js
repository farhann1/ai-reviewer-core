const axios = require('axios');
const { getReviewFromLLM, getSummaryFromLLM } = require('../src/llm');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  jest.resetAllMocks();
  process.env = {
    ...originalEnv,
    LLM_API_KEY: 'test-api-key',
    LLM_ENDPOINT: 'https://api.openai.com/v1/chat/completions'
  };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('llm', () => {
  describe('getReviewFromLLM', () => {
    const sampleHunk = {
      filename: 'test.js',
      changes: [
        { content: ' const a = 1;', type: 'context', lineNumber: 1 },
        { content: '+const b = 2;', type: 'addition', lineNumber: 2 },
        { content: ' const c = 3;', type: 'context', lineNumber: 3 }
      ],
      hunkHeader: { oldStart: 1, newStart: 1 }
    };

    test('should return valid review comments', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                comments: [
                  {
                    body: 'Consider adding type validation',
                    line: 2
                  }
                ]
              })
            }
          }]
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await getReviewFromLLM(sampleHunk);

      expect(result).toEqual({
        comments: [
          {
            body: 'Consider adding type validation',
            line: 2
          }
        ]
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          model: 'gpt-4o-mini',
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user' })
          ]),
          max_tokens: 1000,
          temperature: 0.1
        }),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key'
          }
        })
      );
    });

    test('should handle response with no comments', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                comments: []
              })
            }
          }]
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await getReviewFromLLM(sampleHunk);

      expect(result).toEqual({
        comments: []
      });
    });

    test('should clean up markdown formatting from response', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: '```json\n' + JSON.stringify({
                comments: [
                  {
                    body: 'Good code structure',
                    line: 2
                  }
                ]
              }) + '\n```'
            }
          }]
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await getReviewFromLLM(sampleHunk);

      expect(result).toEqual({
        comments: [
          {
            body: 'Good code structure',
            line: 2
          }
        ]
      });
    });

    test('should throw error for invalid JSON response', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: 'Invalid JSON response'
            }
          }]
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await expect(getReviewFromLLM(sampleHunk))
        .rejects
        .toThrow('Invalid JSON response from LLM');
    });

    test('should handle axios errors', async () => {
      const axiosError = new Error('Network error');
      mockedAxios.post.mockRejectedValue(axiosError);

      await expect(getReviewFromLLM(sampleHunk))
        .rejects
        .toThrow('Network error');
    });

    test('should include hunk data in prompt', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({ comments: [] })
            }
          }]
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await getReviewFromLLM(sampleHunk);

      const callArgs = mockedAxios.post.mock.calls[0];
      const requestBody = callArgs[1];
      const userMessage = requestBody.messages.find(msg => msg.role === 'user');
      
      expect(userMessage.content).toContain(JSON.stringify(sampleHunk));
      expect(userMessage.content).toContain('Review the code changes');
      expect(userMessage.content).toContain('Only comment on added or modified lines');
    });
  });

  describe('getSummaryFromLLM', () => {
    const sampleDiff = `diff --git a/test.js b/test.js
index 123..456 100644
--- a/test.js
+++ b/test.js
@@ -1,2 +1,3 @@
 const a = 1;
+const b = 2;
 const c = 3;`;

    test('should return summary for diff changes', async () => {
      const mockSummary = 'Added a new constant `b` with value 2. This change improves code organization.';
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: mockSummary
            }
          }]
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await getSummaryFromLLM(sampleDiff);

      expect(result).toBe(mockSummary);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          model: 'gpt-4o-mini',
          messages: expect.arrayContaining([
            expect.objectContaining({ 
              role: 'system',
              content: expect.stringContaining('summarizes incremental code changes')
            }),
            expect.objectContaining({ 
              role: 'user',
              content: expect.stringContaining(sampleDiff)
            })
          ]),
          max_tokens: 1500,
          temperature: 0.1
        }),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key'
          }
        })
      );
    });

    test('should handle empty diff', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: 'No significant changes detected.'
            }
          }]
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await getSummaryFromLLM('');

      expect(result).toBe('No significant changes detected.');
    });

    test('should handle axios errors in summary generation', async () => {
      const axiosError = new Error('API rate limit exceeded');
      mockedAxios.post.mockRejectedValue(axiosError);

      await expect(getSummaryFromLLM(sampleDiff))
        .rejects
        .toThrow('API rate limit exceeded');
    });

    test('should include incremental focus in prompt', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: 'Summary content'
            }
          }]
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await getSummaryFromLLM(sampleDiff);

      const callArgs = mockedAxios.post.mock.calls[0];
      const requestBody = callArgs[1];
      const userMessage = requestBody.messages.find(msg => msg.role === 'user');
      
      expect(userMessage.content).toContain('incremental changes');
      expect(userMessage.content).toContain('since the last review');
      expect(userMessage.content).toContain('new additions or modifications');
      expect(userMessage.content).toContain(sampleDiff);
    });
  });

  describe('environment variable handling', () => {
    test('should use correct environment variables', async () => {
      process.env.LLM_API_KEY = 'custom-key';
      process.env.LLM_ENDPOINT = 'https://custom.endpoint.com/api';

      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({ comments: [] })
            }
          }]
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const sampleHunk = {
        filename: 'test.js',
        changes: [{ content: '+test', type: 'addition', lineNumber: 1 }]
      };

      await getReviewFromLLM(sampleHunk);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://custom.endpoint.com/api',
        expect.any(Object),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer custom-key'
          }
        })
      );
    });
  });

  describe('provider system', () => {
    test('should use OpenAI provider', () => {
      const { __test__ } = require('../src/llm/index');
      const coordinator = __test__.coordinator;
      
      const provider = coordinator.getProvider();
      expect(provider.name).toBe('openai');
    });
  });
});
