//
// Non-wildcard version of smatch.
//
function smatch1(pattern, target) {
    if (typeof pattern === "number" || typeof pattern == "string")
        return pattern === target;          // same number or string
    else
        return pattern instanceof Array &&  // pattern and
               target instanceof Array &&   // target are arrays
               pattern.length === target.length &&    // of the same length
               pattern.every(function(elem, index) {  // and recursively
                   return smatch1(elem, target[index]); // contain same elems
               });
}

function smatch(pattern, target, table) {
  table = table || {}
	
  if (typeof pattern === "number"){
    if(!(pattern === target))
      return null;
  }
	else if (typeof pattern === "string"){
    if(pattern[pattern.length - 1] === '?')
      table[pattern.slice(0, (pattern.length - 1))] = target;
    else if(!(pattern === target))
      return null
  }		
  else{
		if (!(pattern instanceof Array &&  // pattern and
               target instanceof Array &&   // target are arrays
               pattern.length === target.length &&    // of the same length
               pattern.every(function(elem, index) {  // and recursively
                   return smatch(elem, target[index], table); // contain same elems
               }))) return null;
	}
  
	return table;
}

//
// d/dx u(x)^ n = n * u(x)^n-1 * d/dx u(x)
//
// GIVEN
var diffPowerRule = {
    pattern : function(target, table) {
        return smatch(['DERIV', ['^', 'E?', 'N?'], 'V?'], target, table) &&
            typeof table.N === "number";
    },
    transform: function(table) {
        return ['*', ['*', table.N, ['^', table.E, table.N - 1]], 
                ['DERIV', table.E, table.V]];
    },
    label: "diffPowerRule"
};

//
//  d/dt t = 1
//
// GIVEN
var diffXRule = {
    pattern : function(target, table) {
        return smatch(['DERIV', 'E?', 'V?'], target, table) &&
            table.E === table.V;
    },
    transform: function(table) {
        return 1;
    },
    label: "diffXRule"
};

//
// (u + v)' = u' + v'
//
// CHECKED
var diffSumRule = {
    pattern: function(target, table) {
        return smatch(['DERIV', ['+', 'U?', 'V?'], 'X?'], target, table);
    },
    transform: function(table) {
        return ['+', ['DERIV', table.U, table.X], ['DERIV', table.V, table.X]];
    },
    label: "diffSumRule"
};

//
// (u - v)' = u' - v'
//
// CHECKED
var diffSubtractRule = {
    pattern: function(target, table) {
      return smatch(['DERIV', ['-', 'U?', 'V?'], 'X?'], target, table);
    },
    transform: function(table) {
        return ['-', ['DERIV', table.U, table.X], ['DERIV', table.V, table.X]];
    },
    label: "diffSubtractRule"
};

//
// d/dt C = 0   (C does not depend on t)
//
//XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX//
var diffConstRule = {
    pattern: function(target, table) {
      return smatch(['DERIV', 'E?', 'V?'], target, table) && 
      (typeof table.E === "number" || (table.E.indexOf(table.V.toString()) < 0)) && table.V.length === 1;
    },
    transform: function(table) {
        return 0;
    },
    label: "diffConstRule"
};

//
// (u v)' = uv' + vu'
//
// CHECKED
var diffProductRule = {
    pattern: function(target, table) {
      return smatch(['DERIV', ['*', 'U?', 'V?'], 'X?'], target, table);
    },
    transform: function(table) {
        return ['+', ['*', table.U, ['DERIV', table.V, table.X]], ['*', table.V, ['DERIV', table.U, table.X]]];
    },
    label: "diffProductRule"
};

//
// 3 + 4 = 7   (evaluate constant binary expressions)
//
// CHECKED
var foldBinopRule = {
    pattern: function(target, table) {
      return smatch(['O?', 'N1?', 'N2?'], target, table) &&
        typeof table.N1 === "number" && typeof table.N2 === "number";
    },
    transform: function(table) {
      if(table.O === '+') 
        return (table.N1 + table.N2);        
      if(table.O === '-') 
        return (table.N1 - table.N2);
      if(table.O === '*') 
        return (table.N1 * table.N2);        
      if(table.O === '/') 
        return (table.N1 / table.N2);
      if(table.O === '^') 
        return Math.pow(table.N1, table.N2);
    },
    label: "foldBinopRule"
};

