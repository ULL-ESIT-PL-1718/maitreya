import {START, ANY, Reject, Grammar, Nonterminal, Production} from './types';

let currentGrammar = null;

export function defineGrammar() {
    let name;
    let func;
    if (arguments.length <= 1) {
        func = arguments[0];
    } else {
        name = arguments[0];
        func = arguments[1];
    }
    let grammar = new Grammar(name);
    currentGrammar = grammar;
    func();
    def(START, [grammar.start]);
    currentGrammar = null;
    return grammar;
}

export function def(id, symbols, action = null) {
    let nonterminal = ref(id);
    let production;
    if (Array.isArray(symbols)) {
        production = new Production(nonterminal, symbols, action);
    } else {
        production = new Production(nonterminal, [symbols], ([e1]) => {
            if (action !== null) {
                e1 = action(e1);
            }
            return e1;
        });
    }
    nonterminal.productions.push(production);
    if (currentGrammar.start === null) {
        currentGrammar.start = nonterminal;
    }
}

export function ref(id) {
    let nonterminal = currentGrammar.nonterminals[id];
    if (nonterminal === undefined) {
        nonterminal = new Nonterminal(id);
        currentGrammar.nonterminals[id] = nonterminal;
    }
    return nonterminal;
}

export const any = ANY;

export function reject(error) {
    return new Reject(error);
}

//region { Utilities }

// TODO: Use Immutable struct to deduplicate.

class Rule extends Nonterminal {
    constructor() {
        super(Symbol());
        currentGrammar[this.id] = this;
    }
    def(symbols, action = null) {
        this.productions.push(new Production(this, symbols, action));
    }
}

class BindRule extends Rule {
    constructor(symbol, action) {
        super();
        if (Array.isArray(symbol)) {
            this.def(symbol, (es, index) => action(es, index));
        } else {
            this.def([symbol], ([es], index) => action(es, index));
        }
    }
}

export function bind(symbol, action) {
    return new BindRule(symbol, action);
}

class SkipRule extends Rule {
    constructor(symbol) {
        super();
        if (Array.isArray(symbol)) {
            this.def(symbol, () => undefined);
        } else {
            this.def([symbol], () => undefined);
        }
    }
}

export function skip(symbol) {
    return new SkipRule(symbol);
}

class PositionRule extends Rule {
    constructor() {
        super();
        this.def([], (_, index) => index);
    }
}

export function position() {
    return new PositionRule();
}

class GroupRule extends Rule {
    constructor(symbols) {
        super();
        this.def(symbols);
    }
}

export function group(...symbols) {
    return new GroupRule(symbols);
}

class ChoiceRule extends Rule {
    constructor(symbols) {
        super();
        this.symbols = symbols;
        for (let symbol of symbols) {
            this.def([symbol], ([e1]) => e1);
        }
    }
    toString() {
        return `( ${this.symbols.join(' | ')} )`;
    }
}

export function choice(...symbols) {
    return new ChoiceRule(symbols);
}

class ManyRule extends Rule {
    constructor(symbol) {
        super();
        this.symbol = symbol;
        this.def([], () => []);
        this.def([symbol, this], ([e1, e2]) => [e1, ...e2]);
    }
    toString() {
        return `${this.symbol}*`;
    }
}

export function many(symbol) {
    return new ManyRule(symbol);
}

class Many1Rule extends Rule {
    constructor(symbol) {
        super();
        this.symbol = symbol;
        this.def([symbol, many(symbol)], ([e1, e2]) => [e1, ...e2]);
    }
    toString() {
        return `${this.symbol}+`;
    }
}

export function many1(symbol) {
    return new Many1Rule(symbol);
}

class OptionalRule extends Rule {
    constructor(symbol) {
        super();
        this.symbol = symbol;
        this.def([], () => null);
        this.def([symbol], ([e1]) => e1);
    }
    toString() {
        return `${this.symbol}?`;
    }
}

export function optional(symbol) {
    return new OptionalRule(symbol);
}

// TODO:
export function times(min, max = min) {
}

class SepByRule extends Rule {
    constructor(symbol, sepSymbol) {
        super();
        this.symbol = symbol;
        this.sepSymbol = sepSymbol;
        this.def([
            symbol,
            many(bind([sepSymbol, symbol], ([e1, e2]) => e2))
        ], ([e1, e2]) => [e1, ...e2]);
    }
    toString() {
        return `( ${this.symbol} % ${this.sepSymbol} )`;
    }
}

export function sepBy(symbol, sepSymbol) {
    return new SepByRule(symbol, sepSymbol);
}

class StringRule extends Rule {
    constructor(literal) {
        super();
        this.literal = literal;
        this.def(literal.split(''), (es) => literal);
    }
    toString() {
        return JSON.stringify(this.literal);
    }
}

export function string(literal) {
    return new StringRule(literal);
}

class RegexRule extends Rule {
    constructor(regex) {
        super();
        this.regex = regex;
        this.def([any], ([e1]) => {
            if (!regex.test(e1)) {
                return reject(`expect ${this}`);
            }
            return e1;
        });
    }
    toString() {
        return `${this.regex.source}`;
    }
}

export function regex(regex) {
    return new RegexRule(regex);
}

class StructRule extends Rule {
    constructor(class_, symbols) {
        super();
        this.def(symbols, (es) => {
            let obj = new class_();
            for (let e of es) {
                if (e instanceof Field) {
                    obj[e.key] = e.value;
                }
            }
            return obj;
        });
    }
}

export function struct() {
    let class_;
    let symbols;
    if (arguments.length === 1) {
        class_ = Object;
        symbols = arguments[0];
    } else {
        class_ = arguments[0];
        symbols = arguments[1];
    }
    return new StructRule(class_, symbols);
}

class Field {
    constructor(key, value) {
        this.key = key;
        this.value = value;
    }
}

class FieldRule extends Rule {
    constructor(key, symbol) {
        super();
        if (Array.isArray(symbol)) {
            this.def(symbol, (es) => new Field(key, es));
        } else {
            this.def([symbol], ([e1]) => new Field(key, e1));
        }
    }
}

export function field(key, symbol) {
    return new FieldRule(key, symbol);
}

//endregion
