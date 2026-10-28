/**
 * JavaScript Hierarchical Data Analytics & Processing Tool (js-data-analytics-tool)
 * Module 3: JavaScript (Universal: Runs in both Node.js Terminal and Browser DOM)
 *
 * Implemented Requirements:
 * 1. Use an external JavaScript library (axios via npm in Node.js / CDN in Browser)
 * 2. Implement Recursion (tree traversal, leaf item collection, depth calculation, recursive DOM rendering)
 * 3. Use Native Array ES6 functions (map, filter, reduce, sort, some, every)
 * 4. Stretch Challenge 1: Throwing and handling exceptions (throw new Error / try-catch)
 * 5. Stretch Challenge 2: Create DOM structures with CSS (when running in Browser)
 * 6. Display formatted output to the screen (Browser HTML/CSS & Node.js Terminal)
 */

const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

// Load external library `axios` (from window in Browser, or require in Node.js with built-in https fallback)
let httpClient;
if (isBrowser && window.axios) {
  httpClient = window.axios;
} else if (!isBrowser) {
  try {
    httpClient = require("axios");
  } catch {
    // Fallback HTTP client using Node's built-in https module so the script runs even before `npm install`
    const https = require("https");
    httpClient = {
      get: (url, options = {}) =>
        new Promise((resolve, reject) => {
          const req = https.get(url, { timeout: options.timeout || 2500 }, (res) => {
            let raw = "";
            res.on("data", (chunk) => (raw += chunk));
            res.on("end", () => {
              try {
                resolve({ status: res.statusCode, data: JSON.parse(raw) });
              } catch {
                resolve({ status: res.statusCode, data: raw });
              }
            });
          });
          req.on("error", reject);
          req.on("timeout", () => {
            req.destroy(new Error("Request timed out"));
          });
        })
    };
  }
} else {
  // Browser fallback using fetch with AbortController timeout if CDN is offline
  httpClient = {
    get: async (url, options = {}) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.timeout || 2500);
      try {
        const response = await fetch(url, { signal: controller.signal });
        const data = await response.json();
        return { status: response.status, data };
      } finally {
        clearTimeout(timer);
      }
    }
  };
}

// Load catalog data in both Browser and Node.js environments without global const collisions
const catalogSource = isBrowser
  ? window.CatalogData
  : require("./data/catalog");
const mediaCatalog = catalogSource.mediaCatalog;
const rawIncomingRecords = catalogSource.rawIncomingRecords;

// ============================================================================
// 1. Custom Exception Classes & Validation Functions (Stretch Challenge)
// ============================================================================

class ApiEndpointError extends Error {
  constructor(message, endpoint) {
    super(message);
    this.name = "ApiEndpointError";
    this.endpoint = endpoint;
  }
}

class DataValidationError extends Error {
  constructor(message, recordId, field) {
    super(message);
    this.name = "DataValidationError";
    this.recordId = recordId;
    this.field = field;
  }
}

/**
 * Validates a single media record and intentionally throws a custom exception if invalid.
 * @param {Object} record The media record to validate
 * @returns {Object} The validated record
 */
function validateMediaRecord(record) {
  if (!record || typeof record !== "object") {
    throw new DataValidationError("Record object is missing or invalid.", "UNKNOWN", "record");
  }
  if (!record.title || record.title.trim() === "") {
    throw new DataValidationError(
      `Title is empty or undefined (ID: ${record.id})`,
      record.id,
      "title"
    );
  }
  if (typeof record.rating !== "number" || Number.isNaN(record.rating) || record.rating < 0 || record.rating > 5.0) {
    throw new DataValidationError(
      `Rating score is out of valid range [0.0 - 5.0]: ${record.rating} (ID: ${record.id})`,
      record.id,
      "rating"
    );
  }
  if (typeof record.price !== "number" || Number.isNaN(record.price) || record.price < 0) {
    throw new DataValidationError(
      `Negative price detected: $${record.price} (ID: ${record.id})`,
      record.id,
      "price"
    );
  }
  return record;
}

/**
 * Validates an array of records, safely catching exceptions via try-catch and applying fallback values.
 * @param {Array} records Array of incoming records to validate
 * @returns {Object} Object containing validRecords and errorLogs
 */
