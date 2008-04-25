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
var searchURL = "/browser/search";

function SetSelection(b,v)
{
	if (v){
		t = "activeTab";
		tab = "selected";
	} else {
		t = "tab";
		tab = "";
	}

	document.getElementById (b).className = t;
	document.getElementById (b + "Tab").className = tab;
}

function ShowTree ()
{
	SetSelection ("tree", true);
	SetSelection ("search", false);
	SetSelection ("autocompleter", false);
	SetSelection ("views", false);
}

function ShowSearch ()
{
	SetSelection ("tree", false);
	SetSelection ("search", true);
	SetSelection ("autocompleter", false);
	SetSelection ("views", false);
	document.getElementById ('searchInput').focus ();
}

function ShowAutoCompleter ()
{
	SetSelection ("tree", false);
	SetSelection ("search", false);
	SetSelection ("autocompleter", true);
	SetSelection ("views", false);
	$('completerInput').focus();
	window.completer.active = true;
	window.completer.show();
}

function ShowViews () {
	SetSelection ("tree", false);
	SetSelection ("search", false);
	SetSelection ("autocompleter", false);
	SetSelection ("views", true);
}

function doSearch (input,event)
{
	if (event && event.keyCode != Event.KEY_RETURN) {
	  return;
	} else {
	  if (window.event && window.event.keyCode != Event.KEY_RETURN) {
	    return;
	  }
	}

	//Cleanup the interface
	$('errorText').innerHTML = "";
	$('search_spinner').style.visibility = "visible";

	//Clear the result list
	var resultList = $('resultList');
	while (resultList.childNodes[0]) {
	  resultList.removeChild( resultList.childNodes[0] );
	}

	var req = new Ajax.Request(searchURL, {
		method: 'post',
		parameters: 'query=' + input.value,
		onComplete: handleSearchResponse,
		onException: handleSearchException
	});
}

function handleSearchResponse (req)
{
	resp = new String(req.responseText);
	if (req.status != 200) { return setError(resp); }
	if (resp == '') { return setError("Nothing matched your query"); }

	var resultList = $('resultList');
	var results = resp.split(',');

	for (i=0; i < results.length; i++) {
	  var li = document.createElement('li');
	  //li.innerHTML = "<a href='/composer?url=/render%3Ftarget=" + results[i] + "' target='content'>" + results[i] + "</a>";
	  li.innerHTML = "<a href=\"javascript: top.content.toggleTarget('" + results[i] + "');\">" + results[i] + "</a>";
	  resultList.appendChild(li);
	}
	$('search_spinner').style.visibility = "hidden";
}

function handleSearchException (req,exc)
{
        setError('AJAX Exception ' + exc.name + ': ' + exc.message);
}

function setError(errorMessage)
{
        $('errorText').innerHTML = '<font color="red">' + errorMessage + '</font><br/>';
	$('search_spinner').style.visibility = "hidden";
}
