/**
 * Hierarchical Media Catalog Data (Tree Structure)
 * Nested from parent categories down to subcategories, designed to be
 * traversed and aggregated using recursive functions (Recursion).
 * Compatible with both Node.js (CommonJS) and Browser environments.
 */

(function (root) {
  const mediaCatalog = {
    categoryName: "Root Media Library",
    subcategories: [
      {
        categoryName: "Movies",
        subcategories: [
          {
            categoryName: "Sci-Fi",
            subcategories: [],
            items: [
              { id: "M-101", title: "Interstellar", rating: 4.8, price: 19.99, year: 2014 },
              { id: "M-102", title: "Inception", rating: 4.7, price: 14.99, year: 2010 },
              { id: "M-103", title: "The Matrix", rating: 4.9, price: 12.99, year: 1999 }
            ]
          },
          {
            categoryName: "Animation",
            subcategories: [
              {
                categoryName: "Studio Ghibli",
                subcategories: [],
                items: [
                  { id: "M-201", title: "Spirited Away", rating: 4.9, price: 24.99, year: 2001 },
                  { id: "M-202", title: "Princess Mononoke", rating: 4.8, price: 22.50, year: 1997 }
                ]
              }
            ],
            items: [
              { id: "M-203", title: "Spider-Man: Into the Spider-Verse", rating: 4.6, price: 15.99, year: 2018 }
            ]
          }
        ],
        items: []
      },
      {
        categoryName: "Books",
        subcategories: [
          {
            categoryName: "Programming & Computer Science",
            subcategories: [
              {
                categoryName: "JavaScript & Web",
                subcategories: [],
                items: [
                  { id: "B-301", title: "Eloquent JavaScript", rating: 4.7, price: 31.99, year: 2018 },
                  { id: "B-302", title: "You Don't Know JS Yet", rating: 4.8, price: 29.99, year: 2020 }
                ]
              }
            ],
            items: [
              { id: "B-303", title: "Clean Code", rating: 4.5, price: 39.99, year: 2008 },
              { id: "B-304", title: "Legacy Code Guide", rating: 3.8, price: 25.00, year: 2012 }
            ]
          }
        ],
        items: [
          { id: "B-305", title: "The Pragmatic Programmer", rating: 4.9, price: 42.00, year: 2019 }
        ]
      }
    ],
    items: []
  };

  /**
   * Test dataset for Exception Handling (Stretch Challenge)
   * Contains records with missing fields and out-of-range numerical values.
   */
  const rawIncomingRecords = [
    { id: "R-001", title: "Refactoring", rating: 4.8, price: 45.00 },
    { id: "R-002", title: "", rating: 4.2, price: 18.50 },          // Invalid: empty title
    { id: "R-003", title: "Design Patterns", rating: 6.5, price: 50.00 }, // Invalid: rating out of range (0-5)
    { id: "R-004", title: "Domain-Driven Design", rating: 4.6, price: -10.00 }, // Invalid: negative price
    { id: "R-005", title: "Structure and Interpretation of Computer Programs", rating: 4.9, price: 55.00 }
  ];

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      mediaCatalog,
      rawIncomingRecords
    };
  }

  if (root) {
    root.CatalogData = {
      mediaCatalog,
      rawIncomingRecords
    };
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this);