function sanitizeIncomingRecords(records) {
  const validRecords = [];
  const errorLogs = [];

  for (const record of records) {
    try {
      const validated = validateMediaRecord(record);
      validRecords.push({ ...validated, isFallback: false });
    } catch (error) {
      errorLogs.push({
        recordId: error.recordId || "N/A",
        errorType: error.name,
        field: error.field || "unknown",
        message: error.message
      });

      // Generate and apply fallback record data when an exception is caught
      const fallbackRecord = {
        id: record.id || "FALLBACK-ID",
        title: record.title && record.title.trim() !== "" ? record.title : `[Fallback Title ${record.id}]`,
        rating:
          typeof record.rating === "number" && !Number.isNaN(record.rating)
            ? Math.min(5.0, Math.max(0.0, record.rating))
            : 3.0,
        price:
          typeof record.price === "number" && !Number.isNaN(record.price) && record.price >= 0
            ? record.price
            : 0.0,
        isFallback: true
      };
      validRecords.push(fallbackRecord);
    }
  }

  return { validRecords, errorLogs };
}

// ============================================================================
// 2. Data Fetching & Fallback Using External Library (axios)
// ============================================================================

/**
 * Simulates and executes remote API data fetching using axios.
 * Throws and catches exceptions for invalid URLs or network errors, returning fallback data.
 * @param {string} url Target endpoint URL
 * @returns {Promise<Object>} Fetch result and metadata
 */
async function fetchRemoteCatalogMetadata(url) {
  try {
    // Pre-validate URL format (intentionally throw custom exception for insecure/invalid endpoints)
    if (!url || !url.startsWith("https://")) {
      throw new ApiEndpointError(
        `Invalid API endpoint format. HTTPS URL is required: "${url}"`,
        url
      );
    }

    const response = await httpClient.get(url, { timeout: 2500 });
    return {
      source: "Remote API (axios)",
      status: response.status,
      errorHandled: null,
      data: response.data
    };
  } catch (error) {
    const reason =
      error instanceof ApiEndpointError
        ? `[Custom Exception] ${error.message}`
        : `[Network/HTTP Exception] ${error.message}`;

    return {
      source: "Local Fallback Cache (Recovered from Exception)",
      status: "FALLBACK_200",
      errorHandled: reason,
      data: {
        catalogVersion: "2026.3.0-local",
        currency: "USD",
        taxRate: 0.1
      }
    };
  }
}

// ============================================================================
// 3. Hierarchy Tree Traversal & Data Collection Using Recursion
// ============================================================================

/**
 * [Recursive Function 1] Recursively traverses the nested category tree
 * and collects all leaf items into a flat array with their category path attached.
 *
 * @param {Object} categoryNode Current category node
 * @param {Array<string>} currentPath Category breadcrumb path from the root
 * @returns {Array<Object>} Flattened array of all collected items
 */
function collectAllItemsRecursively(categoryNode, currentPath = []) {
  const updatedPath = [...currentPath, categoryNode.categoryName];

  // Attach category path metadata to items directly under the current category
  const currentItems = (categoryNode.items || []).map((item) => ({
    ...item,
    categoryPath: updatedPath.slice(1).join(" > ") || "Root",
    topCategory: updatedPath[1] || categoryNode.categoryName
  }));

  // Base Case: If no subcategories exist, return the current items
  if (!categoryNode.subcategories || categoryNode.subcategories.length === 0) {
    return currentItems;
  }

  // Recursive Step: Call this function recursively for each subcategory
  const childItems = categoryNode.subcategories.reduce((acc, subCategory) => {
    return acc.concat(collectAllItemsRecursively(subCategory, updatedPath));
  }, []);

  return [...currentItems, ...childItems];
}

/**
 * [Recursive Function 2] Recursively calculates the maximum depth of the category tree.
 *
 * @param {Object} categoryNode Current category node
 * @returns {number} Maximum depth of the tree
 */
function calculateTreeDepth(categoryNode) {
  if (!categoryNode.subcategories || categoryNode.subcategories.length === 0) {
    return 1;
  }
  const childDepths = categoryNode.subcategories.map((sub) => calculateTreeDepth(sub));
  return 1 + Math.max(...childDepths);
}

/**
 * [Recursive Function 3] Recursively builds formatted visual tree strings for terminal display.
 *
 * @param {Object} categoryNode Current category node
 * @param {number} depth Current indentation level
 * @returns {Array<string>} Array of formatted tree display lines
 */
