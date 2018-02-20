/**
 * Context menu
 *
 * A small library with no dependencies to help you create custom context menus.
 *
 * This library is based on the custom-context-menu JavaScript library,
 * converted to TypeScript and updated to enable users to access context menus
 * using methods other than right click, implementing a consistent, class based
 * structure for menu items, dividers and sub menus
 *
 * @author	Neil Rackett <https://github.com/neilrackett>
 * @author	Matthew Mamonov <https://github.com/smellyshovel>
 * @license	GPL-3.0
 */
export class ContextMenu
{
	public openedCSM:any;

	protected cm:HTMLElement;
	protected eventListeners:any[];
	protected itemsToRender:any[];
	protected overlay:HTMLElement;
	protected options:ContextMenuOptions;
	protected parent:ContextMenu;
	protected closeTimer:number;
	protected target:any;
	protected timer:number;

	private _open:(event:MouseEvent) => void = function(){};

	constructor(options?:ContextMenuOptions, target?:HTMLElement, eventType:string='contextmenu')
	{
		options || (options = {});
		options.items || (this.options.items = []);

		// store options as a property to have an access to it in the methods
		this.options = options;

		if (this instanceof ContextMenuSubMenu) return;

		// execute callback when CM invokation event happend
		let open = (event:MouseEvent) =>
		{
			// prevent global namespace polluting by multiple assignment
			let scrollingDisabled:any, overflow:any;

			if (this.options.opening)
			{
				this.options.opening(this);
			}

			// prepare and draw overlay if needed
			if (this.options.overlay !== false)
			{
				// force disable scrolling if using an overlay
				scrollingDisabled = overflow = this._disableScrolling();

				this._prepareOverlay();
				this._drawOverlay();
			}
			else
			{
				// disable scrolling unless it's not explicitly allowed
				if (!this.options.scrolling)
				{
					scrollingDisabled = overflow = this._disableScrolling();
				}
			}

			// prepare items and CM with this items
			this._prepareItems();
			this._prepareCM();

			// calculate the position of the CM and draw it there
			let pos = this._calculatePosition(event);
			this._drawCM(pos);

			// execute open callback (or a blank function if none)
			this._getCallback('open')();

			// execute callback when CM close happened
			this._listenToCMClosed((event:any) =>
			{
				// close CM (with nested)
				this.close();

				// enable scrolling back
				if (scrollingDisabled)
				{
					this._enableScrolling(overflow);
				}

				// execute close callback (or a blank function if none)
				this._getCallback('close')();
			});
		};

		if (target && eventType)
		{
			this._addContextMenuListener(target, open, eventType);
		}

		this._open = open;
	}

	public open(event:MouseEvent):this
	{
		this._open(event);
		return this;
	}

	public close():this
	{
		this._prepareForClose(true);

		// remove the overlay if it's present else remove CM directly
		this.overlay
			? this.overlay.remove()
			: this.cm.remove()
			;

		return this;
	}

	public addItem(item:ContextMenuItem|ContextMenuDivider|ContextMenuSubMenu):this
	{
		this.items.push(item);
		return this;
	}

	public get items():any[]
	{
		return this.options.items;
	}

	protected _getCallback(after:string):Function
	{
		if ('callback' in this.options)
		{
			let callback = this.options.callback;

			if (after === 'open')
			{
				if (typeof callback === 'function')
				{
					return callback;
				}

				if ('open' in callback && typeof callback.open === 'function')
				{
					return callback.open;
				}
			}
			else if (after === 'close')
			{
				if ('close' in callback && typeof callback.close === 'function')
				{
					return callback.close;
				}
			}
		}

		return function() {};
	}

	protected _getRoot():ContextMenu
	{
		let parent:ContextMenu = this;

		while (parent.parent)
		{
			parent = parent.parent;
		}

		return parent;
	}

	protected _disableScrolling():string
	{
		// save the pravious state of overflow property
		let previousState = getComputedStyle(document.documentElement).overflow;

		// disable scrolling via overflow set to `hidden`
		document.documentElement.style.overflow = 'hidden';

		return previousState;
	}

	protected _enableScrolling(state:string):void
	{
		// return the overflow property to the previous state
		document.documentElement.style.overflow = state;
	}

	protected _addContextMenuListener(target:HTMLElement, callback:Function, type:string='contextmenu'):void
	{
		target.addEventListener(type, (event:MouseEvent) =>
		{
			event.stopPropagation();

			// if defaultOnAlt is true then check whether the alt key was not
			// holded when the event was triggered or it was. If it was then the
			// code below just won't be executed
			if (!(this.options.defaultOnAlt && event.altKey))
			{
				// prevent default CM to appear
				event.preventDefault();

				// if the CM is not disabled
				if (!this.options.disabled) callback(event);
			}
		});
	}

