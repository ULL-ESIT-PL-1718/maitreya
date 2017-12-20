let {defineGrammar, def, ref, many1, regex, choice, string} = require('maitreya/lib/grammar');
let {GLRParser} = require('maitreya/lib/interpret');

let grammar = defineGrammar(() => {
    def('exp', [ref('num')], ([num]) => num);
    def('exp', [string('('), ref('exp'), string(')')], ([left, exp, right]) => exp);
    def('exp', [ref('exp'), ref('op'), ref('exp')], ([lhs, op, rhs]) => op(lhs, rhs));
    def('num', [many1(regex(/^[0-9]/))], ([digits]) => Number(digits.join('')));
    def('op', [choice('*', '+', '-')], ([op]) => {
        return {
            ['*'](lhs, rhs) { return lhs * rhs; },
            ['/'](lhs, rhs) { return lhs / rhs; },
            ['+'](lhs, rhs) { return lhs + rhs; },
            ['-'](lhs, rhs) { return lhs - rhs; }
        }[op];
    });
});

let parser = new GLRParser(grammar);
parser.feed('7-(3-1)');
console.log(parser.results);