function buildVisualTreeLines(categoryNode, depth = 0) {
  const indent = "  ".repeat(depth);
  const itemCount = (categoryNode.items || []).length;
  const line = `${indent}📂 ${categoryNode.categoryName} (Direct items: ${itemCount})`;

  const subLines = (categoryNode.subcategories || []).reduce((acc, sub) => {
    return acc.concat(buildVisualTreeLines(sub, depth + 1));
  }, []);

  return [line, ...subLines];
}

// ============================================================================
// 4. Data Analytics Using Native Array ES6 Functions (map, filter, reduce, sort, every, some)
// ============================================================================

/**
 * Executes the data transformation, filtering, and aggregation pipeline using ES6 Array methods.
 *
 * @param {Array<Object>} items Array of all collected items
 * @param {number} taxRate Tax rate (e.g., 0.10)
 * @param {number} minRating Minimum rating threshold for filtering (e.g., 4.7)
 * @param {string} categoryFilter Optional category filter ("ALL" or topCategory name)
 * @returns {Object} Analytics summary and processed datasets
 */
function analyzeCatalogWithES6(items, taxRate = 0.1, minRating = 4.7, categoryFilter = "ALL") {
  // 1. Array.prototype.map: Transform items into new objects with taxed prices and rating tiers
  const enrichedItems = items.map((item) => {
    const priceWithTax = Number((item.price * (1 + taxRate)).toFixed(2));
    const tier =
      item.rating >= 4.8
        ? "S (Masterpiece)"
        : item.rating >= 4.5
        ? "A (Recommended)"
        : "B (Standard)";
    return {
      ...item,
      priceWithTax,
      tier
    };
  });

  // 2. Array.prototype.filter: Extract items matching rating and category criteria
  // Combined with Array.prototype.sort to order by highest rating first
  const topRatedItems = enrichedItems
    .filter((item) => {
      const matchesRating = item.rating >= minRating;
      const matchesCategory = categoryFilter === "ALL" || item.topCategory === categoryFilter;
      return matchesRating && matchesCategory;
    })
    .sort((a, b) => b.rating - a.rating || a.price - b.price);

  // 3. Array.prototype.reduce: Compute total price, taxed total, average rating, and per-category breakdown in one pass
  const initialStats = {
    totalCount: 0,
    totalPrice: 0,
    totalPriceWithTax: 0,
    ratingSum: 0,
    highestPricedItem: null,
    categoryBreakdown: {}
  };

  const aggregated = enrichedItems.reduce((acc, item) => {
    acc.totalCount += 1;
    acc.totalPrice += item.price;
    acc.totalPriceWithTax += item.priceWithTax;
    acc.ratingSum += item.rating;

    if (!acc.highestPricedItem || item.price > acc.highestPricedItem.price) {
      acc.highestPricedItem = item;
    }

    const cat = item.topCategory;
    if (!acc.categoryBreakdown[cat]) {
      acc.categoryBreakdown[cat] = { count: 0, subtotalPrice: 0, ratingSum: 0 };
    }
    acc.categoryBreakdown[cat].count += 1;
    acc.categoryBreakdown[cat].subtotalPrice = Number(
      (acc.categoryBreakdown[cat].subtotalPrice + item.price).toFixed(2)
    );
    acc.categoryBreakdown[cat].ratingSum += item.rating;

    return acc;
  }, initialStats);

  // Calculate averages
  const averagePrice =
    aggregated.totalCount > 0
      ? Number((aggregated.totalPrice / aggregated.totalCount).toFixed(2))
      : 0;
  const averageRating =
    aggregated.totalCount > 0
      ? Number((aggregated.ratingSum / aggregated.totalCount).toFixed(2))
      : 0;

  // 4. Array.prototype.every / some: Verify overall dataset properties
  const allItemsHavePositivePrice = enrichedItems.every((item) => item.price > 0);
  const hasMasterpieceItem = enrichedItems.some((item) => item.rating >= 4.9);

  return {
    enrichedItems,
    topRatedItems,
    summary: {
      totalCount: aggregated.totalCount,
      totalPrice: Number(aggregated.totalPrice.toFixed(2)),
      totalPriceWithTax: Number(aggregated.totalPriceWithTax.toFixed(2)),
      averagePrice,
      averageRating,
      highestPricedItem: `${aggregated.highestPricedItem.title} ($${aggregated.highestPricedItem.price})`,
      allItemsHavePositivePrice,
      hasMasterpieceItem
    },
    categoryBreakdown: Object.entries(aggregated.categoryBreakdown).map(([category, stat]) => ({
      Category: category,
      ItemCount: stat.count,
      TotalPriceUSD: `$${stat.subtotalPrice.toFixed(2)}`,
      AverageRating: Number((stat.ratingSum / stat.count).toFixed(2))
    }))
  };
}

