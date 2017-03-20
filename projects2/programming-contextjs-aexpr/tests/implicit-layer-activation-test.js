'use strict';

import '../src/module_import.js';
import * as cop from '../src/Layers.js';
import { LayerableObject } from '../src/Layers.js';

import aexpr from 'aexpr-interpretation';

import './globalChai.js'

const expect = chai.expect;

function fixture() {
    return { prop: 17 }
}

describe('Implicit Layer Activation', function() {
    it('layers expose activeWhile', ()=>{
        let layer = new cop.Layer();
        expect(layer.activeWhile).to.be.a('function');
    });

    it('activates a layer when the expression result becomes true', () => {
        const obj = fixture(),
            layer = new cop.Layer().activeWhile(aexpr(() => obj.prop >= 33, {obj}));

        expect(layer.isActive()).to.be.false;

        obj.prop = 42;
        expect(layer.isActive()).to.be.true;
    });

    it('activates immediately if the condition is already true', () => {
        const obj = { prop: 42},
            layer = new cop.Layer().activeWhile(aexpr(() => obj.prop >= 33, {obj}));

        expect(layer.isActive()).to.be.true;

        obj.prop = 43;
        expect(layer.isActive()).to.be.true;
    });

    it('distinguishes multiple layers', () => {
        const obj1 = { prop: 17},
            obj2 = { prop: 42},
            locals = {obj1, obj2},
            l1 = new cop.Layer().activeWhile(aexpr(() => obj1.prop >= 33, locals)),
            l2 = new cop.Layer().activeWhile(aexpr(() => obj2.prop >= 33, locals));

        expect(l1.isActive()).to.be.false;
        expect(l2.isActive()).to.be.true;

        obj1.prop = 42;
        obj2.prop = 43;

        expect(l1.isActive()).to.be.true;
        expect(l2.isActive()).to.be.true;
    });

    it('deactivating an immediately activated layer', () => {
        const obj = { prop: 42},
            layer = new cop.Layer().activeWhile(aexpr(() => obj.prop >= 33, {obj}));

        expect(layer.isActive()).to.be.true;

        obj.prop = 17;

        expect(layer.isActive()).to.be.false;
    });

    it('jump between active and inactive', () => {
        const obj = { prop: 42},
            layer = new cop.Layer().activeWhile(aexpr(() => obj.prop >= 33, {obj}));
        expect(layer.isActive()).to.be.true;

        obj.prop = 17;
        expect(layer.isActive()).to.be.false;

        obj.prop = 42;
        expect(layer.isActive()).to.be.true;

        obj.prop = 17;
        obj.prop = 0;
        expect(layer.isActive()).to.be.false;

        obj.prop = 42;
        expect(layer.isActive()).to.be.true;
    });

    it('handle multiple implicitly activated layers', function() {
        const obj = fixture();

        const layer1 = new cop.Layer().activeWhile(aexpr(() => obj.prop > 10, {obj}));
        const layer2 = new cop.Layer().activeWhile(aexpr(() => obj.prop > 20, {obj}));
        expect(layer1.isActive()).to.be.true;
        expect(layer2.isActive()).to.be.false;

        obj.prop = 33;
        expect(layer1.isActive()).to.be.true;
        expect(layer2.isActive()).to.be.true;

        obj.prop = 0;
        expect(layer1.isActive()).to.be.false;
        expect(layer2.isActive()).to.be.false;
    });

    it('implicitly activated layers are in current layers', function() {
        const obj = fixture();

        const layer1 = new cop.Layer().activeWhile(aexpr(() => obj.prop > 10, {obj}));
        const layer2 = new cop.Layer().activeWhile(aexpr(() => obj.prop > 20, {obj}));
        expect(cop.currentLayers()).to.include(layer1);
        expect(cop.currentLayers()).not.to.include(layer2);

        obj.prop = 33;
        expect(cop.currentLayers()).to.include(layer1);
        expect(cop.currentLayers()).to.include(layer2);

        obj.prop = 0;
        expect(cop.currentLayers()).not.to.include(layer1);
        expect(cop.currentLayers()).not.to.include(layer2);
    });

    it('implicitly activated layers refine an object', () => {
        const obj = {
            prop: 17,
            f() { return 1; }
        };

        const layer = new Layer()
            .refineObject(obj, {
                f() {
                    return 3
                }
            }).activeWhile(aexpr(() => obj.prop === 17, {obj}));

        expect(obj.f()).to.equal(3);
        obj.prop = 13;
        expect(obj.f()).to.equal(1);
    });

    it('can refine multiple objects per layer', function() {
        const obj = fixture();

        const o1 = {f() {return 1}};
        const o2 = {f() {return 2}};
        const layer = new cop.Layer();

        layer.activeWhile(aexpr(() => obj.prop === 42, {obj}));
        layer.refineObject(o1, {
            f() {
                return 3
            },
        });
        layer.refineObject(o2, {
            f() {
                return 4 + cop.proceed();
            },
        });

        expect(o1.f()).to.equal(1);
        expect(o2.f()).to.equal(2);

        obj.prop = 42;

        expect(o1.f()).to.equal(3);
        expect(o2.f()).to.equal(6);
    });

    it('implicitly activated layers refine a class', () => {
        const obj = fixture();

        class Example {
            f() { return 1 }
        }
        const layer1 = new cop.Layer().refineClass(Example, {
            f() { return 2 + proceed() }
        });
        layer1.activeWhile(aexpr(() => obj.prop > 40, {obj}));

        const layer2 = new cop.Layer().refineClass(Example, {
            f() { return 3 + proceed() }
        });
        layer2.activeWhile(aexpr(() => obj.prop > 50, {obj}));

        const o = new Example();

        expect(o.f()).to.equal(1);
        obj.prop = 42;
        expect(o.f()).to.equal(3);
        obj.prop = 52;
        expect(o.f()).to.equal(6);
    });

    it('implicit layer activation is chainable', () => {
        const layer = new Layer();

        expect(layer === layer.activeWhile(aexpr(() => {}, {}))).to.be.true;
    });
});
