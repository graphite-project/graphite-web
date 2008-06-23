/* Copyright 2008 Orbitz WorldWide

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. */

function stdout(msg) {
  $('output').innerHTML += msg + "<br>";
}

GraphiteCompleter = Class.create();
Object.extend(Object.extend(GraphiteCompleter.prototype, Ajax.Autocompleter.prototype), {
  initialize: function(element, update, url, options) {
    this.baseInitialize(element, update, options);
    this.options.asynchronous  = true;
    this.options.onComplete    = this.onComplete.bind(this);
    this.options.defaultParams = this.options.parameters || null;
    this.url                   = url;
    this.selectAfterUpdate     = false;
  },

  addObservers: function(element) {
    if (this.historyMode()) {
      Event.observe(element, "mouseover", this.onHover.bindAsEventListener(this));
      Event.observe(element, "click", this.onClick.bindAsEventListener(this));
    }
  },

  render: function() {
    if(this.entryCount > 0) {
      if (this.historyMode()) {
        for (var i = 0; i < this.entryCount; i++)
          this.index==i ?
            Element.addClassName(this.getEntry(i),"selected") :
            Element.removeClassName(this.getEntry(i),"selected");
      }

      if(this.hasFocus) {
        this.show();
        this.active = true;
      }
    } else {
      this.active = false;
      this.hide();
    }
  },

  selectEntry: function() {
    if (this.entryCount == 0) { return false; }
    return this.updateElement(this.getCurrentEntry());
  },

  onKeyPress: function(event) {
    if(this.active)
      switch(event.keyCode) {
       case Event.KEY_TAB:
         Event.stop(event);
         this.changed = true;
         this.hasFocus = true;
         this.selectAfterUpdate = true;
         this.startIndicator();
         this.getUpdatedChoices();
         if(this.observer) clearTimeout(this.observer);
         this.observer = setTimeout(this.myObserverEvent.bind(this), this.options.frequency*1000);
         return;
       case Event.KEY_RETURN:
         if (this.historyMode()) {
           this.selectEntry();
           Event.stop(event);
	 }
         return;
       case Event.KEY_ESC:
         this.hide();
         this.active = false;
         Event.stop(event);
         return;
       case Event.KEY_LEFT:
       case Event.KEY_RIGHT:
         return;
       case Event.KEY_UP:
         this.markPrevious();
         this.render();
         if(navigator.appVersion.indexOf('AppleWebKit')>0) Event.stop(event);
         return;
       case Event.KEY_DOWN:
         this.markNext();
         this.render();
         if(navigator.appVersion.indexOf('AppleWebKit')>0) Event.stop(event);
         return;
      }
     else
       if(event.keyCode==Event.KEY_TAB || event.keyCode==Event.KEY_RETURN ||
         (navigator.appVersion.indexOf('AppleWebKit') > 0 && event.keyCode == 0)) return;

    this.changed = true;
    this.hasFocus = true;

    if(this.observer) clearTimeout(this.observer);
      this.observer =
        setTimeout(this.onObserverEvent.bind(this), this.options.frequency*1000);
  },

  myObserverEvent: function() {
    this.changed = false;
    this.startIndicator();
    this.getUpdatedChoices();
  },

  onObserverEvent: function() {
    this.changed = false;
    if (this.drawMode() || this.historyMode()) {
      this.startIndicator();
      this.getUpdatedChoices();
    } else {
      this.active = false;
      this.hide();
    }
  },

  updateElement: function(selectedElement) {
    //For history completion, just fill commandInput with whatever they've selected
    if (window.completer.historyMode()) {
      var txt = selectedElement.childNodes[0].nodeValue;
      $('commandInput').value = txt;
      return;
    }
    //For target completion, emulate bash-style completion
    var pre = '';  //pre is everything the user has already typed before the currently completing name
    var lastTokenPos = this.findLastToken();
    if (lastTokenPos != -1) {
      pre = this.element.value.substr(0, lastTokenPos + 1);
      var whitespace = this.element.value.substr(lastTokenPos + 1).match(/^\s+/);
      if (whitespace)
        pre += whitespace[0];
    } else { //no tokens... just need to eat up the actual command
      var firstSpace = this.element.value.indexOf(' ');
      pre = this.element.value.substr(0, firstSpace+1);
    }

    var current = this.element.value.substr(pre.length); //current is the still-being-typed target
    var parts = current.split('.');
    //var last = parts.pop(); //last is the still-being-typed path component
    var bestMatch = '';

    var elementArray = new Array(); //this will be the list of all elements currently in the completion box
    for (i=0;i<selectedElement.parentNode.childNodes.length;i++) {
      elementArray.push( selectedElement.parentNode.childNodes[i] );
    }
    //now we narrow down those elements based on whats been typed
    var potentialMatches = elementArray.pluck('firstChild').pluck('nodeValue').findAll(function (s,i) {
      return (s.length >= current.length) && (s.substr(0, current.length) == current);
    });

    if (potentialMatches.length == 0) return false;
    else if (potentialMatches.length == 1) bestMatch = potentialMatches[0];
    else {  //determine which of the potentialMatches is the best
      var bestIndex = current.length;
      var shortest = potentialMatches.pluck('length').min();
      var first = potentialMatches.pop();
      for (i=1; i<=shortest-current.length; i++) {
        if (! potentialMatches.all(function (v,j) { return v.substr(current.length,i) == first.substr(current.length,i); }) ) {
          bestIndex = i - 1;
          break;
        }
        bestIndex = i;
      }
      bestMatch = first.substr(0,bestIndex + current.length);
    }
    var newValue = pre + bestMatch;
    this.element.focus();
    if (newValue != this.element.value) {
      this.element.value = newValue;
      return true;
    }
    return false;
  },

  updateChoices: function(choices) {
    if(!this.changed && this.hasFocus) {
      this.update.innerHTML = choices;
      Element.cleanWhitespace(this.update);
      Element.cleanWhitespace(this.update.firstChild);

      if(this.update.firstChild && this.update.firstChild.childNodes) {
        this.entryCount =
          this.update.firstChild.childNodes.length;
        for (var i = 0; i < this.entryCount; i++) {
          var entry = this.getEntry(i);
          entry.autocompleteIndex = i;
          this.addObservers(entry);
        }
      } else {
        this.entryCount = 0;
      }

      this.stopIndicator();

      this.index = 0;
      this.render();
    }
    if (this.selectAfterUpdate) {
      this.selectAfterUpdate = false;
      this.selectEntry();
      this.startIndicator();
      this.getUpdatedChoices();
    }
  },

  drawMode: function() {
    return (this.element.value.indexOf('draw ') == 0) ||
           (this.element.value.indexOf('add ') == 0) ||
	   (this.element.value.indexOf('remove ') == 0);
  },

  historyMode: function() {
    return this.element.value.substring(0,1) == '!';
  }
});