// ============================================================================
// 5. Browser DOM Renderer (Create DOM Structures with CSS)
// ============================================================================

/**
 * Helper to create a DOM element with class names and text content.
 */
function createEl(tag, className = "", textContent = "") {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (textContent !== "") el.textContent = textContent;
  return el;
}

/**
 * [Recursive Function 4 - Browser DOM] Recursively creates nested DOM elements
 * representing the category hierarchy tree and its leaf items.
 */
function createRecursiveTreeDOM(categoryNode, depth = 0) {
  const nodeWrapper = createEl("div", "tree-node");
  nodeWrapper.style.marginLeft = `${depth * 18}px`;

  const directCount = (categoryNode.items || []).length;
  const folderLabel = createEl(
    "div",
    "",
    `📂 ${categoryNode.categoryName} (Direct items: ${directCount})`
  );
  folderLabel.style.fontWeight = depth === 0 ? "700" : "600";
  nodeWrapper.appendChild(folderLabel);

  // Render leaf items directly under this category
  (categoryNode.items || []).forEach((item) => {
    const leafEl = createEl(
      "div",
      "tree-leaf-item",
      `└─ 📄 [${item.id}] ${item.title} — ★ ${item.rating} ($${item.price.toFixed(2)})`
    );
    leafEl.style.marginLeft = "18px";
    nodeWrapper.appendChild(leafEl);
  });

  // Recursively render subcategories
  (categoryNode.subcategories || []).forEach((subCategory) => {
    nodeWrapper.appendChild(createRecursiveTreeDOM(subCategory, depth + 1));
  });

  return nodeWrapper;
}

/**
 * Builds and renders the interactive dashboard in the Browser using DOM manipulation.
 */
