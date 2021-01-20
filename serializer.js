'use strict';

class TOML {
    static stringify(value, replacer, space, key) {
        const serializer = this.rules[this.checkType(value)];
        if (!!serializer) {
            if (!replacer) return serializer(value, key)
            if (Array.isArray(replacer)) return serializer({ value, ...replacer }, key);
            else if (replacer instanceof Function) return serializer(replacer(key, value), key)
        }
    }

    static checkType(el) {
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

    static rules = {
        string: s => `"${s}"`,
        number: n => n.toString(),
        boolean: b => b.toString(),
        date: d => d.toString(),
        scalarArray: arr => {
            const mapped = arr.map(el => this.stringify(el)).join(',');
            return `[${mapped}]`;
        },
        objectArray: (arr, key) => {
            let s = ``;

            for (const value of arr) {
                s += `[[${key}]]\n${this.stringify(value, undefined, undefined, key)}\n`
            }
            
            return s;
        },
        object: (o, prev) => {
            let s = '';
            const sorted = Object.entries(o).sort((a, b) => {
                const typeA = this.checkType(a[1]);
                const typeB = this.checkType(b[1]);
                return this.sortFields(typeA, typeB);
            });
            
            for (const [key, value] of sorted) {
                const fixedKey = this.fixKey(key);

                const type = this.checkType(value);
                const combinatedKey = prev ? `${prev}.${fixedKey}` : fixedKey;

                if (type === 'object') {
                    s += `[${combinatedKey}]\n`;
                } else if (type !== 'objectArray') {
                    s += `${key} = `;
                }

                s += `${this.stringify(value, undefined, undefined, combinatedKey)}\n`
            }
            return s;
        }
    }

    static sortFields(a, b) {
        if (a === b) return 0;
        if (a === 'object') return 1;
        if (b === 'object') return -1;
        return 0;
    }

    static fixKey(key) {
        return key.includes('.') ? `"${key}"` : key;
    }
}

const test = {
    a: 1,
    b: 'asdf',
    "c.r": { 
        d: { 
            e: 1, 
            f: [2, 3, 4] 
        } ,
        l: 1
    },
    k: 2,
    g: [{ y: 5, o: "9" }, { q: [{}, {}] }]
}

console.log(TOML.stringify(test))
// const entries = Object.entries(test);
