/**
 * Parses a Git diff string into structured hunks for each file.
 * @param {string} diff - The Git diff string.
 * @returns {Array} Array of parsed hunks.
 */
function parseDiff(diff) {
    if (!diff || typeof diff !== 'string') {
        throw new Error('Invalid diff input: expected non-empty string');
    }

    const lines = diff.split('\n');
    const hunks = [];
    let currentHunk = [];
    let currentFile = '';
    let currentHunkHeader = null;
    let lineCounters = null;

    for (const line of lines) {
        if (line.startsWith('diff --git')) {
            if (currentHunk.length > 0) {
                hunks.push({ 
                    changes: currentHunk, 
                    filename: currentFile,
                    hunkHeader: currentHunkHeader 
                });
            }
            currentHunk = [];
            currentFile = line.slice(11).split(' ')[0].slice(2);
            currentHunkHeader = null;
            lineCounters = null;
            continue;
        }

        // Capture hunk header (e.g., @@ -1,7 +1,9 @@)
        if (line.startsWith('@@')) {
            if (currentHunk.length > 0) {
                hunks.push({ 
                    changes: currentHunk, 
                    filename: currentFile,
                    hunkHeader: currentHunkHeader 
                });
                currentHunk = [];
            }
            currentHunkHeader = parseHunkHeader(line);
            lineCounters = currentHunkHeader ? {
                oldLine: currentHunkHeader.oldStart,
                newLine: currentHunkHeader.newStart
            } : null;
            continue;
        }

        if (line.startsWith('index') || line.startsWith('---') || line.startsWith('+++')) {
            continue;
        }

        const lineInfo = calculateLineNumber(line, lineCounters);
        currentHunk.push({
            content: line,
            type: line[0] === '+' ? 'addition' : line[0] === '-' ? 'deletion' : 'context',
            lineNumber: lineInfo
        });
    }

    if (currentHunk.length > 0) {
        hunks.push({ 
            changes: currentHunk, 
            filename: currentFile,
            hunkHeader: currentHunkHeader 
        });
    }

    return hunks;
}

function parseHunkHeader(header) {
    // Parse @@ -1,7 +1,9 @@ format
    const match = header.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (!match) {return null;}
    
    return {
        oldStart: parseInt(match[1], 10),
        newStart: parseInt(match[2], 10)
    };
}

function calculateLineNumber(line, lineCounters) {
    if (!lineCounters) {
        return null;
    }
    
    // For added lines ('+'), return the new file line number
    if (line.startsWith('+')) {
        return lineCounters.newLine++;
    }
    // For removed lines ('-'), return the old file line number
    else if (line.startsWith('-')) {
        return lineCounters.oldLine++;
    }
    // For context lines ' ', increment both and return new line number
    else {
        lineCounters.oldLine++;
        return lineCounters.newLine++;
    }
}

module.exports = parseDiff;