function renderBrowserDashboard() {
  const appRoot = document.getElementById("app");
  if (!appRoot) return;
  appRoot.innerHTML = "";

  // Perform synchronous data collection & initial analysis so the DOM renders immediately
  const treeDepth = calculateTreeDepth(mediaCatalog);
  const allItems = collectAllItemsRecursively(mediaCatalog);
  const taxRate = 0.1;
  const initialAnalysis = analyzeCatalogWithES6(allItems, taxRate, 4.7, "ALL");

  // 1. Header Section
  const header = createEl("header", "app-header");
  const titleBox = createEl("div");
  titleBox.appendChild(
    createEl("h1", "app-title", "🚀 JavaScript Hierarchical Data Analytics & Processing Tool")
  );
  titleBox.appendChild(
    createEl(
      "p",
      "app-subtitle",
      "Module 3: Recursion, Native ES6 Array Pipeline, Axios Library, Exception Handling & Dynamic DOM"
    )
  );

  const badgeGroup = createEl("div", "badge-group");
  [
    "External Library: Axios",
    "ES6: map / filter / reduce",
    "Recursion",
    "Exceptions: try / catch / throw",
    "DOM + CSS"
  ].forEach((label) => {
    badgeGroup.appendChild(createEl("span", "badge", label));
  });

  header.appendChild(titleBox);
  header.appendChild(badgeGroup);
  appRoot.appendChild(header);

  // 2. KPI Summary Cards (Populated from ES6 reduce & Recursion)
  const kpiGrid = createEl("section", "kpi-grid");
  const kpiMetrics = [
    {
      label: "Total Leaf Items (Recursion)",
      value: `${initialAnalysis.summary.totalCount} Items`,
      sub: `Max Tree Depth: ${treeDepth} Levels`
    },
    {
      label: "Total Catalog Value (reduce)",
      value: `$${initialAnalysis.summary.totalPriceWithTax.toFixed(2)}`,
      sub: `Pre-Tax: $${initialAnalysis.summary.totalPrice.toFixed(2)} (+10% Tax)`
    },
    {
      label: "Average Rating Score (reduce)",
      value: `★ ${initialAnalysis.summary.averageRating} / 5.0`,
      sub: `Has 4.9+ Masterpiece: ${initialAnalysis.summary.hasMasterpieceItem}`
    },
    {
      label: "Highest Priced Item",
      value: initialAnalysis.summary.highestPricedItem,
      sub: `All Positive Prices: ${initialAnalysis.summary.allItemsHavePositivePrice}`
    }
  ];

  kpiMetrics.forEach((metric) => {
    const card = createEl("div", "kpi-card");
    card.appendChild(createEl("div", "kpi-label", metric.label));
    card.appendChild(createEl("div", "kpi-value", metric.value));
    card.appendChild(createEl("div", "kpi-sub", metric.sub));
    kpiGrid.appendChild(card);
  });
  appRoot.appendChild(kpiGrid);

  // 3. Two-Column Grid: [Left] Recursive Category Tree | [Right] Axios & Category Breakdown
  const twoColGrid = createEl("div", "section-grid");

  // Left Panel: Recursive Tree View
  const treePanel = createEl("section", "panel");
  const treeHeader = createEl("div", "panel-header");
  treeHeader.appendChild(
    createEl("h2", "panel-title", "[1] Recursive Category Hierarchy Tree (Recursion)")
  );
  treePanel.appendChild(treeHeader);

  const treeContainer = createEl("div", "tree-container");
  treeContainer.appendChild(createRecursiveTreeDOM(mediaCatalog));
  treePanel.appendChild(treeContainer);
  twoColGrid.appendChild(treePanel);

  // Right Panel: External Library (Axios) & Category Aggregation (Array.reduce)
  const rightPanel = createEl("section", "panel");
  const apiHeader = createEl("div", "panel-header");
  apiHeader.appendChild(
    createEl("h2", "panel-title", "[2] Axios API Status & Category Breakdown (reduce)")
  );
  rightPanel.appendChild(apiHeader);

  const apiLogList = createEl("div", "api-log-list");
  const log1 = createEl("div", "api-log-item error-recovered", "Running Test 1 (Invalid Endpoint Exception Test)...");
  const log2 = createEl("div", "api-log-item", "Running Test 2 (HTTPS Axios Request)...");
  apiLogList.appendChild(log1);
  apiLogList.appendChild(log2);
  rightPanel.appendChild(apiLogList);

  // Execute Axios checks asynchronously so they never block DOM rendering
  fetchRemoteCatalogMetadata("http://invalid-endpoint.local/api/catalog").then((invalidApiResult) => {
    log1.innerHTML = `<strong>Test 1 (Invalid Endpoint Exception Test):</strong> Status = <code>${invalidApiResult.status}</code><br/>
      <span style="color:#fbbf24">${invalidApiResult.errorHandled}</span><br/>
      <small>Source: ${invalidApiResult.source}</small>`;
  });

  fetchRemoteCatalogMetadata("https://jsonplaceholder.typicode.com/posts/1").then((validApiResult) => {
    log2.innerHTML = `<strong>Test 2 (HTTPS Axios Request):</strong> Status = <code>${validApiResult.status}</code><br/>
      <small>Source: ${validApiResult.source}</small>`;
  });

  const catTitle = createEl("h3", "panel-title", "Category Breakdown (Array.reduce)");
  catTitle.style.marginTop = "1.5rem";
  catTitle.style.marginBottom = "0.75rem";
  rightPanel.appendChild(catTitle);

  const catTableWrapper = createEl("div", "table-wrapper");
  const catTable = createEl("table");
  catTable.innerHTML = `
    <thead>
      <tr>
        <th>Category</th>
        <th>Item Count</th>
        <th>Subtotal (USD)</th>
        <th>Avg Rating</th>
      </tr>
    </thead>
    <tbody>
      ${initialAnalysis.categoryBreakdown
        .map(
          (row) => `
        <tr>
          <td><strong>${row.Category}</strong></td>
          <td>${row.ItemCount}</td>
          <td>${row.TotalPriceUSD}</td>
          <td>★ ${row.AverageRating}</td>
        </tr>`
        )
        .join("")}
    </tbody>
  `;
  catTableWrapper.appendChild(catTable);
  rightPanel.appendChild(catTableWrapper);
  twoColGrid.appendChild(rightPanel);
  appRoot.appendChild(twoColGrid);

  // 4. Interactive ES6 Array Pipeline Panel (map, filter, sort)
  const es6Panel = createEl("section", "panel");
  const es6Header = createEl("div", "panel-header");
  es6Header.appendChild(
    createEl("h2", "panel-title", "[3] Interactive Native Array ES6 Pipeline (map / filter / sort)")
  );
  es6Panel.appendChild(es6Header);

  const controlsBar = createEl("div", "controls-bar");

  // Rating filter control
  const ratingControl = createEl("div", "control-group");
  const ratingLabel = createEl("label", "", "Minimum Rating (Array.filter): ");
  const ratingValueSpan = createEl("strong", "", "4.5");
  const ratingSlider = createEl("input");
  ratingSlider.type = "range";
  ratingSlider.min = "3.5";
  ratingSlider.max = "4.9";
  ratingSlider.step = "0.1";
  ratingSlider.value = "4.5";
  ratingControl.appendChild(ratingLabel);
  ratingControl.appendChild(ratingSlider);
  ratingControl.appendChild(ratingValueSpan);

  // Category select control
  const categoryControl = createEl("div", "control-group");
  categoryControl.appendChild(createEl("label", "", "Top Category: "));
  const categorySelect = createEl("select");
  ["ALL", "Movies", "Books"].forEach((optVal) => {
    const opt = createEl("option", "", optVal);
    opt.value = optVal;
    categorySelect.appendChild(opt);
  });
  categoryControl.appendChild(categorySelect);

  controlsBar.appendChild(ratingControl);
  controlsBar.appendChild(categoryControl);
  es6Panel.appendChild(controlsBar);

  const itemsTableWrapper = createEl("div", "table-wrapper");
  es6Panel.appendChild(itemsTableWrapper);

  function updateFilteredTable() {
    const minRating = parseFloat(ratingSlider.value);
    const selectedCategory = categorySelect.value;
    ratingValueSpan.textContent = `★ ${minRating.toFixed(1)}`;

    const updated = analyzeCatalogWithES6(allItems, taxRate, minRating, selectedCategory);
    const table = createEl("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>ID</th>
          <th>Title</th>
          <th>Hierarchy Path (Recursion)</th>
          <th>Rating</th>
          <th>Price</th>
          <th>Taxed Price (map)</th>
          <th>Tier (map)</th>
        </tr>
      </thead>
      <tbody>
        ${updated.topRatedItems
          .map((item) => {
            const pillClass = item.tier.startsWith("S")
              ? "pill-s"
              : item.tier.startsWith("A")
              ? "pill-a"
              : "pill-b";
            return `
              <tr>
                <td><code>${item.id}</code></td>
                <td><strong>${item.title}</strong></td>
                <td>${item.categoryPath}</td>
                <td>★ ${item.rating}</td>
                <td>$${item.price.toFixed(2)}</td>
                <td>$${item.priceWithTax.toFixed(2)}</td>
                <td><span class="pill ${pillClass}">${item.tier}</span></td>
              </tr>`;
          })
          .join("")}
      </tbody>
    `;
    itemsTableWrapper.innerHTML = "";
    itemsTableWrapper.appendChild(table);
  }

  ratingSlider.addEventListener("input", updateFilteredTable);
  categorySelect.addEventListener("change", updateFilteredTable);
  updateFilteredTable();
  appRoot.appendChild(es6Panel);

  // 5. Stretch Challenge Panel: Throwing and Handling Exceptions (Interactive)
  const exceptionPanel = createEl("section", "panel");
  const excHeader = createEl("div", "panel-header");
  excHeader.appendChild(
    createEl(
      "h2",
      "panel-title",
      "[4] Stretch Challenge: Throwing & Handling Exceptions (try / catch / throw)"
    )
  );
  exceptionPanel.appendChild(excHeader);

  // Interactive Custom Record Exception Tester
  const testRecordsList = [...rawIncomingRecords];
  const testerBar = createEl("div", "controls-bar");

  const titleInput = createEl("input");
  titleInput.type = "text";
  titleInput.placeholder = "Title (leave blank to trigger error)";

  const ratingInput = createEl("input");
  ratingInput.type = "number";
  ratingInput.step = "0.1";
  ratingInput.placeholder = "Rating (e.g. 6.2 to trigger error)";
  ratingInput.value = "6.2";

  const priceInput = createEl("input");
  priceInput.type = "number";
  priceInput.step = "1";
  priceInput.placeholder = "Price (e.g. -15 to trigger error)";
  priceInput.value = "25";

  const addRecordBtn = createEl("button", "btn", "Test Record & Trigger try-catch");

  const g1 = createEl("div", "control-group");
  g1.appendChild(createEl("span", "", "New Record:"));
  g1.appendChild(titleInput);
  g1.appendChild(ratingInput);
  g1.appendChild(priceInput);
  g1.appendChild(addRecordBtn);
  testerBar.appendChild(g1);
  exceptionPanel.appendChild(testerBar);

  const exceptionTablesContainer = createEl("div", "section-grid");
  exceptionPanel.appendChild(exceptionTablesContainer);

  function renderExceptionTables() {
    const { validRecords, errorLogs } = sanitizeIncomingRecords(testRecordsList);
    exceptionTablesContainer.innerHTML = "";

    // Caught Exception Logs Table
    const errBox = createEl("div", "table-wrapper");
    errBox.innerHTML = `
      <h3 style="margin-bottom:0.6rem; font-size:1rem; color:#fb7185;">
        Caught Custom Exceptions (${errorLogs.length} DataValidationErrors)
      </h3>
      <table>
        <thead>
          <tr>
            <th>Record ID</th>
            <th>Field</th>
            <th>Exception Message</th>
          </tr>
        </thead>
        <tbody>
          ${errorLogs
            .map(
              (err) => `
            <tr>
              <td><code>${err.recordId}</code></td>
              <td><span class="pill pill-error">${err.field}</span></td>
              <td>${err.message}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    `;

    // Sanitized / Recovered Output Table
    const sanitizedBox = createEl("div", "table-wrapper");
    sanitizedBox.innerHTML = `
      <h3 style="margin-bottom:0.6rem; font-size:1rem; color:#34d399;">
        Sanitized Records After Fallback Recovery (${validRecords.length} Records)
      </h3>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Rating</th>
            <th>Price</th>
            <th>Recovery Status</th>
          </tr>
        </thead>
        <tbody>
          ${validRecords
            .map(
              (rec) => `
            <tr>
              <td><code>${rec.id}</code></td>
              <td>${rec.title}</td>
              <td>★ ${rec.rating}</td>
              <td>$${rec.price.toFixed(2)}</td>
              <td>
                <span class="pill ${rec.isFallback ? "pill-b" : "pill-s"}">
                  ${rec.isFallback ? "⚠️ Fallback Applied" : "✅ Valid"}
                </span>
              </td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    `;

    exceptionTablesContainer.appendChild(errBox);
    exceptionTablesContainer.appendChild(sanitizedBox);
  }

  addRecordBtn.addEventListener("click", () => {
    const nextId = `R-00${testRecordsList.length + 1}`;
    testRecordsList.push({
      id: nextId,
      title: titleInput.value,
      rating: parseFloat(ratingInput.value),
      price: parseFloat(priceInput.value)
    });
    titleInput.value = "";
    renderExceptionTables();
  });

  renderExceptionTables();
  appRoot.appendChild(exceptionPanel);
}

// ============================================================================
// 6. Terminal Output (Display output to the screen in Node.js)
// ============================================================================

async function runTerminalCli() {
  const divider = "=".repeat(78);
  const subDivider = "-".repeat(78);

  console.log(divider);
  console.log(" 🚀 JavaScript Hierarchical Data Analytics & Processing Tool");
  console.log(divider);

  // Step 1: Demonstrate external library (axios) and custom exception handling
  console.log("\n[1] External npm Library (axios) API Request & Invalid Endpoint Exception Handling");
  console.log(subDivider);

  // Intentionally pass an invalid endpoint (http://...) to verify custom exception throwing and fallback
  const invalidApiResult = await fetchRemoteCatalogMetadata("http://invalid-endpoint.local/api/catalog");
  console.log(`- Test 1 (Invalid URL): Status = ${invalidApiResult.status}`);
  console.log(`  Caught Exception    : ${invalidApiResult.errorHandled}`);
  console.log(`  Applied Data Source : ${invalidApiResult.source}`);

  // Request a valid HTTPS endpoint (safely falls back if executed in an offline environment)
  const remoteApiResult = await fetchRemoteCatalogMetadata("https://jsonplaceholder.typicode.com/posts/1");
  console.log(`- Test 2 (HTTPS API)  : Status = ${remoteApiResult.status} (${remoteApiResult.source})`);
  const taxRate = invalidApiResult.data.taxRate || 0.1;

  // Step 2: Traverse hierarchical structure using Recursion
  console.log("\n[2] Recursive Category Tree Traversal & Leaf Item Collection (Recursion)");
  console.log(subDivider);

  const treeDepth = calculateTreeDepth(mediaCatalog);
  const treeLines = buildVisualTreeLines(mediaCatalog);
  console.log(`- Maximum Category Tree Depth (Recursive): ${treeDepth} levels\n`);
  treeLines.forEach((line) => console.log(`  ${line}`));

  const allItems = collectAllItemsRecursively(mediaCatalog);
  console.log(`\n- Total Leaf Items Collected Recursively: ${allItems.length} items`);

  // Step 3: Transform, filter, and aggregate data using Native Array ES6 functions
  console.log("\n[3] Native Array ES6 Functions Pipeline (map / filter / reduce / sort)");
  console.log(subDivider);

  const minRatingThreshold = 4.7;
  const analysis = analyzeCatalogWithES6(allItems, taxRate, minRatingThreshold);

  console.log("▼ All Collected Items (Transformed with Array.map to add Taxed Price & Tier):");
  console.table(
    analysis.enrichedItems.map((item) => ({
      ID: item.id,
      Title: item.title,
      CategoryPath: item.categoryPath,
      Rating: item.rating,
      "Price ($)": item.price,
      "Taxed ($)": item.priceWithTax,
      Tier: item.tier
    }))
  );

  console.log(`▼ Top-Rated Items (Filtered with Array.filter: Rating >= ${minRatingThreshold}, Sorted by Rating):`);
  console.table(
    analysis.topRatedItems.map((item) => ({
      ID: item.id,
      Title: item.title,
      Category: item.topCategory,
      Rating: item.rating,
      "Price ($)": item.price
    }))
  );

  console.log("▼ Category Breakdown Summary (Grouped & Aggregated with Array.reduce):");
  console.table(analysis.categoryBreakdown);

  console.log("▼ Overall Statistical Summary (Array.reduce / Array.every / Array.some):");
  console.log(`  - Total Items               : ${analysis.summary.totalCount}`);
  console.log(`  - Total Price (Pre-Tax)     : $${analysis.summary.totalPrice}`);
  console.log(`  - Total Price (With 10% Tax): $${analysis.summary.totalPriceWithTax}`);
  console.log(`  - Average Price             : $${analysis.summary.averagePrice}`);
  console.log(`  - Average Rating Score      : ★ ${analysis.summary.averageRating} / 5.00`);
  console.log(`  - Highest Priced Item       : ${analysis.summary.highestPricedItem}`);
  console.log(`  - All Prices Positive?      : ${analysis.summary.allItemsHavePositivePrice} (Array.every)`);
  console.log(`  - Has 4.9+ Masterpiece?     : ${analysis.summary.hasMasterpieceItem} (Array.some)`);

  // Step 4: Stretch Challenge - Throw and handle exceptions for missing/corrupted records
  console.log("\n[4] Stretch Challenge: Throwing & Handling Exceptions for Corrupted Data (try-catch)");
  console.log(subDivider);

  const { validRecords, errorLogs } = sanitizeIncomingRecords(rawIncomingRecords);

  console.log(`- Incoming Records: ${rawIncomingRecords.length} / Exceptions Caught & Handled: ${errorLogs.length}`);
  console.log("\n▼ Caught Custom Exception Logs (DataValidationError):");
  console.table(errorLogs);

  console.log("▼ Sanitized Dataset After Exception Recovery (Fallback Applied):");
  console.table(
    validRecords.map((rec) => ({
      ID: rec.id,
      Title: rec.title,
      Rating: rec.rating,
      "Price ($)": rec.price,
      Status: rec.isFallback ? "⚠️ Fallback Applied" : "✅ Valid"
    }))
  );

  console.log(divider);
  console.log(" ✅ All analytics pipelines and exception handling steps completed successfully.");
  console.log(divider);
}

// ============================================================================
// Entrypoint Execution (Browser vs Node.js)
// ============================================================================

if (isBrowser) {
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", renderBrowserDashboard);
  } else {
    renderBrowserDashboard();
  }
} else if (typeof require !== "undefined" && require.main === module) {
  runTerminalCli();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    collectAllItemsRecursively,
    calculateTreeDepth,
    analyzeCatalogWithES6,
    validateMediaRecord,
    sanitizeIncomingRecords,
    fetchRemoteCatalogMetadata
  };
}
