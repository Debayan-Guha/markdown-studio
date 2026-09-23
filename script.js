/**
 * Markdown Studio - Client-Side Logic
 * Handles marked.js configuration, DOMPurify sanitization, debounce rendering,
 * syntax highlighting, copy-to-clipboard functionality, and standalone HTML/PDF exports.
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Element references
    const markdownInput = document.getElementById('markdown-input');
    const previewOutput = document.getElementById('preview-output');
    const charCount = document.getElementById('char-count');
    const btnClear = document.getElementById('btn-clear');
    const btnSample = document.getElementById('btn-sample');
    const btnExportHtml = document.getElementById('btn-export-html');
    const btnExportPdf = document.getElementById('btn-export-pdf');
    const resizer = document.getElementById('resizer');
    const editorPane = markdownInput.closest('.pane');

    // Default sample markdown demonstrating all GFM features requested
    const sampleMarkdown = `# Markdown Studio — GFM Showcase

Welcome to **Markdown Studio**, a fully client-side GFM editor and converter. Below is a comprehensive sample demonstrating all supported syntax features.

---

## 1. Typography & Formatting
You can write text in **bold**, *italic*, ***bold italic***, or ~~strikethrough~~. You can also use inline code like \`const x = 42;\`.

Escaped characters work as expected: \\*not italic\\*, \\# not a heading.

---

## 2. Lists & Task Lists
### Unordered List
* Item one with a subitem
  * Nested bullet point A
  * Nested bullet point B
* Item two

### Ordered List
1. First step in the workflow
2. Second step with verification
3. Final deployment stage

### Task List
- [x] Configure marked.js and highlight.js
- [x] Implement robust DOMPurify sanitization
- [ ] Add real-time sync across devices (Local-only app)

---

## 3. Blockquotes
> "Software engineering is as much about managing complexity as it is about writing code."
> > Nested blockquotes are also fully supported for side notes or warnings.

---

## 4. Tables (GFM Pipe Tables)
| Feature | Status | CDN Source |
| :--- | :---: | ---: |
| GFM Parser | Ready | marked.js v12 |
| Sanitization | Active | DOMPurify v3 |
| Highlighting | Enabled | highlight.js v11 |

---

## 5. Code Blocks with Syntax Highlighting

### JavaScript Example
\`\`\`javascript
/**
 * Calculates Fibonacci numbers recursively with memoization.
 */
function fibonacci(n, memo = {}) {
    if (n <= 1) return n;
    if (memo[n]) return memo[n];
    return memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);
}

