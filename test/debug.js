// Test modules will normally use the script "/dist/jclic.min.js"
// This file is minified and uglyfied, so unusable for debugging purposes.
// This script can be used as a "data-main" parameter to the "require.js" script,
// thus allowing the real use of require.js against the source files

/* global requirejs */
requirejs.config({
  // baseURl is relative to the HTML file path
  baseUrl: '../../src/',
  paths: {
    jquery: '../node_modules/jquery/dist/jquery'
  }
});

require(['JClic']);
