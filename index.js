var Promise = require("bluebird");
var glob = Promise.promisify(require("glob"));
var readFile = Promise.promisify(require('fs').readFile);
var writeFile = Promise.promisify(require('fs').writeFile);
var babylon = require("babylon");
var sloc  = require('sloc');
var _ = require('lodash');

//return an array of objects according to key, value, or key and value matching
function getObjects(obj, key, val) {
    var objects = [];
    for (var i in obj) {
        if (!obj.hasOwnProperty(i)) continue;
        if (typeof obj[i] == 'object') {
            objects = objects.concat(getObjects(obj[i], key, val));
        } else
        //if key matches and value matches or if key matches and value is not passed (eliminating the case where key matches but passed value does not)
        if (i == key && obj[i] == val || i == key && val == '') { //
            objects.push(obj);
        } else if (obj[i] == val && key == ''){
            //only add if the object is not already in the array
            if (objects.lastIndexOf(obj) == -1){
                objects.push(obj);
            }
        }
    }
    return objects;
}

function getASTNodeList(ast) {
    return getObjects(ast, 'type', '')
        .map(obj => obj.type)
        .filter(type => !(/Comment/).test(type));
}

function findPattern(pattern, ast) {
    try {
        if(pattern(ast)) { return ast; }
    } catch(e) {}

    for (var i in ast) {
        if (!ast.hasOwnProperty(i)) continue;
        if (typeof ast[i] == 'object') {
            var node = findPattern(pattern, ast[i]);
            if(node) { return node; }
        }
    }
}

function getSloc(filePath) {
    return readFile(filePath, 'utf8')
        .then(function(source) {
            var stats = sloc(source, "js");
            return stats.source;
        });
}

function parseSource(source) {
    return babylon.parse(source, {
        sourceType: "module",
        plugins: [
            "estree",
            "jsx",
            "flow",
            "doExpressions",
            "objectRestSpread",
            "decorators",
            "classProperties",
            "exportExtensions",
            "asyncGenerators",
            "functionBind",
            "functionSent",
            "dynamicImport"
        ]
    }).program;
}

function getAllASTNodes(filePath, pattern) {
    return readFile(filePath, 'utf8')
        .then(parseSource)
        .then(findPattern.bind(null, pattern || () => true))
        .then(function(tree) {
            return getASTNodeList(tree);
        });
}

function getResults(spec) {
    return glob(spec.fullGlob)
        .map(filePath => {
            return new Promise(resolve => {
                Promise.join(
                    getSloc(filePath),
                    getAllASTNodes(filePath).then(list => list.length),
                    (sloc, astNodes) => resolve({filePath, sloc, astNodes})
                );
            });
        });
        map(function(ast) {
            return findPattern(node => node.type === "MethodDefinition" &&
            node.key.type === 'Identifier' &&
            node.key.name === 'activeWhile', ast);
        })
        .map(function(ast) {
            writeFile('res.ast', JSON.stringify(ast, null, 2));
            return ast;
        });
}

// signals plain
var SIGNALS_PLAIN = {
    name: "signals plain",
    fullGlob: "projects/programming-signals-plain/transform/*.template.js"
};

// constraints plain
var CONSTRAINTS_PLAIN = {
    name: "constraints plain",
    fullGlob: "projects/programming-constraints-plain/{cassowary,babel-plugin-cassowary-transform}.js"
};

// roq plain
var ROQ_PLAIN = {
    name: "roq plain",
    fullGlob: "projects/programming-roq-plain/src/**/*.js"
};

// ila plain
var ILA_PLAIN = {
    name: "ila plain",
    fullGlob: "projects/programming-contextjs-plain/src/Layers.js"
};

// signals aexpr
var SIGNALS_AEXPR = {
    name: "signals aexpr",
    fullGlob: "projects/programming-signals-aexpr/transform/*.extracted.js"
};

// constraint aexpr
var CONSTRAINTS_AEXPR = {
    name: "constraints aexpr",
    fullGlob: "projects/babel-plugin-always-constraint/index.js"
};

// roq aexpr
var ROQ_AEXPR = {
    name: "roq aexpr",
    fullGlob: "projects/reactive-object-queries/src/*.js"
};

// ila aexpr
var ILA_AEXPR = {
    name: "ila aexpr",
    fullGlob: "projects/programming-contextjs-aexpr/src/Layers.js"
};

// ila aexpr
var CONTEXTJS = {
    name: "ContextJS",
    fullGlob: "projects/ContextJS/src/Layers.js"
};

Promise.resolve([
    SIGNALS_PLAIN,
    CONSTRAINTS_PLAIN,
    ROQ_PLAIN,
    ILA_PLAIN,
    SIGNALS_AEXPR,
    CONSTRAINTS_AEXPR,
    ROQ_AEXPR,
    ILA_AEXPR,
    CONTEXTJS
])
    .map(spec => {
        return getResults(spec).then(results => {
            var fullSloc = _(results).map('sloc').sum();
            var fullAstNodes = _(results).map('astNodes').sum();

            return {
                name: spec.name,
                fullAstNodes,
                fullSloc
            };
        });
    })
    .then(results => {
        results.forEach(result => {
            console.log(result.name + ' ' + result.fullAstNodes + '[' + result.fullSloc + ']');
        });
    })
    .then(() => {
        // roq plain detection

        // roq aexpr detection #ast-nodes
        return readFile('projects/reactive-object-queries/src/select.js', 'utf8')
            .then(parseSource)
            .then(findPattern.bind(null, node => node.type === "ImportDeclaration" &&
                node.specifiers[0].local.name === 'trigger'
            ))
            .tap(ast => {
                var list = getASTNodeList(ast);
                console.log(list, list.length);
            })
            .then(ast => {
                writeFile('res.ast', JSON.stringify(ast, null, 2));
                //projects/reactive-object-queries/src/*.js
            });
    });