//
// 3*(2*E) = 6*E  : [*, a, [*, b, e]] => [*, (a*b), e]
//
// CHECKED
var foldCoeff1Rule = {
    pattern: function(target, table) {
      return smatch(['*', 'N1?', ['*', 'N2?', 'E?']], target, table) &&
        typeof table.N1 === "number" && typeof table.N2 === "number"; 
    },
    transform: function(table) {
        return ['*', (table.N1 * table.N2), table.E];
    },
    label: "foldCoeff1Rule"
};

//
//  x^0 = 1
//
// CHECKED
var expt0Rule = {
    pattern: function(target, table) {
      return smatch(['^', 'X?', 'N?'], target, table) &&
        table.N === 0;
    },
    transform: function(table) {
      return 1;
    },
    label: "expt0Rule"
};

//
//  x^1 = x
//
// CHECKED
var expt1Rule = {
    pattern: function(target, table) {
      return smatch(['^', 'X?', 'N?'], target, table) &&
        table.N === 1;
    },
    transform: function(table) {
      return table.X;
    },
    label: "expt1Rule"
};

//
//  E * 1 = 1 * E = 0 + E = E + 0 = E
//
var unityRule = {
    pattern: function(target, table) {
      return (smatch(['O?', 'E?', 'N?'], target, table) && 
      ((table.O === '*' && (table.E === 1 || table.N === 1)) ||
       (table.O === '+' && (table.E === 0 || table.N === 0))))      
    },
    transform: function(table) {
      if(typeof table.E !== "number")
        return table.E;
      else
        return table.N;
    },
    label: "unityRule"
};

//
// E * 0 = 0 * E = 0
//
var times0Rule = {
    pattern: function(target, table) {
      return smatch(['*', 'E?', 'N?'], target, table) &&
        ((table.E === 0 && typeof table.N !== "number") || (typeof table.E !== "number" && table.N === 0)) 
    },
    transform: function(table) {
        return 0;
    },
    label: "time0Rule"
};

//
// Try to apply "rule" to "expr" recursively -- rule may fire multiple times
// on subexpressions.
// Returns null if rule is *never* applied, else new transformed expression.
// 
function tryRule(rule, expr) {
    var table = {}
    if (!(expr instanceof Array))  // rule patterns match only arrays
        return null;
    else if (rule.pattern(expr, table)) { // rule matches whole expres
        console.log("rule " + rule.label + " fires.");
        return rule.transform(table);     // return transformed expression
    } else { // let's recursively try the rule on each subexpression
        var anyFire = false;
        var newExpr = expr.map(function(e) {
            var t = tryRule(rule, e);
            if (t !== null) {     // note : t = 0 is a valid expression
                anyFire = true;   // at least one rule fired
                return t;         // return transformed subexpression
            } else {
                return e;         // return original subexpression
            }
        });
        return anyFire ? newExpr : null;
    }
}

//
// Try transforming the given expression using all the rules.
// If any rules fire, we return the new transformed expression;
// Otherwise, null is returned.
//
//XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX//
function tryAllRules(expr) {
  
    var anyFired = false;
    var rules = [
        diffSumRule,
        diffProductRule,
        diffPowerRule,
        diffXRule,
        diffSubtractRule,
        diffConstRule,
        expt0Rule,
        expt1Rule,       
        times0Rule,
        foldBinopRule,
        unityRule,     
        foldCoeff1Rule
    ];
    
    rules.forEach(function(rule) {
      var newExpr = tryRule(rule, expr);
      if(newExpr !== null){
        expr = newExpr;
        anyFired = true;
      }
    });
    
    if(anyFired)
      return expr;
    else
      return null;
}

//
// Repeatedly try to reduce expression by applying rules.
// As soon as no more rules fire we are done.
//
function reduceExpr(expr) {
    var e = tryAllRules(expr);
    return (e != null) ? reduceExpr(e) : expr;
}

//if (diffPowerRule.pattern(['DERIV', ['^', 'X', 3], 'X'], table)) {
//     var f = diffPowerRule.transform(table);
//     console.log(f);
// }

//
// Node module exports.
//
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    exports.smatch = smatch;
    exports.diffPowerRule = diffPowerRule;
    exports.tryRule = tryRule;

    exports.diffXRule = diffXRule;
    exports.diffSumRule = diffSumRule;
    exports.diffConstRule = diffConstRule;
    exports.diffProductRule = diffProductRule;
    exports.foldBinopRule = foldBinopRule;
    exports.foldCoeff1Rule = foldCoeff1Rule;
    exports.expt0Rule = expt0Rule;
    exports.expt1Rule = expt1Rule;
    exports.unityRule = unityRule;
    exports.times0Rule = times0Rule;

    exports.tryAllRules = tryAllRules;
    exports.reduceExpr = reduceExpr;
}