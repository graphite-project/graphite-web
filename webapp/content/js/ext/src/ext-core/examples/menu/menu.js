/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/*
 * Ext Core Library Examples 3.0 Beta
 * http://extjs.com/
 * Copyright(c) 2006-2009, Ext JS, LLC.
 * 
 * The MIT License
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */

Ext.ns('Ext.ux');

Ext.ux.Menu = Ext.extend(Ext.util.Observable, {
    direction: 'horizontal',
    delay: 0.2,
    autoWidth: true,
    transitionType: 'fade',
    transitionDuration: 0.3,
    animate: true,
    currentClass: 'current',

    constructor: function(elId, config) {
        config = config || {};
        Ext.apply(this, config);

        Ext.ux.Menu.superclass.constructor.call(this, config);

        this.addEvents(
            'show',
            'hide',
            'click'
        );

        this.el = Ext.get(elId);

        this.initMarkup();
        this.initEvents();

        this.setCurrent();
    },

    initMarkup: function(){
        this.container = this.el.wrap({cls: 'ux-menu-container', style: 'z-index: ' + --Ext.ux.Menu.zSeed});
        this.items = this.el.select('li');

        this.el.addClass('ux-menu ux-menu-' + this.direction);
        this.el.select('>li').addClass('ux-menu-item-main');

        this.el.select('li:has(>ul)').addClass('ux-menu-item-parent').each(function(item) {
            item.down('a')
                .addClass('ux-menu-link-parent')
                .createChild({tag: 'span', cls: 'ux-menu-arrow'});
        });
        
        this.el.select('li:first-child>a').addClass('ux-menu-link-first');
        this.el.select('li:last-child>a').addClass('ux-menu-link-last');

        // create clear fixes for the floating stuff
        this.container.addClass('ux-menu-clearfix');

        // if autoWidth make every submenu as wide as its biggest child;
        if(this.autoWidth) {
            this.doAutoWidth();
        }

        var subs = this.el.select('ul');
        subs.addClass('ux-menu-sub');
        
        //ie6 and ie7/ie8 quirksmode need iframes behind the submenus
        if(Ext.isBorderBox || Ext.isIE7) {
            subs.each(function(item) {
                item.parent().createChild({tag: 'iframe', cls: 'ux-menu-ie-iframe'})
                    .setWidth(item.getWidth())
                    .setHeight(item.getHeight());
            });
        }
        
        subs.addClass('ux-menu-hidden');
    },

    initEvents: function() {
        this.showTask = new Ext.util.DelayedTask(this.showMenu, this);
        this.hideTask = new Ext.util.DelayedTask(function() {
            this.showTask.cancel();
            this.hideAll();
            this.fireEvent('hide');
        }, this);

        this.el.hover(function() {
            this.hideTask.cancel();
        }, function() {
            this.hideTask.delay(this.delay*1000);
        }, this);

        // for each item that has a submenu, create a mouseenter function that shows its submenu
        // delay 5 to make sure enter is fired after mouseover
        this.el.select('li.ux-menu-item-parent').on('mouseenter', this.onParentEnter, false, {me: this, delay: 5});

        // listen for mouseover events on items to hide other items submenus and remove hovers
        this.el.on('mouseover', function(ev, t) {
            this.manageSiblings(t);
            // if this item does not have a submenu, the showMenu task for a sibling could potentially still be fired, so cancel it
            if(!Ext.fly(t).hasClass('ux-menu-item-parent')) {
                this.showTask.cancel();
            }
        }, this, {delegate: 'li'});

        this.el.on('click', function(ev, t) {
            return this.fireEvent('click', ev, t, this);
        }, this, {delegate: 'a'})
    },

    onParentEnter: function(ev, link, o) {
        var item = Ext.get(this),
            me = o.me;

        // if this item is in a submenu and contains a submenu, check if the submenu is not still animating
        if(!item.hasClass('ux-menu-item-main') && item.parent('ul').hasActiveFx()) {
            item.parent('ul').stopFx(true);
        }

        // if submenu is already shown dont do anything
        if(!item.child('ul').hasClass('ux-menu-hidden')) {
            return;
        }
        
        me.showTask.delay(me.delay*1000, false, false, [item]);   
    },

    showMenu : function(item) {
        var menu = item.child('ul'),
            x = y = 0;

        item.select('>a').addClass('ux-menu-link-hover');

        // some different configurations require different positioning
        if(this.direction == 'horizontal' && item.hasClass('ux-menu-item-main')) {
            y = item.getHeight()+1;
        }
        else {
            x = item.getWidth()+1;
        }

        // if its ie, force a repaint of the submenu
        if(Ext.isIE) {
            menu.select('ul').addClass('ux-menu-hidden');
            // ie bugs...
            if(Ext.isBorderBox || Ext.isIE7) {
                item.down('iframe').setStyle({left: x + 'px', top: y + 'px', display: 'block'});
            }
        }

        menu.setStyle({left: x + 'px', top: y + 'px'}).removeClass('ux-menu-hidden');

        if(this.animate) {
            switch(this.transitionType) {
                case 'slide':
                    if(this.direction == 'horizontal' && item.hasClass('ux-menu-item-main')) {
                        menu.slideIn('t', {
                            duration: this.transitionDuration
                        });
                    }
                    else {
                        menu.slideIn('l', {
                            duration: this.transitionDuration
                        });
                    }
                break;

                default:
                    menu.setOpacity(0.001).fadeIn({
                        duration: this.transitionDuration
                    });
                break
            }
        }
        
        this.fireEvent('show', item, menu, this);
    },

    manageSiblings: function(item) {
        var item = Ext.get(item);
        item.parent().select('li.ux-menu-item-parent').each(function(child) {
            if(child.dom.id !== item.dom.id) {
                child.select('>a').removeClass('ux-menu-link-hover');
                child.select('ul').stopFx(false).addClass('ux-menu-hidden');
                if (Ext.isBorderBox || Ext.isIE7) {
                    child.select('iframe').setStyle('display', 'none');
                }
            }
        });
    },

    hideAll: function() {
        this.manageSiblings(this.el);
    },
    
    setCurrent: function() {
        var els = this.el.query('.' + this.currentClass);
        if(!els.length) {
            return;
        }
        var item = Ext.get(els[els.length-1]).removeClass(this.currentClass).findParent('li', null, true);
        while(item && item.parent('.ux-menu')) {
            item.down('a').addClass(this.currentClass);
            item = item.parent('li');
        }
    },

    doAutoWidth: function() {
        var fixWidth = function(sub) {
            var widest = 0;
            var items = sub.select('>li');

            sub.setStyle({width: 3000 + 'px'});
            items.each(function(item) {
                widest = Math.max(widest, item.getWidth());
            });

            widest = Ext.isIE ? widest + 1 : widest;
            items.setWidth(widest + 'px');
            sub.setWidth(widest + 'px');
        }

        if(this.direction == 'vertical') {
            this.container.select('ul').each(fixWidth);
        }
        else {
            this.el.select('ul').each(fixWidth);
        }
        
    }
});

Ext.ux.Menu.zSeed = 10000;