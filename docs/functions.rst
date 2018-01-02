Functions
=========
Functions are used to transform, combine, and perform computations on :term:`series` data. Functions are
applied using the Composer interface or by manipulating the ``target`` parameters in the
:doc:`Render API <render_api>`.

Usage
-----
Most functions are applied to one :term:`series list`. Functions with the parameter
``*seriesLists`` can take an arbitrary number of series lists. To pass multiple series lists
to a function which only takes one, use the :py:func:`group` function.

.. _list-of-functions:

List of functions
-----------------
.. automodule:: graphite.render.functions
   :members:

.. _function-plugins:

Function Plugins
----------------

Function plugins can define additional functions for use in render calls.

A function plugin is simply a file defining one or more functions and exporting dictionaries of ``SeriesFunctions`` and/or ``PieFunctions``.
When Graphite loads the plugin it will add functions in ``SeriesFunctions`` and/or ``PieFunctions`` to the list of available functions.

Each exposed function must accept at least a ``requestContext`` and ``seriesList`` parameter, and may accept additional parameters as needed.

``requestContext`` will be a dictionary as defined in ``graphite.render.views.renderView()``, ``seriesList`` will be a list of ``TimeSeries`` objects.

.. code-block:: python

    from graphite.functions.params import Param, ParamTypes

    def toUpperCase(requestContext, seriesList):
      """Custom function that changes series names to UPPERCASE"""
      for series in seriesList:
        series.name = series.name.upper()
      return seriesList

    # optionally set the group attribute
    toUpperCase.group = 'Custom'
    toUpperCase.params = [
      Param('seriesList', ParamTypes.seriesList, required=True),
    ]

    SeriesFunctions = {
      'upper': toUpperCase,
    }

Each function can have a docstring, ``.group``, and ``.params`` attributes defined, these are used in the function API output as hints for query builders.

The ``.group`` attribute is the group name as a string, the ``.params`` attribute is a list of parameter definitions.

Each parameter definition is ``Param`` object, the ``Param`` constructor accepts the following arguments (note that `requestContext` is not included in the list of parameters):

- **name**: The name of the parameter
- **paramtype**: The parameter type, one of:

  - **ParamTypes.aggFunc**: An aggregation function name
  - **ParamTypes.boolean**: True/False
  - **ParamTypes.date**: A date specification
  - **ParamTypes.float**: A float value
  - **ParamTypes.integer**: An integer value
  - **ParamTypes.interval**: An interval specifier like ``1h``, ``1d``, etc
  - **ParamTypes.intOrInterval**: An integer or interval specifier
  - **ParamTypes.node**: A node number
  - **ParamTypes.nodeOrTag**: A node number or tag name
  - **ParamTypes.series**: A single series
  - **ParamTypes.seriesList**: A list of series
  - **ParamTypes.seriesLists**: A list of seriesLists
  - **ParamTypes.string**: A string value
  - **ParamTypes.tag**: A tag name

- **required**: Set to ``True`` for required parameters
- **default**: Default value for optional parameters
- **multiple**: Set to ``True`` for parameters that accept multiple instances (defined with ``*`` in Python)
- **options**: A list of available values for parameters that accept only a defined list
- **suggestions**: A list of suggested values for parameters that accept free-form values

Custom plugin files may be placed in the ``/opt/graphite/webapp/graphite/functions/custom`` folder and will be loaded automatically when graphite starts.

To load a packaged function plugin module, add it to the ``FUNCTION_PLUGINS`` setting:

.. code-block:: python

    FUNCTION_PLUGINS = [
      'some.function_plugin',
    ]

.. _function-api:

Function API
------------

You can use the HTTP api to get a list of available functions, or the details of a specific function.

To get a list of available functions:

.. code-block:: none

    $ curl -s "http://graphite/functions?pretty=1"

    {
      "absolute": {
        "description": "<function description>",
        "function": "absolute(seriesList)",
        "group": "Transform",
        "module": "graphite.render.functions",
        "name": "absolute",
        "params": [
          {
            "name": "seriesList",
            "required": true,
            "type": "seriesList"
          }
        ]
      },
      <more functions...>
    }

If the parameter ``grouped=1`` is passed, the returned list will be organized by group:

.. code-block:: none

    $ curl -s "http://graphite/functions?pretty=1&grouped=1"

    {
      "Alias": {
        <alias functions...>
      },
      <more groups...>
    }

To get the definition of a specific function:

.. code-block:: none

    $ curl -s "http://graphite/functions/absolute?pretty=1"

    {
      "description": "<function description>",
      "function": "absolute(seriesList)",
      "group": "Transform",
      "module": "graphite.render.functions",
      "name": "absolute",
      "params": [
        {
          "name": "seriesList",
          "required": true,
          "type": "seriesList"
        }
      ]
    }
