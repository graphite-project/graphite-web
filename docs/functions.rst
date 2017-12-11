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

.. _list-of-functions :

List of functions
-----------------
.. automodule:: graphite.render.functions
   :members:

Function Plugins
----------------

Function plugins can define additional functions for use in render calls.

A function plugin is simply a file defining one or more functions and exporting ``SeriesFunctions`` and/or ``PieFunctions``

Each exposed function must accept at least a ``requestContext`` and ``seriesList`` parameter, and may accept additional parameters as needed.

``requestContext`` will be a dictionary as defined in ``graphite.render.views.renderView()``, ``seriesList`` will be a list of ``TimeSeries`` objects.

.. code-block:: python

    def toUpperCase(requestContext, seriesList):
      """Custom function that changes series names to UPPERCASE"""
      for series in seriesList:
        series.name = series.name.upper()
      return seriesList

    # optionally set the group attribute
    toUpperCase.group = 'Custom'
    toUpperCase.params = [
      {
        'name': 'seriesList',
        'type': 'seriesList',
        'required': True,
      },
    ]

    SeriesFunctions = {
      'upper': toUpperCase,
    }

Each function can have a docstring, ``.group``, and ``.params`` attributes defined, these are used in the function API output as hints for query builders.

The ``.group`` attribute is the group name as a string, the ``.params`` attribute is a list of parameter definitions.

Each parameter definition is a dict with the following attributes (note that `requestContext` is not included):

- **name**: The name of the parameter
- **type**: The parameter type, one of:

  - **aggFunc**: An aggregation function name
  - **boolean**: True/False
  - **date**: A date specification
  - **float**: A float value
  - **integer**: An integer value
  - **interval**: An interval specifier like ``1h``, ``1d``, etc
  - **intOrInterval**: An integer or interval specifier
  - **node**: A node number
  - **nodeOrTag**: A node number or tag name
  - **series**: A single series
  - **seriesList**: A list of series
  - **seriesLists**: A list of seriesLists
  - **string**: A string value
  - **tag**: A tag name

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