	protected _listenToCMClosed(callback:Function)
	{
		// allow using noRecreate param only for CMs with overlay
		let noRecreate = this.options.overlay && this.options.noRecreate;

		// store close event listeners as an array to easily remove them in #close()
		if (noRecreate)
		{
			this.eventListeners =
			[
				{
					t: document,
					e: 'mousedown',
					cb: (event:any) =>
					{
						if (event.which !== 3) callback(event);
					}
				},

				{
					t: this.overlay,
					e: 'contextmenu',
					cb: (event:any) =>
					{
						event.stopPropagation();
						event.preventDefault();

						callback(event);
					}
				}
			];
		}
		else
		{
			this.eventListeners =
			[
				{
					t: document,
					e: 'mousedown',
					cb: (event:any) => callback(event)
				},
			];
		}

		// add keydown event either the CM has an overlay or not
		this.eventListeners.push
		({
				t: document,
				e: 'keydown',
				cb: (event:any) =>
				{
					if (event.keyCode === 27) callback(event);
				}
			}
		);

		// add previously defined event listeners
		this.eventListeners.forEach(function(eventListener)
		{
			eventListener.t.addEventListener(eventListener.e, eventListener.cb, false);
		});
	}

	/**
	 * Create the overlay element
	 */
	protected _prepareOverlay()
	{
		this.overlay = document.createElement('div');
		this.overlay.classList.add('contextmenu-overlay');

		if (this.options.id)
		{
			this.overlay.classList.add(`contextmenu-${this.options.id}`);
		}

		let scrollLeft = document.documentElement.scrollLeft,
			scrollTop = document.documentElement.scrollTop,
			width = scrollLeft + document.documentElement.clientWidth,
			height = scrollTop + document.documentElement.clientHeight;

		this.overlay.style.position = 'absolute';
		this.overlay.style.display = 'block';
		this.overlay.style.left = '0';
		this.overlay.style.top = '0';
		this.overlay.style.width = width + 'px';
		this.overlay.style.height = height + 'px';
		this.overlay.style.visibility = 'hidden';
		this.overlay.style.zIndex = '2147483645';

		document.body.appendChild(this.overlay);
	}

	protected _prepareItems()
	{
		// everything that is going to be rendered in the CM
		this.itemsToRender = this.options.items.map((item:any) =>
		{
			if (item instanceof ContextMenuDivider)
			{
				let node = document.createElement('div');
				node.classList.add('contextmenu-divider');

				return node;
			}

			let text = document.createTextNode(item.title);
			let node = document.createElement('li');

			node.classList.add('contextmenu-item');
			node.appendChild(text);

			if (item.disabled) node.classList.add('contextmenu-disabled');

			// if the purpose of the item is to open another CM
			if (item.listener instanceof ContextMenuSubMenu)
			{
				// ensure that given param's type is number else make it equals zero
				let openDelay = (item.listener.options.delayOpen || 0) * 1000;

				node.classList.add('contextmenu-submenu');

				node.addEventListener('mouseenter', (event:any) =>
				{
					this.timer = setTimeout(() =>
					{
						if (!this.openedCSM)
						{
							// open new CSM
							this.openedCSM = item.listener._init(this, node);

							// if CSM is already opened but mouse entered another item
							// that is also opens a CSM
						}
						else if (this.openedCSM !== item.listener)
						{
							// close existing CSM and open a new one
							this.openedCSM.close();
							this.openedCSM = item.listener._init(this, node);
						}
					}, openDelay);
				});

				node.addEventListener('mouseleave', (event:MouseEvent) => clearTimeout(this.timer), false);

				// open CSM immidiatly
				node.addEventListener('mousedown', (event:MouseEvent) =>
				{
					clearTimeout(this.timer);

					if (!this.openedCSM)
					{
						this.openedCSM = item.listener._init(this, node);
						// unless event occurred on the same item again
					}
					else if (this.openedCSM !== item.listener)
					{
						this.openedCSM.close();
						this.openedCSM = item.listener._init(this, node);
					}
				});
			}
			// if the purpose of the item is to execute the given function
			else
			{
				// this timeout is needed to prevent an item to be treated as
				// 'mouseupped' in case of random mouse movement right after
				// the CM has been opened
				node.addEventListener('mouseup', (event:MouseEvent) =>
				{
					event.preventDefault();
					event.stopPropagation();

					// close all the CMs and then execute the given function
					this._getRoot().close();
					item.listener();
				});
			}

			// prevent CM close
			node.addEventListener('mousedown', (event:MouseEvent) => event.stopPropagation());

			node.addEventListener('contextmenu', (event:MouseEvent) =>
			{
				event.stopPropagation();
				event.preventDefault();
			});

			return node;
		});
	}

