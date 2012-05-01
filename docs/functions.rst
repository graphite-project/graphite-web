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

List of functions
-----------------
.. automodule:: graphite.render.functions
   :members:
