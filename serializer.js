'use strict';

class TOML {
    stringify(value, replacer, space) {
        this.space = space;
        if (replacer instanceof Function) this.replacer = replacer;
        if (Array.isArray(replacer)) {
            const filtered = replacer.reduce((acc, val) => {
                acc[val] = value[val];
                return acc;
            }, {});
            return this.serialize(filtered);
        }
        return this.serialize(value);
    }

    serialize(value, key, prefix, postfix) {
        const replaced = this.replacer ? this.replacer(key, value) : value;
        const serializer = this.rules[this.checkType(replaced)];
        if (!!serializer) return serializer(replaced, key, prefix, postfix);
    }

    checkType(el) {
        const type = typeof el;
        if (type === 'string') return 'string';
        if (type === 'number') return 'number';
        if (type === 'boolean') return 'boolean';
        if (Array.isArray(el)) {
            if (this.checkType(el[0]) === 'object') return 'objectArray';
            else return 'scalarArray';
        };
        if (el instanceof Date) return 'date';
        if (el !== null) return 'object';
    }

    rules = {
        string: (s, key = '', prefix = '', postfix = '') => prefix + key + `"${s}"` + postfix,
        number: (n, key = '', prefix = '', postfix = '') => prefix + key + n + postfix,
        boolean: (b, key = '', prefix = '', postfix = '') => prefix + key + b + postfix,
        date: (d, key = '', prefix = '', postfix = '') => prefix + key + d + postfix,
        scalarArray: (arr, key = '', prefix = '', postfix = '') => {
            const mapped = arr.map(el => this.serialize(el)).join(',');
            return `${prefix}${key}[${mapped}]${postfix}`;
        },
        objectArray: (arr, key, prefix = '', postfix = '') => {
            return arr.map(el => `${this.serialize(el, key, `${prefix}[`, `]${postfix}`)}`).join('');
        },
        object: (o, prev, prefix = '', postfix = '') => {
            let s = prev ? `${prefix}${prev}${postfix}` : '';
            const sorted = Object.entries(o).sort((a, b) => {
                const typeA = this.checkType(a[1]);
                const typeB = this.checkType(b[1]);
                return this.sortFields(typeA, typeB);
            });
            
            for (const [key, value] of sorted) {
                const type = this.checkType(value);
                const fixedKey = this.fixKey(key);
                const combinatedKey = prev ? `${prev}.${fixedKey}` : fixedKey;

                const space = this.additionalSpace(prefix);
                if (type === 'object' || type === 'objectArray') {
                    s += this.serialize(value, combinatedKey, space + '[', ']\n');
                } else {
                    s += this.serialize(value, `${fixedKey} = `, space, '\n')
                }
            }
            return s;
        }
    }

    sortFields(a, b) {
        if (a === b) return 0;
        if (a === 'object') return 1;
        if (b === 'object') return -1;
        return 0;
    }

    fixKey(key) {
        return key.includes('.') ? `"${key}"` : key;
    }

    additionalSpace(prefix) {
        const type = this.checkType(this.space);
        let s = ' ';
        let length = prefix.length;
        if (type === 'number') {
            length = prefix.length + this.space;
        }
        if (type === 'string') {
            s = this.space;
            length = prefix.length + this.space.length;
        }
        return s.repeat(length);
    }
}

const test = {
    a: 1,
    b: 'asdf',
    "c.r": { 
        d: { 
            e: true, 
            f: [2, 3, 4] 
        } ,
        l: 1
    },
    k: 2,
    g: [
        { y: 5, o: "9" },
        { q: [ { i: 1 }, {} ] },
        { x: { p: 19 } }
    ]
}
function booleanNotAllowed(key, value) {
    if (typeof value === 'boolean') return '<hidden>'
    return value;
}
const Toml = new TOML(); 
console.log(Toml.stringify(test, ['a', 'b', 'g'], '-'))
