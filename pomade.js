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
            console.warn("Handlebars <http://handlebarsjs.com/> must be included to use Pomade.");
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

    // the HTMLObjectElement requires that there is always *some content* inside it, otherwise it can show up as 'plugin-missing'
    // this tagline is added to every template to ensure the content is never empty
    var _comment = "<!-- Templated with ❤ by Handlebars <http://handlebarsjs.com/> and Pomade <https://github.com/oliver-moran/pomade.js> -->";
    
    // Finds the global JS object for a given identifier string (e.g. "my.js.obj" will return window.my.js.obj)
    // If the object doesn't exit it will be created
    function _getGlobalObjectFromIdentifier(str) {
        if (typeof str != "string") {
            throw new Error("No JavaScript model was given. The data-bind or data-model attribute is missing from the HTML element.");
        }
        
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
        var scripts = document.querySelectorAll("script");

        for (var i = 0; i < scripts.length; i++) {
            // the element element
            var script = scripts[i];
            var type = script.getAttribute("type");

            // if not of the right type then continue
            if (_mimetypes.indexOf(type) > -1) script.compile();
        }
    }
    
    /**
     * Compiles a template (the innerHTML of the script tag) against a model 
     * (identified by the data-bind or data-model attibutes).
     * @returns the HTMLObjectElement that replaces the HTMLScriptElement in the DOM
     */
    HTMLScriptElement.prototype.compile = function(){
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

        // replace the tag (if we can)
        if (this.parentNode) this.parentNode.replaceChild(obj, this);

        // initialise the binding/template
        var model = this.getAttribute("data-bind") || this.getAttribute("data-model");
        var reference = _getGlobalObjectFromIdentifier(model);
        var binding = {
            reference: reference,
            clone: _clone(reference),
            template: template,
            element: obj
        };
        _update.call(binding.element, binding);
        _bindings.push(binding);
        
        return obj;
    }
    
    /**
     * A courtesy method that compiles a script if update is acc
     */
    HTMLScriptElement.prototype.update = HTMLScriptElement.prototype.compile;

    // this is the function that does the actual updating of a template, it should always be called 
    // using .call() so that 'this' is the HTMLObjectElement
    function _update(binding) {
        // the update event - fires when the model updates
        var html = binding.template(binding.reference);
        // always make sure there is something inside the object tag, otherwise it shows a plugin-missing
        html = _comment + html;
        this.innerHTML = html;
    }

    /**
     * Unbinds an element. An unbound element will have to be update explicitly.
     */
    HTMLObjectElement.prototype.unbind = function () {
        var model = this.getAttribute("data-bind") || this.getAttribute("data-model");
        this.removeAttribute("data-bind");
        this.setAttribute("data-model", model);
    };

    /**
     * Rebinds an HTMLObjectElement.
     */
    HTMLObjectElement.prototype.bind = function () {
        var model = this.getAttribute("data-bind") || this.getAttribute("data-model");
        this.setAttribute("data-bind", model);
        this.removeAttribute("data-model");
        this.update(); // update so that it refreshed immediately
    };

    /**
     * Check to see if a HTMLObjectElement is bound.
     * @returns a Boolean true if the element is bound, false if it is not bound, 
     *          or undefined is the element is not under template control
     */
    HTMLObjectElement.prototype.isBound = function () {
        return this.getAttribute("data-bind") != null;
    };
    
    /*
     * Explicitly update an element from its template.
     */
    HTMLObjectElement.prototype.update = function () {
        var model = this.getAttribute("data-bind") || this.getAttribute("data-model");
        var binding = getBindingForElement(this);
        binding.reference = _getGlobalObjectFromIdentifier(model);
        _update.call(this, binding)
    };
    
    // finds a binding for a particular element in the _bindings array
    function getBindingForElement(el) {
        for (var i = 0; i < _bindings.length; i++) {
            if (_bindings[i].element == el) return _bindings[i];
        }
        throw new Error("Cannot find binding for HTMLObjectElement.");
    }
    
    // BINDINGS ENGINE
    
    // how often should we look for changes (12fps default)
    var _rate = 1e3/12;
    
    // kick off the main loop
    setInterval(function () {
        _bindings.forEach(_compareBindings);
    }, _rate);
    
    // compares individual bindings (as part of a forEach loop)
    function _compareBindings(binding, i, bindings) {
        if (!binding.element) {
            // use this opportunity to clean up bindings
            bindings.splice(i, 1);
            return;
        }
        if (!binding.element.isBound()) return; // not bound so skip

        // get the actual variable for this identifier, and...
        var model = binding.element.getAttribute("data-bind") || binding.element.getAttribute("data-model");
        var reference = _getGlobalObjectFromIdentifier(model);
        // ...compare it to the clone
        if (!_isIdenticalTo(reference, binding.clone)) {
            binding.clone = _clone(reference);
            binding.reference = reference;
            _update.call(binding.element, binding);
        }
    }
    
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
        props = props.concat(Object.getOwnPropertyNames(obj2));
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