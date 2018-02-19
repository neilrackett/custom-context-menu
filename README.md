# Custom Context Menu

Create custom context menus with unlimited sub-menus for your web site or application with _no dependencies_ and using less than 2KB (minified and gzipped).

## Content
1. [Installation](#installation)
1. [Usage](#usage)
    * [Nested Context Menues](#nested-context-menues)
1. [Contribution](#contribution)

## [Installation](#installation)

1. Using NPM:

```bash
$ npm install https://github.com/neilrackett/custom-context-menu/ --save
```

1. Standalone

Download the [latest version](https://github.com/neilrackett/custom-context-menu/releases) of this package and add `ContextMenu.ts` to your class library.

## [Usage](#usage)

All you have to do in order to get your custom context menu working is import the classes and create a `new ContextMenu()` with an options object, as defined by `IContextMenuOptions`, and (optionally) the target element and a mouse or pointer event type:

```javascript
import { ContextMenu, ContextMenuItem, ContextMenuDivider, ContextMenuSubMenu } from './path/to/ContextMenu';

new ContextMenu(
    {
        transfer: false, // do not transfer the Context Menu if it doesn't fit on the page. Istead, draw it right in the corner
        overlay: true, // use overlay so the user can't interact with the rest of the page while the Context Menu is opened
        defaultOnAlt: false, // pretend the default (browser's) Context Menu to be opened even if user was holding the `alt` key when invoked the Context Menu
        noRecreate: true, // do not open another Context Menu after the first one has been closed via rightclick

        items: [ // the items of your menu
            new ContextMenuItem("Menu Item", () => alert("It's alive!"),
            new ContextMenuDivider(),
            new ContextMenuItem("Another Menu Item", makeSomethingAwesome)
        ]
    },
    document,
    'contextmenu' // The event that opens the context menu (defaults to 'contextmenu', use null for none)
);
```

The only mandatory property in the options object is `items`, which is an array of items your context menu should contain.

If you assign a `ContextMenu` instance to a variable you can manually open and close the context menu in code:

```javascript
let myContextMenu = new ContextMenu({ /* params */ }, document});

myContextMenu.open(event); // Pass in the related mouse or pointer event to ensure the correct position
myContextMenu.close();
```

### [Nested Context Menues](#nested-context-menues)

This library enables you to create an _unlimited_ number of nested context menus. All you have to do is make a `ContextMenuItem`'s handler property a `ContextMenuSubMenu` instance:

```javascript
new ContextMenu(document, {
    items: [
        new ContextMenuItem("Nested Context Menu", new ContextMenuSubMenu({ /* params */ }))
    ]
});
```

## [Contribution](#contribution)

I don't currently have any contribution manifest nor styleguides. Nevertheless, I'm open for any kind of contribution you can offer. So don't be shy to make a pull request.
