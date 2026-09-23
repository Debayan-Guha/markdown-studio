/**
 * Markdown Studio - Client-Side Logic
 * Handles marked.js configuration, DOMPurify sanitization, debounce rendering,
 * syntax highlighting, copy-to-clipboard functionality, custom font scaling, and exports.
 */

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================================
    // 1. DOM Element References
    // ==========================================================
    const markdownInput = document.getElementById('markdown-input');
    const previewOutput = document.getElementById('preview-output');
    const charCount = document.getElementById('char-count');
    const fontSizeInput = document.getElementById('font-size-input');
    const btnClear = document.getElementById('btn-clear');
    const btnSample = document.getElementById('btn-sample');
    const btnExportHtml = document.getElementById('btn-export-html');
    const btnExportPdf = document.getElementById('btn-export-pdf');
    const resizer = document.getElementById('resizer');
    const editorPane = markdownInput.closest('.pane');

    // ==========================================================
    // 2. Default Sample Markdown
    // ==========================================================
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

    // ==========================================================
    // 3. Marked.js Configuration
    // ==========================================================
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

    // ==========================================================
    // 4. Core Rendering Functions
    // ==========================================================
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

        charCount.textContent = `${markdownText.length.toLocaleString()} chars`;

        const rawHtml = marked.parse(markdownText);
        const cleanHtml = DOMPurify.sanitize(rawHtml, {
            ADD_ATTR: ['target', 'rel']
        });

        previewOutput.innerHTML = cleanHtml;

        const links = previewOutput.querySelectorAll('a');
        links.forEach(link => {
            if (link.hostname !== window.location.hostname && !link.getAttribute('target')) {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            }
        });

        enhanceCodeBlocks(previewOutput);
    }

    function enhanceCodeBlocks(container) {
        const preElements = container.querySelectorAll('pre');
        preElements.forEach(pre => {
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
                    fallbackCopyText(textToCopy, copyBtn);
                }
            });

            wrapper.appendChild(copyBtn);
        });
    }

    function showCopiedFeedback(btn) {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.textContent = 'Copy';
            btn.classList.remove('copied');
        }, 2000);
    }

    function fallbackCopyText(text, btn) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showCopiedFeedback(btn);
            }
        } catch (err) {
            console.error('Fallback copy error:', err);
        }
        document.body.removeChild(textarea);
    }

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // ==========================================================
    // 5. Event Listeners & User Interactions
    // ==========================================================
    const handleInputDebounced = debounce(() => {
        renderMarkdown(markdownInput.value);
    }, 150);

    markdownInput.addEventListener('input', handleInputDebounced);

    fontSizeInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && val >= 6 && val <= 200) {
            previewOutput.style.fontSize = `${val}px`;
        }
    });

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

    // ==========================================================
    // 6. Export Features (HTML & PDF)
    // ==========================================================
    btnExportHtml.addEventListener('click', () => {
        const markdownText = markdownInput.value;
        const currentSizeVal = parseFloat(fontSizeInput.value) || 15;
        const currentFontSize = `${currentSizeVal}px`;
        const rawHtml = marked.parse(markdownText);
        const cleanHtml = DOMPurify.sanitize(rawHtml, { ADD_ATTR: ['target', 'rel'] });

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
            font-size: ${currentFontSize};
        }
        @media (max-width: 767px) {
            body { padding: 15px; }
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

    btnExportPdf.addEventListener('click', () => {
        const renderedHtml = previewOutput.innerHTML;
        const currentSizeVal = parseFloat(fontSizeInput.value) || 15;
        const currentFontSize = `${currentSizeVal}px`;

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Markdown PDF Export</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.0/github-markdown-light.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
    <style>
        @page {
            size: A4;
            margin: 18mm 15mm 18mm 15mm;
        }
        html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
        }
        .markdown-body {
            box-sizing: border-box;
            width: 100%;
            max-width: 100%;
            padding: 0;
            margin: 0;
            font-size: ${currentFontSize};
            line-height: 1.55;
            color: #24292e;
        }
        pre, blockquote, table, tr, img, .code-block-wrapper {
            page-break-inside: avoid;
            break-inside: avoid;
        }
        h1, h2, h3, h4, h5, h6 {
            page-break-after: avoid;
            break-after: avoid;
        }
        .code-block-wrapper {
            position: relative;
            margin-bottom: 16px;
        }
        .code-block-wrapper pre {
            margin: 0;
            border-radius: 6px;
            border: 1px solid #e1e4e8;
        }
        .copy-code-btn {
            display: none !important;
        }
        img {
            max-width: 100%;
            height: auto;
        }
        .empty-state {
            display: none !important;
        }
    </style>
</head>
<body class="markdown-body">
${renderedHtml}
</body>
</html>`);
        doc.close();

        iframe.onload = () => {
            setTimeout(() => {
                try {
                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();
                } catch (err) {
                    console.error('Print failed:', err);
                }
                setTimeout(() => {
                    if (iframe.parentNode) {
                        iframe.parentNode.removeChild(iframe);
                    }
                }, 3000);
            }, 300);
        };
    });

    // ==========================================================
    // 7. Split-Pane Resizer Logic
    // ==========================================================
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

    // ==========================================================
    // 8. Initialization
    // ==========================================================
    markdownInput.value = sampleMarkdown;
    renderMarkdown(sampleMarkdown);
});

// ==========================================================
// 9. Inspection Protection Protections
// ==========================================================
document.addEventListener('contextmenu', event => event.preventDefault());

document.addEventListener('keydown', event => {
    if (
        event.key === 'F12' ||
        (event.ctrlKey && event.shiftKey && (event.key === 'I' || event.key === 'J' || event.key === 'C')) ||
        (event.ctrlKey && event.key === 'U')
    ) {
        event.preventDefault();
        alert('Inspection is disabled for this application.');
    }
});