	protected _prepareCM()
	{
		// create the CM element
		this.cm = document.createElement('ol');
		this.cm.classList.add('contextmenu');

		// necsessary styles
		this.cm.style.position = 'absolute';
		this.cm.style.display = 'block';
		this.cm.style.visibility = 'hidden';
		this.cm.style.zIndex = '2147483646';

		// make every item the child of the CM
		this.itemsToRender.forEach((item) =>
		{
			this.cm.appendChild(item);
		});

		// render CM/CSM in the overlay if it presents or in the body if not
		if (this._getRoot().overlay)
		{
			this._getRoot().overlay.appendChild(this.cm);
		}
		else
		{
			document.body.appendChild(this.cm);
		}
	}

	protected _drawOverlay():void
	{
		// make overlay visible
		this.overlay.style.visibility = 'visible';
	}

	protected _drawCM(pos:any):void
	{
		// make CM visible on the calculated position
		this.cm.style.left = pos.x + 'px';
		this.cm.style.top = pos.y + 'px';
		this.cm.style.visibility = 'visible';

		// add css transitions and animations
		this.cm.classList.remove('contextmenu-invisible');
		this.cm.classList.add('contextmenu-visible');
	}

	protected _prepareForClose(triggeredByRoot:any):void
	{
		this.openedCSM && this.openedCSM.close(triggeredByRoot);

		clearTimeout(this.timer);
		clearTimeout(this.closeTimer);

		this.eventListeners.forEach((eventListener) =>
		{
			eventListener.t.removeEventListener(eventListener.e, eventListener.cb);
		});
	}

	protected _calculatePosition(event:any):any
	{
		let viewportWidth = document.documentElement.clientWidth,
			viewportHeight = document.documentElement.clientHeight,

			clickedX = (event.clientX > viewportWidth) ? viewportWidth : event.clientX,
			clickedY = (event.clientY > viewportHeight) ? viewportHeight : event.clientY,

			cmBounds = this.cm.getBoundingClientRect(),
			cmWidth = cmBounds.width,
			cmHeight = cmBounds.height,

			// furthest means the point that is opposite to the one FROM which the
			// cM will be rendered
			furthestX = clickedX + cmWidth,
			furthestY = clickedY + cmHeight,

			// offset by 1 to ensure nothing is selected when the menu opens
			pos = {x:++clickedX, y:++clickedY};

		if (furthestX > viewportWidth)
		{
			if (this.options.transfer) pos.x -= cmWidth;
			else pos.x = viewportWidth - cmWidth;
		}

		if (furthestY > viewportHeight)
		{
			if (this.options.transfer) pos.y -= cmHeight;
			else pos.y = viewportHeight - cmHeight;
		}

		// bear in mind that page could be scrolled
		pos.x += document.documentElement.scrollLeft;
		pos.y += document.documentElement.scrollTop;

		return pos;
	}
}

export class ContextMenuSubMenu extends ContextMenu
{
	protected callee:HTMLElement;

	constructor(options?:any)
	{
		super(options);
	}

	public close(triggeredByRoot?:boolean):this
	{
		// all the 'clearing' stuff before close
		super._prepareForClose.call(this);

		// close CSM immidiatly if close was triggered by the root CM (specifically
		// the root CM close)
		if (triggeredByRoot)
		{
			this.cm.remove();
		}
		else
		{
			// if close was triggered by for exmaple mouseleave on CSM, then
			// we should check whether this CSM has transition property or not
			// if it does then we remove the CSM right after the transition is over
			// if it doesn't then we remove it right on the way. This check is
			// necsessary, because the transitionend event simply won't work if no
			// transition provided (or it's duration equals zero).
			let transition = parseInt((getComputedStyle(this.cm)).transitionDuration) > 0;

			if (transition)
			{
				// add css transitions and animations
				this.cm.classList.remove('contextmenu-visible');
				this.cm.classList.add('contextmenu-invisible');
				this.cm.addEventListener('transitionend', (event:any) => this.cm.remove(), false);
			}
			else
			{
				this.cm.remove();
			}
		}

		// tell the parent CM/CSM that it no longer have the opened CSM
		this.parent.openedCSM = null;

		return this;
	}

