let {defineGrammar, def, ref, many1, regex, choice, string} = require('maitreya/lib/grammar');
let {GLRParser} = require('maitreya/lib/interpret');

let oper = (op) => {
    return new Function('lhs', 'rhs', `return lhs ${op} rhs;`);
};

let grammar = defineGrammar(() => {
    def('exp', [ref('exp'), ref('addop'), ref('term')], ([lhs, op, rhs]) => op(lhs, rhs));
    def('exp', [ref('term')], ([term]) => term);
    def('term', [ref('term'), ref('mulop'), ref('fac')], ([lhs, op, rhs]) => op(lhs, rhs));
    def('term', [ref('fac')], ([fac]) => fac);
    def('fac', ['(', ref('exp'), ')'], ([left, exp, right]) => exp);
    def('fac', [ref('num')], ([num]) => num);
    def('num', [many1(regex(/^[0-9]/))], ([digits]) => Number(digits.join('')));
    def('addop', [choice('+', '-')], ([op]) => oper(op));
    def('mulop', [choice('*', '/')], ([op]) => oper(op));
});
let parser = new GLRParser(grammar);

parser.feed('7-3-1');
console.log(parser.results);

parser = new GLRParser(grammar);
parser.feed('6-2*3');
console.log(parser.results);

parser = new GLRParser(grammar);
parser.feed('23');
console.log(parser.results);
