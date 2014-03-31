# Pomade.js #

Dead simple bindings for [Handlebars](http://handlebarsjs.com/).

## Quick start ##

Simply describe your template inline with your HTML using a script tag, as 
follows:

    <script type="application/x-handlebars" data-bind="model">
       <!-- Handlebars template goes here. -->
    </script>

Now, the template will be bound to the JavaScript Object `model` (or any other 
JS Object indicated by `data-bind` attribute). When that Object changes, the 
template will be automatically refreshed.

## Bound or unbound? ##

Pomade.js allows two methods of associating a template with a model. The model
can be bound or unbound. Bound templates are refreshed automatically (with a 
max 80⅓ms delay) when the model changes. Unbound templates need to be updated
explicitly.

Unbound templates are described using the `data-model` attribute (instead of
the `data-bind` attribute):

    <script type="application/x-handlebars" data-model="model">
       <!-- Handlebars template goes here. -->
    </script>

Alternatively, templates can be bound and unbound from their models as follows:

    document.getElementById("myTemplate").unbind();
    document.getElementById("myTemplate").bind();

When a template is unbounded, it needs to be updated explictly using:

    document.getElementById("myTemplate").update();

To test if a template is bound, use:

    document.getElementById("myTemplate").isBound(); // true or false

## Dynamically adding templates ##

Ordinarly, all templates in a `Document` will be compiled on the 
`DOMContentLoaded` event. If a template is added after this event (e.g. 
dynamically by JS) then the template will need to be compiled explicitly, as 
follows:

    document.getElementById("myTemplate").compile();

Compiling a script tag in this way implicitly repalces the HTMLScriptElement
with a HTMLObjectElement in the DOM.

If the HTMLScriptElement is created in JavaScript, it can be compiled and
added to the document explicitly, as follows:

    var obj = script.compile(); // returns a HTMLObjectElement
    document.body.appendChild(obj);

The object returned by `HTMLScriptElement.compile()` is the a HTMLObjectElement
that can be added to the DOM. See `examples/dynamic.html` for a working example.

## Useful info ##

- Pomade.js checks if a model is updated 12 times per second (every 83⅓ms).
- `<script>` tags are replaced with `<object>` tags when compiled. Global HTML5
  attributes are copied over (non-standard-compliant tags will be skipped).

## License ##

Pomade.JS is licensed under the [MIT License](http://opensource.org/licenses/MIT).