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
    return glob(spec.globPattern)
        .map(filePath => {
            return new Promise(resolve => {
                Promise.join(
                    getSloc(filePath),
                    getAllASTNodes(filePath).then(list => list.length),
                    (sloc, astNodes) => resolve({filePath, sloc, astNodes})
                );
            });
        });
}

// signals plain
var SIGNALS_PLAIN = {
    name: "signals plain",
    globPattern: "projects/programming-signals-plain/transform/*.template.js"
};

// signals plain detection
var SIGNALS_PLAIN_DETECTION = {
    name: "signals plain detection",
    globPattern: "projects/programming-signals-plain-detection/transform/*.template.js"
};

// constraints plain
var CONSTRAINTS_PLAIN = {
    name: "constraints plain",
    globPattern: "projects/programming-constraints-plain/{cassowary,babel-plugin-cassowary-transform}.js"
};

// constraints plain detection
var CONSTRAINTS_PLAIN_DETECTION = {
    name: "constraints plain detection",
    globPattern: "projects/programming-constraints-plain-detection/{cassowary,babel-plugin-cassowary-transform}.js"
};

// roq plain
var ROQ_PLAIN = {
    name: "roq plain",
    globPattern: "projects/programming-roq-plain/src/**/*.js"
};

// roq plain reaction
var ROQ_PLAIN_REACTION = {
    name: "roq plain reaction",
    globPattern: "projects/programming-roq-plain-reaction/src/**/*.js"
};

// ila plain
var ILA_PLAIN = {
    name: "ila plain",
    globPattern: "projects/programming-contextjs-plain/src/Layers.js"
};

// signals aexpr
var SIGNALS_AEXPR = {
    name: "signals aexpr",
    globPattern: "projects/programming-signals-aexpr/transform/*.extracted.js"
};

// signals aexpr detection
var SIGNALS_AEXPR_DETECTION = {
    name: "signals aexpr detection",
    globPattern: "projects/programming-signals-aexpr-detection/transform/*.extracted.js"
};

// constraint aexpr
var CONSTRAINTS_AEXPR = {
    name: "constraints aexpr",
    globPattern: "projects/babel-plugin-always-constraint/index.js"
};

// constraint aexpr
var CONSTRAINTS_AEXPR_DETECTION = {
    name: "constraints aexpr detection",
    globPattern: "projects/babel-plugin-always-constraint-detection/index.js"
};

// roq aexpr
var ROQ_AEXPR = {
    name: "roq aexpr",
    globPattern: "projects/reactive-object-queries/src/*.js"
};

// roq aexpr
var ROQ_AEXPR_REACTION = {
    name: "roq aexpr reaction",
    globPattern: "projects/reactive-object-queries-reaction/src/*.js"
};

// ila aexpr
var ILA_AEXPR = {
    name: "ila aexpr",
    globPattern: "projects/programming-contextjs-aexpr/src/Layers.js"
};

// ila aexpr
var CONTEXTJS = {
    name: "ContextJS",
    globPattern: "projects/ContextJS/src/Layers.js"
};

Promise.resolve([
    SIGNALS_PLAIN,
    SIGNALS_PLAIN_DETECTION,
    CONSTRAINTS_PLAIN,
    CONSTRAINTS_PLAIN_DETECTION,
    ROQ_PLAIN,
    ROQ_PLAIN_REACTION,
    ILA_PLAIN,
    SIGNALS_AEXPR,
    SIGNALS_AEXPR_DETECTION,
    CONSTRAINTS_AEXPR,
    CONSTRAINTS_AEXPR_DETECTION,
    ROQ_AEXPR,
    ROQ_AEXPR_REACTION,
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
