/*
    The MIT License (MIT)

    Copyright (c) 2014 Oliver Moran

    Permission is hereby granted, free of charge, to any person obtaining a copy of
    this software and associated documentation files (the "Software"), to deal in
    the Software without restriction, including without limitation the rights to
    use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
    of the Software, and to permit persons to whom the Software is furnished to do
    so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
*/

(function () {
    "use strict";
    
    /* Bind all templates as soon as the DOM is ready. */
    document.addEventListener("DOMContentLoaded", function () {
        if (typeof Handlebars === "undefined") {
            console.warn("Handlebars.js must be included to use Pomade. http://handlebarsjs.com/");
        }

        _bindAll(); // kick off template bindings
    });

    // will store a list of bindings, to be used to manage bindings
    var _bindings = [];

    // a list of mime types of supported scripts
    var _mimetypes = [
        "application/x-handlebars-template",
        "application/x-handlebars",
        "text/x-handlebars-template",
        "text/x-handlebars"
    ];
    
    // a list of global HTML5 atributes to copy across when creating a new object element from a script tag
    var _globalAttrs = /^accesskey$|^class$|^contenteditable$|^contextmenu$|^data-.+$|^dir$|^draggable$|^dropzone$|^hidden$|^id$|^itemid$|^itemprop$|^itemref$|^itemscope$|^itemtype$|^lang$|^spellcheck$|^style$|^tabindex$|^title$/i;
    
    // a URL to use as for the data attribute of the handlebars object
    var _url = "handlebars:" + window.location.host + window.location.pathname + window.location.search;

    // Finds the global JS object for a given identifier string (e.g. "my.js.obj" will return window.my.js.obj)
    // If the object doesn't exit it will be created
    function _getGlobalObjectFromIdentifier(str) {
        var model = window;
        var children = str.split(".");
        
        while (children.length > 0) {
            var id = children.shift();
            if (model[id] == undefined) {
                model[id] = {};
            }
            model = model[id];
        }

        return model;
    }
    
    /**
     * Binds all templates in the DOM
     */
    function _bindAll() {
        // anything that has a "data-model" attribute is assumed to be a template
        var scripts = document.querySelectorAll("script[data-bind], script[data-model]");

        for (var i = 0; i < scripts.length; i++) {
            // the element element
            var script = scripts[i];
            var type = script.getAttribute("type");

            // if not of the right type then continue
            if (_mimetypes.indexOf(type) > -1) script.bind();
        }
    }
    
    /**
     * Bind a script tag to model (identified by the data-model attibute) and a 
     * template (the innerHTML of the script tag).
     */
    HTMLScriptElement.prototype.bind = function(){
        var model = this.getAttribute("data-bind");
        var shouldBind = true;
        
        if (model == null) {
            model = this.getAttribute("data-model");
            shouldBind = false;
        }
        
        if (model == null) {
            throw new Error("The HTMLScriptElement.bind method requires a model to be given either using the data-bind attribute or the data-model attribute.");
        }
        
        var template = Handlebars.compile(this.innerHTML);

        // replace the SCRIPT tag with a OBJECT tag
        var obj = document.createElement("object");
        obj.setAttribute("type", this.getAttribute("type")); // keep the type value
        obj.setAttribute("data", _url); // MUST include data for the sake of Firefox

        // copy over all the global attributes from the script tag to the object tag
        for (var j = 0; j < this.attributes.length; j++) {
            var name = this.attributes[j].nodeName;
            var value = this.attributes[j].value;

            if (_globalAttrs.test(name)) {
                obj.setAttribute(name, value);
            }
        }

        // replace the tag
        this.parentNode.replaceChild(obj, this);

        // initialise the binding/template
        var reference = _getGlobalObjectFromIdentifier(model);
        var binding = {
            model: model,
            reference: reference,
            clone: _clone(reference),
            template: template,
            element: obj,
            isBound: shouldBind
        };
        _update.call(binding.element, binding);
        _bindings.push(binding);
    }

    // this is the function that does the actual updating of a template, it should always be called 
    // using .call() so that 'this' is the HTMLObjectElement
    function _update(binding) {
        // the update event - fires when the model updates
        var html = binding.template(binding.reference);
        html = "<!-- pomade.js -->" + html; // always make sure there is *some* content
        this.innerHTML = html;
    }

    /**
     * Unbinds an element. An unbound element will have to be update explicitly.
     */
    HTMLObjectElement.prototype.unbind = function () {
        var _that = this;
        _bindings.forEach(function (binding, i, bindings) {
            if (binding.element === _that) {
                binding.isBound = false;
            }
        });
    };

    /**
     * Rebinds an HTMLObjectElement.
     */
    HTMLObjectElement.prototype.bind = function () {
        this.unbind(); // make sure we don't bind twice
        
        var _that = this;
        _bindings.forEach(function (binding, i, bindings) {
            if (binding.element === _that) {
                _update.call(binding.element, binding); // initialise the element with the model
                binding.isBound = true;
            }
        });
    };

    /**
     * Check to see if a HTMLObjectElement is bound.
     * @returns a Boolean true if the element is bound, false if it is not bound, 
     *          or undefined is the element is not under template control
     */
    HTMLObjectElement.prototype.isBound = function () {
        for (var i = 0; i < _bindings.length; i++) {
            if (_bindings[i].element == this) {
                return _bindings[i].isBound;
            }
        }
    };
    /*
     * Explicitly update an element from its template.
     */
    HTMLObjectElement.prototype.update = function () {
        var _that = this;
        _bindings.forEach(function (binding, i, bindings) {
            if (_that == binding.element) {
                binding.reference = _getGlobalObjectFromIdentifier(binding.model);
                _update.call(binding.element, binding)
            }
        });
    };
    
    // BINDINGS ENGINE
    
    // how often should we look for changes (12fps default)
    var _rate = 1e3/12;
    
    // compare the original and clone of bindings for changes
    function _compareBindings() {
        //console.time("_compareBindings");
        _bindings.forEach(function (binding, i, bindings) {
            if (!binding.isBound) return; // not bound so skip
            
            // get the actual variable for this identifier, and...
            var reference = _getGlobalObjectFromIdentifier(binding.model);
            // ...compare it to the clone
            if (!_isIdenticalTo(reference, binding.clone)) {
                binding.clone = _clone(reference);
                binding.reference = reference;
                _update.call(binding.element, binding);
            }
        });
        //console.timeEnd("_compareBindings");
        setTimeout(_compareBindings, _rate);
    }
    setTimeout(_compareBindings, _rate); // setTimeout rather than setInterval so they never overlap
    
    // deep clone an object (only it's own properties!)
    function _clone(obj) {
        var clone = {};
        var props = Object.getOwnPropertyNames(obj);

        for (var i = 0; i < props.length; i++) {
            if (obj[props[i]] instanceof Object) {
                // recursive clone
                clone[props[i]] = _clone(obj[props[i]]);
            } else {
                // copy property
                clone[props[i]] = obj[props[i]];
            }
        }
        return clone;
    }
    
    // compare to objects, return false if not identical, otherwise true
    function _isIdenticalTo(obj1, obj2) {
        // combine the props of both obj1 and obj2
        var props = Object.getOwnPropertyNames(obj1);
        props.concat(Object.getOwnPropertyNames(obj2));
        props = props.filter(function(elem, pos) {
            // filter out duplicates
            return props.indexOf(elem) == pos;
        });
        
        for (var i = 0; i < props.length; i++) {
            if (obj1[props[i]] instanceof Object && obj2[props[i]] instanceof Object) {
                var ret = _isIdenticalTo(obj1[props[i]], obj2[props[i]]);
                if (!ret) return false;
            } else {
                var ret = (obj1[props[i]] == obj2[props[i]]);
                if (!ret) return false;
            }
        }
        return true;
    }
})();