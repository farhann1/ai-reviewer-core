// Sample diff fixtures for testing

const simpleDiff = `diff --git a/src/calculator.js b/src/calculator.js
index abc123..def456 100644
--- a/src/calculator.js
+++ b/src/calculator.js
@@ -1,6 +1,9 @@
 function add(a, b) {
-  return a + b;
+  // Input validation
+  if (typeof a !== 'number' || typeof b !== 'number') {
+    throw new Error('Inputs must be numbers');
+  }
+  return a + b;
 }
 
 function subtract(a, b) {`;

const multipleDiff = `diff --git a/src/auth.js b/src/auth.js
index 111..222 100644
--- a/src/auth.js
+++ b/src/auth.js
@@ -1,4 +1,6 @@
 const jwt = require('jsonwebtoken');
+const bcrypt = require('bcrypt');
+const rateLimit = require('express-rate-limit');
 
 function generateToken(user) {
   return jwt.sign(
diff --git a/src/routes.js b/src/routes.js
index 333..444 100644
--- a/src/routes.js
+++ b/src/routes.js
@@ -5,7 +5,10 @@
 
 app.post('/login', (req, res) => {
   const { username, password } = req.body;
-  // TODO: Add validation
+  
+  if (!username || !password) {
+    return res.status(400).json({ error: 'Missing credentials' });
+  }
   
   const token = generateToken({ username });
   res.json({ token });`;

const complexDiff = `diff --git a/src/components/UserProfile.jsx b/src/components/UserProfile.jsx
index aaa111..bbb222 100644
--- a/src/components/UserProfile.jsx
+++ b/src/components/UserProfile.jsx
@@ -1,12 +1,23 @@
 import React, { useState, useEffect } from 'react';
+import { toast } from 'react-toastify';
+import { validateEmail, validatePhone } from '../utils/validation';
 
 const UserProfile = ({ userId }) => {
   const [user, setUser] = useState(null);
+  const [loading, setLoading] = useState(false);
+  const [errors, setErrors] = useState({});
 
   useEffect(() => {
+    setLoading(true);
     fetch(\`/api/users/\${userId}\`)
       .then(res => res.json())
-      .then(setUser);
+      .then(data => {
+        setUser(data);
+        setLoading(false);
+      })
+      .catch(err => {
+        toast.error('Failed to load user data');
+        setLoading(false);
+      });
   }, [userId]);
 
   return (`;

const binaryDiff = `diff --git a/assets/logo.png b/assets/logo.png
index old123..new456 100644
--- a/assets/logo.png
+++ b/assets/logo.png
Binary files differ`;

const noChangesDiff = `diff --git a/README.md b/README.md
index 123..123 100644
--- a/README.md
+++ b/README.md`;

module.exports = {
  simpleDiff,
  multipleDiff,
  complexDiff,
  binaryDiff,
  noChangesDiff
};