	// the differences in the logics between the ContextMenu and ContextSubMenu are
	// that all the 'preparing' stuff for the ContextMenu happens right when the new
	// instance of it is created. But for the ContextSubMenu it happens in the
	// init() method which is called only when the CSM is going to be opened.
	protected _init(parent:ContextMenu, callee:HTMLElement)
	{
		// the parent is the CM/CSM that has the 'li' that opened this CSM
		this.parent = parent;
		// the callee is the 'li' element mentioned above
		this.callee = callee;

		// prepare items and CSM with this items
		this._prepareItems(); // from ContextMenu
		this._prepareCM(); // form ContextMenu

		// calculate the position of the CM and draw it there
		let pos = this._calculatePosition(callee);
		this._drawCM(pos); // from ContextMenu

		// execute open callback (or a blank function if none)
		this._getCallback('open')();

		// execute callback when CSM close happened
		this._listenToCSMClosed((event:any) =>
		{
			// if the CSM was not closed already
			if (this.parent.openedCSM)
			{
				// close CM (with nested)
				this.close();

				// execute open callback (or a blank function if none)
				this._getCallback('close')();
			}
		});

		return this;
	}

	protected _listenToCSMClosed(callback:Function)
	{
		// ensure that given param's type is number else make it equals zero
		let closeDelay = (this.options.delayClose || 0) * 1000;

		this.eventListeners =
		[
			{ // if mouse leaves the callee (CSM untouched)
				t: this.callee,
				e: 'mouseleave',
				f: (event:any) =>
				{
					this.closeTimer = setTimeout(() => callback(event), closeDelay);
				}
			},

			{ // if mouse returns to the callee
				t: this.callee,
				e: 'mouseenter',
				f: (event:any) => clearTimeout(this.closeTimer)
			},

			// tODO: think about this behavior. May be it's better to add mouseenter to this.parent.cm
			{ // if mouse retuns to the parent CM (or CSM)
				t: this.cm,
				e: 'mouseleave',
				f: (event:any) =>
				{
					// if there is an opened CSM by this CSM
					if (this.openedCSM)
					{
						// and if mouse leaved somwhere not to it's CSM
						if (event.toElement !== this.openedCSM.cm)
						{
							this.closeTimer = setTimeout(() => callback(event), closeDelay);
						}
					}
					else
					{
						this.closeTimer = setTimeout(() => callback(event), closeDelay);
					}
				}
			},

			{ // if the mouse enters the CSM
				t: this.cm,
				e: 'mouseenter',
				f: (event:any) => clearTimeout(this.closeTimer)
			}
		];

		// add previously defined event listeners
		this.eventListeners.forEach((eventListener:any) =>
		{
			eventListener.t.addEventListener(eventListener.e, eventListener.fm, false);
		});
	}

	protected _calculatePosition(li:HTMLElement)
	{
		let viewportWidth = document.documentElement.clientWidth,
			viewportHeight = document.documentElement.clientHeight,

			liBounds = li.getBoundingClientRect(),

			liTop = liBounds.top,
			liBottom = liBounds.bottom,
			liLeft = liBounds.left,
			liRight = liBounds.right,

			cmBounds = this.cm.getBoundingClientRect(),
			cmWidth = cmBounds.width,
			cmHeight = cmBounds.height,

			// furthest means the point that is opposite to the one FROM which the
			// cM will be rendered
			furthestX = liRight + cmWidth,
			furthestY = liTop + cmHeight,

			pos = {x: liRight, y: liTop};

			if (furthestX > viewportWidth) pos.x = liLeft - cmWidth;
			if (furthestY > viewportHeight) pos.y = liBottom - cmHeight;

			// bear in mind that page could be scrolled
			pos.x += document.documentElement.scrollLeft;
			pos.y += document.documentElement.scrollTop;

			return pos;
	}
}

/**
 * Context menu item
 */
export class ContextMenuItem
{
	public title:string;
	public listener:Function|ContextMenuSubMenu;
	public disabled:boolean;

	constructor(title:string, listener:Function|ContextMenuSubMenu, disabled:boolean=false)
	{
		this.title = title;
		this.listener = listener;
		this.disabled = disabled;
	}

	public get isSubMenu():boolean
	{
		return this.listener instanceof ContextMenuSubMenu;
	}
}

/**
 * ContextMenuDivider
 */
export class ContextMenuDivider {}

/**
 * Context menu options
 */
export interface ContextMenuOptions
{
	callback?:any;
	defaultOnAlt?:boolean;
	delayOpen?:number;
	delayClose?:number;
	disabled?:boolean;
	id?:string;
	items?:any[];
	noRecreate?:boolean;
	opening?:Function;
	overlay?:boolean;
	scrolling?:boolean;
	transfer?:boolean;
}