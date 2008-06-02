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
//Transform functions

function wrapTarget(funcName) {
  return function (targetNode) {
    var targetString = targetNode.getAttribute("target");
    window.replaceTarget( targetString, funcName + "(" + targetString + ")" );
  }
}

function _scale(targetNode) {
  var targetString = targetNode.getAttribute("target");
  var factor = window.prompt("Input a scaling factor");
  window.replaceTarget( targetString, "scale(" + targetString + "," + factor + ")");
}

function _removeOuterCall(targetNode) {
  var targetString = targetNode.getAttribute("target");
  var i = targetString.indexOf("(");
  if (i != -1) {
    var newTarget = targetString.substring(i + 1, targetString.length - 1);
    window.replaceTarget(targetString,newTarget);
  }
}

var targetFunctions = {
  'Sum (consolidate matches)' : wrapTarget("sumSeries"),
  'Average (consolidate matches)' : wrapTarget("averageSeries"),
  'Cumulative (consolidate data points)' : wrapTarget("cumulative"),
  'Scale' : _scale,
  'Derivative' : wrapTarget('derivative'),
  'Integral' : wrapTarget('integral'),
  'Remove outer call' : _removeOuterCall
  //merge funcs
}
