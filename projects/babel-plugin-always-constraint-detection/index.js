const IS_EXPLICIT_SCOPE_OBJECT = Symbol('FLAG: generated scope object');

export default function({ types: t, template, traverse }) {
    let getSolverInstance = template(`let solver = Cassowary.ClSimplexSolver.getInstance();`),
        triggerExpression = template(`trigger(aexpr(() => CONDITION)).onBecomeFalse(() => solver.solveConstraints())`);

    return {
        visitor: {
            Program: {
                enter(path, state) {
                    function getIdentifierForExplicitScopeObject(parentWithScope) {
                        let bindings = parentWithScope.scope.bindings;
                        let scopeName = Object.keys(bindings).find(key => {
                            return bindings[key].path &&
                                bindings[key].path.node &&
                                bindings[key].path.node.id &&
                                bindings[key].path.node.id[IS_EXPLICIT_SCOPE_OBJECT]
                        });

                        if(scopeName) {
                            return t.identifier(scopeName);
                        } else {
                            let uniqueIdentifier = parentWithScope.scope.generateUidIdentifier('scope');
                            uniqueIdentifier[IS_EXPLICIT_SCOPE_OBJECT] = true;

                            parentWithScope.scope.push({
                                kind: 'let',
                                id: uniqueIdentifier,
                                init: t.objectExpression([])
                            });
                            return uniqueIdentifier;
                        }
                    }

                    function getScopeIdentifierForVariable(path) {
                        if(path.scope.hasBinding(path.node.name)) {
                            let parentWithScope = path.findParent(par =>
                                par.scope.hasOwnBinding(path.node.name)
                            );
                            if(parentWithScope) {
                                return getIdentifierForExplicitScopeObject(parentWithScope);
                            }
                        } else {
                            return t.identifier('window');
                        }
                    }

                    path.traverse({
                        LabeledStatement(path) {
                            if(path.node.label.name !== 'always') { return; }

                            // identify all referenced variables
                            let variables = new Set();
                            path.traverse({
                                Identifier(path) {
                                    if(path.node.name === 'always') { return; }
                                    variables.add(path)
                                }
                            });

                            Array.from(variables).forEach(path => {
                                let name = path.node.name,
                                    scopeIdentifier = getScopeIdentifierForVariable(path),
                                    identifier = path.scope.generateUidIdentifier('constraintVar_' + name);


                            });

                            path.replaceWith(t.blockStatement([
                                getSolverInstance(),
                                triggerExpression({ CONDITION: path.node.body.expression })
                            ]))
                        }
                    });
                }
            }
        }
    };
}