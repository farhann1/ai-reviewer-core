const parseDiff = require('../src/parseDiff');

describe('parseDiff', () => {
  describe('basic functionality', () => {
    test('should throw error for invalid input', () => {
      expect(() => parseDiff(null)).toThrow('Invalid diff input: expected non-empty string');
      expect(() => parseDiff(undefined)).toThrow('Invalid diff input: expected non-empty string');
      expect(() => parseDiff('')).toThrow('Invalid diff input: expected non-empty string');
      expect(() => parseDiff(123)).toThrow('Invalid diff input: expected non-empty string');
    });

    test('should return empty array for diff with no changes', () => {
      const diff = 'diff --git a/test.js b/test.js\nindex 1234567..abcdefg 100644\n--- a/test.js\n+++ b/test.js';
      const result = parseDiff(diff);
      expect(result).toEqual([]);
    });
  });

  describe('single file diff parsing', () => {
    test('should parse simple addition', () => {
      const diff = `diff --git a/test.js b/test.js
index 1234567..abcdefg 100644
--- a/test.js
+++ b/test.js
@@ -1,3 +1,4 @@
 const a = 1;
+const b = 2;
 const c = 3;
 const d = 4;`;

      const result = parseDiff(diff);
      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('test.js');
      expect(result[0].changes).toHaveLength(4);
      
      expect(result[0].changes[0]).toEqual({
        content: ' const a = 1;',
        type: 'context',
        lineNumber: 1
      });
      
      expect(result[0].changes[1]).toEqual({
        content: '+const b = 2;',
        type: 'addition',
        lineNumber: 2
      });
    });

    test('should parse simple deletion', () => {
      const diff = `diff --git a/test.js b/test.js
index 1234567..abcdefg 100644
--- a/test.js
+++ b/test.js
@@ -1,4 +1,3 @@
 const a = 1;
-const b = 2;
 const c = 3;
 const d = 4;`;

      const result = parseDiff(diff);
      expect(result).toHaveLength(1);
      expect(result[0].changes[1]).toEqual({
        content: '-const b = 2;',
        type: 'deletion',
        lineNumber: 2
      });
    });

    test('should parse mixed additions and deletions', () => {
      const diff = `diff --git a/calculator.js b/calculator.js
index abc123..def456 100644
--- a/calculator.js
+++ b/calculator.js
@@ -1,6 +1,7 @@
 function add(a, b) {
-  return a + b;
+  // Validate inputs
+  return Number(a) + Number(b);
 }
 
 function subtract(a, b) {
   return a - b;
 }`;

      const result = parseDiff(diff);
      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('calculator.js');
      expect(result[0].changes).toHaveLength(9);
      
      // Check deletion
      expect(result[0].changes[1]).toEqual({
        content: '-  return a + b;',
        type: 'deletion',
        lineNumber: 2
      });
      
      // Check additions
      expect(result[0].changes[2]).toEqual({
        content: '+  // Validate inputs',
        type: 'addition',
        lineNumber: 2
      });
      
      expect(result[0].changes[3]).toEqual({
        content: '+  return Number(a) + Number(b);',
        type: 'addition',
        lineNumber: 3
      });
    });
  });

  describe('multiple file diff parsing', () => {
    test('should parse multiple files', () => {
      const diff = `diff --git a/file1.js b/file1.js
index 123..456 100644
--- a/file1.js
+++ b/file1.js
@@ -1,2 +1,3 @@
 const x = 1;
+const y = 2;
 const z = 3;
diff --git a/file2.js b/file2.js
index 789..abc 100644
--- a/file2.js
+++ b/file2.js
@@ -1,3 +1,2 @@
 const a = 'hello';
-const b = 'world';
 const c = 'test';`;

      const result = parseDiff(diff);
      expect(result).toHaveLength(2);
      
      expect(result[0].filename).toBe('file1.js');
      expect(result[0].changes).toHaveLength(3);
      
      expect(result[1].filename).toBe('file2.js');
      expect(result[1].changes).toHaveLength(3);
    });
  });

  describe('multiple hunks in single file', () => {
    test('should parse multiple hunks correctly', () => {
      const diff = `diff --git a/app.js b/app.js
index 123..456 100644
--- a/app.js
+++ b/app.js
@@ -1,3 +1,4 @@
 const express = require('express');
+const cors = require('cors');
 const app = express();
 
@@ -10,6 +11,7 @@
 app.get('/', (req, res) => {
   res.send('Hello World!');
 });
+app.use(cors());
 
 app.listen(3000);`;

      const result = parseDiff(diff);
      expect(result).toHaveLength(2); // Two hunks for the same file
      
      expect(result[0].filename).toBe('app.js');
      expect(result[0].changes).toHaveLength(4);
      expect(result[0].changes[1].content).toBe('+const cors = require(\'cors\');');
      
      expect(result[1].filename).toBe('app.js');
      expect(result[1].changes).toHaveLength(6);
      expect(result[1].changes[3].content).toBe('+app.use(cors());');
    });
  });

  describe('edge cases', () => {
    test('should handle files with complex paths', () => {
      const diff = `diff --git a/src/components/Header/Header.jsx b/src/components/Header/Header.jsx
index 123..456 100644
--- a/src/components/Header/Header.jsx
+++ b/src/components/Header/Header.jsx
@@ -1,2 +1,3 @@
 import React from 'react';
+import './Header.css';
 export default Header;`;

      const result = parseDiff(diff);
      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('src/components/Header/Header.jsx');
    });

    test('should handle empty lines and whitespace', () => {
      const diff = `diff --git a/test.js b/test.js
index 123..456 100644
--- a/test.js
+++ b/test.js
@@ -1,4 +1,5 @@
 function test() {
+
   console.log('test');
+  
 }`;

      const result = parseDiff(diff);
      expect(result).toHaveLength(1);
      expect(result[0].changes).toHaveLength(5);
      expect(result[0].changes[1].content).toBe('+');
      expect(result[0].changes[3].content).toBe('+  ');
    });

    test('should handle binary files indicator', () => {
      const diff = `diff --git a/image.png b/image.png
index 123..456 100644
--- a/image.png
+++ b/image.png
Binary files differ`;

      const result = parseDiff(diff);
      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('image.png');
      expect(result[0].changes).toHaveLength(1);
      expect(result[0].changes[0].content).toBe('Binary files differ');
    });
  });

  describe('line number calculation', () => {
    test('should calculate correct line numbers for additions', () => {
      const diff = `diff --git a/test.js b/test.js
index 123..456 100644
--- a/test.js
+++ b/test.js
@@ -5,6 +5,8 @@
 line 5
 line 6
 line 7
+line 7.5
+line 7.6
 line 8
 line 9
 line 10`;

      const result = parseDiff(diff);
      expect(result[0].changes[3].lineNumber).toBe(8); // First addition at line 8
      expect(result[0].changes[4].lineNumber).toBe(9); // Second addition at line 9
      expect(result[0].changes[5].lineNumber).toBe(10); // Context line after additions
    });

    test('should handle complex hunk header parsing', () => {
      const diff = `diff --git a/test.js b/test.js
index 123..456 100644
--- a/test.js
+++ b/test.js
@@ -100,10 +100,12 @@ function complexFunction() {
 // existing code
+// new comment 1
 more existing code
+// new comment 2
 final existing code`;

      const result = parseDiff(diff);
      expect(result[0].hunkHeader.oldStart).toBe(103);
      expect(result[0].hunkHeader.newStart).toBe(105);
      
      // First addition should be at line 101
      expect(result[0].changes[1].lineNumber).toBe(101);
      // Second addition should be at line 103
      expect(result[0].changes[3].lineNumber).toBe(103);
    });
  });
});