console.log("Result for 10:", fibonacci(10));
\`\`\`

### Python Example
\`\`\`python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)

print(quicksort([3, 6, 8, 10, 1, 2, 1]))
\`\`\`

---

## 6. Links, Autolinks & Images
* [Visit GitHub](https://github.com) (Opens securely in a new tab)
* Autolink test: https://google.com
* Inline Image reference:
  ![GitHub Logo](https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png)

---

## 7. Footnotes & Horizontal Rules
Here is some text referencing a footnote[^1].

[^1]: This is the detailed footnote explanatory text rendered at the bottom of the document.
`;

    /**
     * Configure marked.js with GFM options and highlight.js integration
     */
    marked.setOptions({
        gfm: true,
        breaks: true,
        headerIds: true,
        mangle: false,
        highlight: function(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return hljs.highlight(code, { language: lang }).value;
                } catch (e) {
                    console.warn('Highlight.js error:', e);
                }
            }
            return hljs.highlightAuto(code).value;
        }
    });

    /**
     * Renders raw markdown string into sanitized, interactive HTML preview.
     * @param {string} markdownText 
     */
    function renderMarkdown(markdownText) {
        if (!markdownText || markdownText.trim() === '') {
            previewOutput.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    <p>Nothing to preview yet.<br>Type in the editor or click "Load Sample".</p>
                </div>
            `;
            charCount.textContent = '0 chars';
            return;
        }

        // Update character count
        charCount.textContent = `${markdownText.length.toLocaleString()} chars`;

        // Parse Markdown to raw HTML via marked.js
        const rawHtml = marked.parse(markdownText);

        // Sanitize HTML using DOMPurify to prevent XSS attacks while retaining safe tags/attributes
        const cleanHtml = DOMPurify.sanitize(rawHtml, {
            ADD_ATTR: ['target', 'rel'] // Allow target="_blank" for safe external links
        });

        previewOutput.innerHTML = cleanHtml;

        // Post-processing 1: Ensure all external links open securely in a new tab
        const links = previewOutput.querySelectorAll('a');
        links.forEach(link => {
            if (link.hostname !== window.location.hostname && !link.getAttribute('target')) {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            }
        });

        // Post-processing 2: Inject copy buttons into rendered code blocks
        enhanceCodeBlocks(previewOutput);
    }

    /**
     * Wraps <pre><code> blocks with a wrapper div and appends a hover-to-copy button.
     * Works identically in the live preview and in exported HTML files.
     * @param {HTMLElement} container 
     */
    function enhanceCodeBlocks(container) {
        const preElements = container.querySelectorAll('pre');
        preElements.forEach(pre => {
            // Avoid double wrapping if already enhanced
            if (pre.parentNode.classList && pre.parentNode.classList.contains('code-block-wrapper')) {
                return;
            }

            const wrapper = document.createElement('div');
            wrapper.className = 'code-block-wrapper';
            pre.parentNode.insertBefore(wrapper, pre);
            wrapper.appendChild(pre);

            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-code-btn';
            copyBtn.type = 'button';
            copyBtn.textContent = 'Copy';

            copyBtn.addEventListener('click', async () => {
                const codeEl = pre.querySelector('code') || pre;
                const textToCopy = codeEl.innerText;

                try {
                    await navigator.clipboard.writeText(textToCopy);
                    showCopiedFeedback(copyBtn);
                } catch (err) {
                    // Fallback for older browsers or restricted iframe contexts
                    fallbackCopyText(textToCopy, copyBtn);
                }
            });

            wrapper.appendChild(copyBtn);
        });
    }

    /**
     * Displays temporary "Copied!" feedback state on the copy button.
     * @param {HTMLButtonElement} btn 
     */
    function showCopiedFeedback(btn) {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.textContent = 'Copy';
            btn.classList.remove('copied');
        }, 2000);
    }

    /**
     * Fallback copy method using temporary textarea and execCommand.
     * @param {string} text 
     * @param {HTMLButtonElement} btn 
     */
    function fallbackCopyText(text, btn) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed'; // Avoid scrolling to bottom
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showCopiedFeedback(btn);
            } else {
                console.error('Fallback copy command failed.');
            }
        } catch (err) {
            console.error('Fallback copy error:', err);
        }
        document.body.removeChild(textarea);
    }

    /**
     * Debounce helper to optimize live rendering performance on typing.
     * @param {Function} func 
     * @param {number} wait 
     */
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Live typing event listener with ~150ms debounce
    const handleInputDebounced = debounce(() => {
        renderMarkdown(markdownInput.value);
    }, 150);

    markdownInput.addEventListener('input', handleInputDebounced);

    // Toolbar button actions
    btnClear.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the editor?')) {
            markdownInput.value = '';
            renderMarkdown('');
            markdownInput.focus();
        }
    });

    btnSample.addEventListener('click', () => {
        markdownInput.value = sampleMarkdown;
        renderMarkdown(sampleMarkdown);
        markdownInput.focus();
    });

    // Standalone HTML Export feature
    btnExportHtml.addEventListener('click', () => {
        const markdownText = markdownInput.value;
        const rawHtml = marked.parse(markdownText);
        const cleanHtml = DOMPurify.sanitize(rawHtml, { ADD_ATTR: ['target', 'rel'] });

        // Construct a complete, standalone .html document with inlined GitHub Markdown CSS & copy script
        const standaloneDoc = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown Export</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.0/github-markdown-light.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
    <style>
        body {
            background-color: #ffffff;
            padding: 40px;
        }
        .markdown-body {
            box-sizing: border-box;
            min-width: 200px;
            max-width: 980px;
            margin: 0 auto;
        }
        @media (max-width: 767px) {
            body { padding: 15px; }
            .markdown-body { font-size: 14px; }
        }
        .code-block-wrapper {
            position: relative;
            margin-bottom: 16px;
        }
        .code-block-wrapper pre {
            margin-top: 0;
            margin-bottom: 0;
            border-radius: 6px;
        }
        .copy-code-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            background: rgba(255, 255, 255, 0.9);
            border: 1px solid rgba(27, 31, 35, 0.15);
            color: #24292e;
            font-size: 11px;
            font-weight: 500;
            padding: 3px 8px;
            border-radius: 4px;
            cursor: pointer;
            opacity: 0;
            transition: opacity 0.15s ease-in-out, background-color 0.15s;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .code-block-wrapper:hover .copy-code-btn {
            opacity: 1;
        }
        .copy-code-btn:hover {
            background-color: #f3f4f6;
            border-color: rgba(27, 31, 35, 0.3);
        }
        .copy-code-btn.copied {
            background-color: #28a745;
            color: #ffffff;
            border-color: #28a745;
            opacity: 1;
        }
        .export-footer {
            margin-top: 40px;
            border-top: 1px solid #e1e4e8;
            padding-top: 20px;
            text-align: center;
            font-size: 0.8rem;
            color: #586069;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
        }
    </style>
</head>
<body class="markdown-body">
${cleanHtml}
<div class="export-footer">
    <p>Markdown Studio &bull; CREATED BY <strong>DEBAYAN GUHA</strong></p>
</div>
<script>
    // Self-contained copy button logic for exported standalone HTML
    document.addEventListener('DOMContentLoaded', () => {
        const preElements = document.querySelectorAll('pre');
        preElements.forEach(pre => {
            const wrapper = document.createElement('div');
            wrapper.className = 'code-block-wrapper';
            pre.parentNode.insertBefore(wrapper, pre);
            wrapper.appendChild(pre);

            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-code-btn';
            copyBtn.type = 'button';
            copyBtn.textContent = 'Copy';

            copyBtn.addEventListener('click', async () => {
                const codeEl = pre.querySelector('code') || pre;
                try {
                    await navigator.clipboard.writeText(codeEl.innerText);
                    copyBtn.textContent = 'Copied!';
                    copyBtn.classList.add('copied');
                    setTimeout(() => {
                        copyBtn.textContent = 'Copy';
                        copyBtn.classList.remove('copied');
                    }, 2000);
                } catch (err) {
                    console.error('Clipboard copy failed', err);
                }
            });
            wrapper.appendChild(copyBtn);
        });
    });
</script>
</body>
</html>`;

        // Trigger browser download of .html file
        const blob = new Blob([standaloneDoc], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'document.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // PDF Export feature (Triggers browser print dialog optimized via print CSS)
    btnExportPdf.addEventListener('click', () => {
        window.print();
    });

    // Split-pane resizer mouse interaction
    let isResizing = false;
    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        resizer.classList.add('active');
        document.body.style.cursor = 'col-resize';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const totalWidth = window.innerWidth;
        const leftWidth = e.clientX;
        const percentage = (leftWidth / totalWidth) * 100;
        
        if (percentage > 15 && percentage < 85) {
            editorPane.style.flex = `0 0 ${percentage}%`;
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            resizer.classList.remove('active');
            document.body.style.cursor = 'default';
        }
    });

    // Initialization: Load sample markdown by default so user immediately sees preview
    markdownInput.value = sampleMarkdown;
    renderMarkdown(sampleMarkdown);
});
