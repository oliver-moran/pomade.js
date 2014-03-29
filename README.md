# Pomade.js #

Dead simple bindings for [Handlebars](http://handlebarsjs.com/).

## Binding to a template ##

Simply describe your template inline with your HTML using a script tag, as follows:

    <script type="application/x-handlebars" ... >
       <!-- Handlebars template goes here. -->
    </script>

Ordinarly, templates will be bound when on the `DOMContentLoaded` event. If a template is added after this event, then the script will need to be compiled explicitly, as follows:

    document.getElementById('myTemplate').bind();

The JavaScript variable to bind to is identified using the `data-bind` attribute, as follows:

    <script type="application/x-handlebars" data-bind="myJsObject">
       <!-- Handlebars template goes here. -->
    </script>

When this variable is changes the template will be automatically refreshed.

Alternatively, if the `data-model` attribute is used, the template will not be automatically updated when the JavaScript variables changes:

    <script type="application/x-handlebars" data-model="jsObject" id="myTemplate">
       <!-- Handlebars template goes here. -->
    </script>

In this case, to update the template explicitly, call `document.getElementById('myTemplate').update()`.

## Unbinding a template ##

Templates can be unbounded as follows:

    document.getElementById('myTemplate').unbind();

When a template is unbounded is needs to be updated explictly using `document.getElementById('myTemplate').update()`.

To rebind a template use:

    document.getElementById('myTemplate').bind();

To test if a template is bound, use:

    document.getElementById('myTemplate').isBound();
