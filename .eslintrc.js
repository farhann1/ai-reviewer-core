module.exports = {
    env: {
        browser: false,
        es2021: true,
        node: true,
        jest: true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    rules: {
        // Code quality
        'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        'no-console': 'warn',
        'prefer-const': 'error',
        'no-var': 'error',
        
        // Style consistency
        'indent': ['error', 4],
        'quotes': ['error', 'single'],
        'semi': ['error', 'always'],
        'comma-dangle': ['error', 'never'],
        'eol-last': ['error', 'always'],
        
        // Best practices
        'eqeqeq': ['error', 'always'],
        'curly': ['error', 'all'],
        'no-eval': 'error',
        'no-implied-eval': 'error',
        'no-new-func': 'error',
        
        // ES6+ features
        'arrow-spacing': 'error',
        'template-curly-spacing': 'error',
        'object-shorthand': 'error'
    },
    overrides: [
        {
            files: ['**/__tests__/**/*.js', '**/*.test.js'],
            env: {
                jest: true
            },
            rules: {
                'no-console': 'off' // Allow console in tests
            }
        }
    ]
};