GraphiteSearchCompleter = Class.create();
Object.extend(Object.extend(GraphiteSearchCompleter.prototype, Ajax.Autocompleter.prototype), {
  initialize: function(element, update, url, options) {
    this.baseInitialize(element, update, options);
    this.options.asynchronous  = true;
    this.options.onComplete    = this.onComplete.bind(this);
    this.options.defaultParams = this.options.parameters || null;
    this.url                   = url;
    this.selectAfterUpdate     = false;
  },

  addObservers: function(element) {
    var x = 42;
    //No hover/click events
  },

  render: function() {
    if(this.entryCount > 0) {
      //for (var i = 0; i < this.entryCount; i++)
      //  this.index==i ?
      //    Element.addClassName(this.getEntry(i),"selected") :
      //    Element.removeClassName(this.getEntry(i),"selected");

      if(this.hasFocus) {
        this.show();
        this.active = true;
      }
    } else {
      this.active = false;
      this.hide();
    }
  },

  selectEntry: function() {
    if (this.entryCount == 0) { return false; }
    return this.updateElement(this.getCurrentEntry());
  },

  onBlur: function(event) {
    this.element.focus();
    //setTimeout(this.hide.bind(this), 250);
    //this.hasFocus = false;
    //this.active = false;
  },

  onKeyPress: function(event) {
    if(this.active)
      switch(event.keyCode) {
       case Event.KEY_TAB:
         Event.stop(event);
	 this.changed = true;
	 this.hasFocus = true;
	 this.selectAfterUpdate = true;
	 this.startIndicator();
	 this.getUpdatedChoices();
	 if(this.observer) clearTimeout(this.observer);
	 this.observer = setTimeout(this.myObserverEvent.bind(this), this.options.frequency*1000);
         return;
       case Event.KEY_RETURN:
         //parent.content.location.href = "/composer?url=/render%3Ftarget=" + this.element.value;
	 top.content.toggleTarget( this.element.value );
       case Event.KEY_ESC:
         this.hide();
         this.active = false;
         Event.stop(event);
         return;
       case Event.KEY_LEFT:
       case Event.KEY_RIGHT:
         return;
       case Event.KEY_UP:
         this.markPrevious();
         this.render();
         if(navigator.appVersion.indexOf('AppleWebKit')>0) Event.stop(event);
         return;
       case Event.KEY_DOWN:
         this.markNext();
         this.render();
         if(navigator.appVersion.indexOf('AppleWebKit')>0) Event.stop(event);
         return;
      }
     else
       if(event.keyCode==Event.KEY_TAB || event.keyCode==Event.KEY_RETURN ||
         (navigator.appVersion.indexOf('AppleWebKit') > 0 && event.keyCode == 0)) return;

    this.changed = true;
    this.hasFocus = true;

    if(this.observer) clearTimeout(this.observer);
      this.observer =
        setTimeout(this.onObserverEvent.bind(this), this.options.frequency*1000);
  },

  myObserverEvent: function() {
    this.changed = false;
    this.startIndicator();
    this.getUpdatedChoices();
  },

  updateElement: function(selectedElement) {
    var pre = '';
    var lastTokenPos = this.findLastToken();
    if (lastTokenPos != -1) {
      pre = this.element.value.substr(0, lastTokenPos + 1);
      var whitespace = this.element.value.substr(lastTokenPos + 1).match(/^\s+/);
      if (whitespace)
        pre += whitespace[0];
    }
    var current = this.element.value.substr(pre.length);
    var parts = current.split('.');
    var last = parts.pop();
    var bestMatch = '';

    var elementArray = new Array()
    for (i=0;i<selectedElement.parentNode.childNodes.length;i++) {
      elementArray.push( selectedElement.parentNode.childNodes[i] );
    }
    var potentialMatches = elementArray.pluck('firstChild').pluck('nodeValue').findAll(function (s,i) {
      return (s.length >= last.length) && (s.substr(0, last.length) == last);
    });

    if (potentialMatches.length == 0) return false;
    else if (potentialMatches.length == 1) bestMatch = potentialMatches[0];
    else {
      var bestIndex = last.length;
      var shortest = potentialMatches.pluck('length').min();
      var first = potentialMatches.pop();
      for (i=1; i<=shortest-last.length; i++) {
        if (! potentialMatches.all(function (v,j) { return v.substr(last.length,i) == first.substr(last.length,i); }) ) {
	  bestIndex = i - 1;
	  break;
	}
	bestIndex = i;
      }
      bestMatch = first.substr(0,bestIndex + last.length);
    }

    var prior = parts.join('.');
    if (parts.length > 0) bestMatch = '.' + bestMatch; //do this for bestMatch instead?
    var newValue = pre + prior + bestMatch;
    this.element.focus();
    if (newValue != this.element.value) {
      this.element.value = newValue;
      return true;
    }
    return false;
  },

  updateChoices: function(choices) {
    if(!this.changed && this.hasFocus) {
      this.update.innerHTML = choices;
      Element.cleanWhitespace(this.update);
      Element.cleanWhitespace(this.update.firstChild);

      if(this.update.firstChild && this.update.firstChild.childNodes) {
        this.entryCount =
          this.update.firstChild.childNodes.length;
        for (var i = 0; i < this.entryCount; i++) {
          var entry = this.getEntry(i);
          entry.autocompleteIndex = i;
          this.addObservers(entry);
        }
      } else {
        this.entryCount = 0;
      }

      this.stopIndicator();

      this.index = 0;
      this.render();
    }
    if (this.selectAfterUpdate) {
      this.selectAfterUpdate = false;
      this.selectEntry();
      this.startIndicator();
      this.getUpdatedChoices();
    }
  },

  getUpdatedChoices: function() {
    entry = encodeURIComponent(this.options.paramName) + '=' +
      encodeURIComponent(this.getToken());

    this.options.parameters = this.options.callback ?
      this.options.callback(this.element, entry) : entry;

    if(this.options.defaultParams)
      this.options.parameters += '&' + this.options.defaultParams;

    new Ajax.Request(this.url, this.options);
  },

  onComplete: function(request) {
    this.updateChoices(request.responseText);
  }
});
