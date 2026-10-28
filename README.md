# Overview

As a software engineer, I am continually working to deepen my mastery of functional programming patterns, recursive data processing, and resilient error handling in modern JavaScript. Building software that operates seamlessly across both client-side browser environments and server-side Node.js runtimes allows me to strengthen my understanding of universal JavaScript architecture and asynchronous data flows.

I built the **JavaScript Hierarchical Data Analytics & Processing Tool (`js-data-analytics-tool`)**, an application that traverses deeply nested media catalog hierarchies (such as movies and books organized into multi-level subcategories), fetches remote configuration metadata, validates incoming records, and computes statistical summaries. The software renders an interactive analytics dashboard in the browser by dynamically creating DOM structures styled with CSS, while also supporting formatted console output in the Node.js terminal.

My purpose for writing this software was to combine JavaScript's core functional capabilities—specifically native ES6 array methods (`map`, `filter`, `reduce`, `sort`, `every`, and `some`), recursion for tree traversal, external library integration, and custom exception handling (`try-catch` and `throw`)—into a practical, unified data analytics pipeline.

[Software Demo Video](https://youtu.be/uKY7H_F79d8)

# Development Environment

I developed this software using Visual Studio Code as my primary code editor, running on macOS with Node.js (v22.x), npm (v10.x), and a modern web browser (Google Chrome) for testing both terminal execution and client-side DOM rendering.

The application is written in JavaScript (ES6+) alongside HTML5 and CSS3 for the browser interface. It integrates the external `axios` library (loaded via npm in Node.js and jsDelivr CDN in the browser) to perform asynchronous HTTP requests and handle remote API responses.

# Useful Websites

- [MDN Web Docs — JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)
- [MDN Web Docs — Array Reference (map, filter, reduce)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)
- [MDN Web Docs — Control Flow and Error Handling](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling)
- [MDN Web Docs — Document Object Model (DOM)](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model)
- [Axios Official Documentation](https://axios-http.com/docs/intro)

# Future Work

- Persist user-added test records and custom filter settings in the browser using `localStorage`.
- Add export functionality to download the aggregated analytics summary and sanitized datasets as `.csv` or `.json` files.
- Implement an automated unit test suite to verify edge cases in the recursive tree traversal and custom exception validation functions.
