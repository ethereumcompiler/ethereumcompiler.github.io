(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["lexon-js"],{

/***/ "../../../node_modules/monaco-editor/esm/vs/basic-languages/lexon/lexon.js":
/*!********************************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/node_modules/monaco-editor/esm/vs/basic-languages/lexon/lexon.js ***!
  \********************************************************************************************************************/
/*! exports provided: conf, language */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "conf", function() { return conf; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "language", function() { return language; });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var conf = {
    comments: {
        lineComment: 'COMMENT'
        // blockComment: ['COMMENT', '.'],
    },
    brackets: [['(', ')']],
    autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: ':', close: '.' }
    ],
    surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '`', close: '`' },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
        { open: ':', close: '.' }
    ],
    folding: {
        markers: {
            start: new RegExp('^\\s*(::\\s*|COMMENT\\s+)#region'),
            end: new RegExp('^\\s*(::\\s*|COMMENT\\s+)#endregion')
        }
    }
};
var language = {
    // Set defaultToken to invalid to see what you do not tokenize yet
    // defaultToken: 'invalid',
    tokenPostfix: '.lexon',
    ignoreCase: true,
    keywords: [
        'lexon',
        'lex',
        'clause',
        'terms',
        'contracts',
        'may',
        'pay',
        'pays',
        'appoints',
        'into',
        'to'
    ],
    typeKeywords: ['amount', 'person', 'key', 'time', 'date', 'asset', 'text'],
    operators: [
        'less',
        'greater',
        'equal',
        'le',
        'gt',
        'or',
        'and',
        'add',
        'added',
        'subtract',
        'subtracted',
        'multiply',
        'multiplied',
        'times',
        'divide',
        'divided',
        'is',
        'be',
        'certified'
    ],
    // we include these common regular expressions
    symbols: /[=><!~?:&|+\-*\/\^%]+/,
    // The main tokenizer for our languages
    tokenizer: {
        root: [
            // comment
            [/^(\s*)(comment:?(?:\s.*|))$/, ['', 'comment']],
            // special identifier cases
            [
                /"/,
                {
                    token: 'identifier.quote',
                    bracket: '@open',
                    next: '@quoted_identifier'
                }
            ],
            [
                'LEX$',
                {
                    token: 'keyword',
                    bracket: '@open',
                    next: '@identifier_until_period'
                }
            ],
            ['LEXON', { token: 'keyword', bracket: '@open', next: '@semver' }],
            [
                ':',
                {
                    token: 'delimiter',
                    bracket: '@open',
                    next: '@identifier_until_period'
                }
            ],
            // identifiers and keywords
            [
                /[a-z_$][\w$]*/,
                {
                    cases: {
                        '@operators': 'operator',
                        '@typeKeywords': 'keyword.type',
                        '@keywords': 'keyword',
                        '@default': 'identifier'
                    }
                }
            ],
            // whitespace
            { include: '@whitespace' },
            // delimiters and operators
            [/[{}()\[\]]/, '@brackets'],
            [/[<>](?!@symbols)/, '@brackets'],
            [/@symbols/, 'delimiter'],
            // numbers
            [/\d*\.\d*\.\d*/, 'number.semver'],
            [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
            [/0[xX][0-9a-fA-F]+/, 'number.hex'],
            [/\d+/, 'number'],
            // delimiter: after number because of .\d floats
            [/[;,.]/, 'delimiter']
        ],
        quoted_identifier: [
            [/[^\\"]+/, 'identifier'],
            [/"/, { token: 'identifier.quote', bracket: '@close', next: '@pop' }]
        ],
        space_identifier_until_period: [
            [':', 'delimiter'],
            [' ', { token: 'white', next: '@identifier_rest' }]
        ],
        identifier_until_period: [
            { include: '@whitespace' },
            [':', { token: 'delimiter', next: '@identifier_rest' }],
            [/[^\\.]+/, 'identifier'],
            [/\./, { token: 'delimiter', bracket: '@close', next: '@pop' }]
        ],
        identifier_rest: [
            [/[^\\.]+/, 'identifier'],
            [/\./, { token: 'delimiter', bracket: '@close', next: '@pop' }]
        ],
        semver: [
            { include: '@whitespace' },
            [':', 'delimiter'],
            [/\d*\.\d*\.\d*/, { token: 'number.semver', bracket: '@close', next: '@pop' }]
        ],
        whitespace: [[/[ \t\r\n]+/, 'white']]
    }
};


/***/ })

}]);
//# sourceMappingURL=lexon-js.0.26.0-dev.1661717561336.js.map