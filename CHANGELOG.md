# 1.2.0 (master/unreleased)

## graphite-web

### Bug Fixes
 - ensure that all tag values are strings (#2572, @DanCech)
 - Attempt to convert parameter types in validator (#2574, @replay)
 - accept deprecated params for bc (#2579, @replay)
 - Remote render fixes (#2582, @piotr1212)

# 1.1.7

## graphite-web

### Bug Fixes
 - Fix AttributeError if parameter validation fails (#2510, @PhilippWendler)
 - Taming lint (#2512, @deniszh)
 - relax enforcement of options sets in validation (#2513, @replay)
 - Fix tests (#2525, @replay)
 - Trying to fix tests (#2530, @deniszh)
 - simplify travis-ci config (#2532, @ploxiln)
 - fix function parameter types (#2536, @replay)
 - fixes #2541 (#2542, @replay)
 - prune flake8 ignore list (#2552, @ploxlin)
 - flake8: re-enable F841 (local variable assigned but not used) (#2559, @ploxiln)
 - flake8: re-enable E122,E124 (indent of continuation and closing bracket) (#2558, @ploxiln)
 - Fix validator when default value is used (#2555, @replay)
 - flake8: include contrib/ subdir, re-enable rule E713 (#2554, @ploxiln)

### Features / Enhancements
 - Merge prefetched data. (#2507.  @liyichao)
 - introduce paramtype for agg or series func (#2523, @replay)
 - Mark series functions to use as aggregators  (#2528, @replay)
 - Python 3.9 support: remove deprecated U option to open (#2529, @piotr1212)
 - remove leading ~ from name when indexing metric names (#2458, @replay)
 - add graphite-dl4j and carbon-proxy (#2521, @jdbranham)
 - test docs on Python3 (#2535, @piotr1212)
 - Django 3.0 compatibility (#2534, @piotr1212)
 - Parameter type int or inf (#2538, @replay)
 - Interpret inf (#2539, @replay)
 - better error messages (#2543, @replay)
 - Adding Hisser and Go-graphite buckytools in tools documentation (#2549, @deniszh)
 - make consolidation func `avg` alias for average (#2556, @replay)
 - move all validation into Param.validateValue (#2557, @replay)
 - handle exceptions if params cannot be type converted (#2547, @replay)
 - better error messages with type indications (#2543, @replay)
 - log grafana dashboard/panel id headers (#2564, @replay)
 - Allow floats in scaleToSeconds() (#2565, @replay)
    
## carbon

### Bug Fixes
 - Fix #871: Adjust aggregator-rules input_pattern match greediness to support numeric matching after captured field (#872 @hessu)
 - Another test fix try (#874, @deniszh)
 - Fixing tests for S390 (#880, @sangitanalkar)
 - Trying to fix tests (#881, @deniszh)
 - Fix the manhole for Twisted > 16 and Python 3 (#882, @piotr1212)
 - Fix missing encoding for line protocol (#885, @pkruk) 

### Features / Enhancements
 - Bucketmax write strategy (#879, @piotr1212) 
 - s390x support for travis (#869, @sangitanalkar)
 - sanitize names when using them as tag value (#858, @replay)
 - simplify travis-ci config (#875, @ploxiln)

## carbonate

### Bug Fixes
 - fixes python3 TypeError (#113, @l4r-s)
 - Change write mode to non-binary. (#111, @hdost)

### Features / Enhancements
 - Add python3 testing (#110, @hdost)
 - add codecov (#112, @piotr1212)


# 1.1.6

## graphite-web

### Bug Fixes
 - fix dashboard graph metric list icon paths with URL_PREFIX (#2424, @ploxiln)
 - docs: for sql db migration to 1.1 recommend –fake-initial (#2425, @ploxiln)
 - Fix dashboard template loading from URL (#2431, @cbowman0)
 - Dashboard render urls missing document.body.dataset.baseUrl (#2433, @cbowman0)
 - fixed small errors in docs (#2443, 0xflotus)
 - Copy requestContext() and empty prefetch (#2450, @cbowman0)
 - Fix a broken link to structured_metrics in doc (#2463, @izeye)
 - added space before (#2487, @saikek)
 - Fix for CVE-2017-18638 (#2499, @deniszh)
 - Upgrading minimal Django version (#2502, @deniszh)

### Features / Enhancements
 - set package long description (#2407, @YevhenLukomskyi)
 - add tag formatting docs (#2426, @replay)
 - Accept IPv6 addresses in CARBONLINK_HOSTS (#2436, @RoEdAl)
 - update aggregation function docs for aggregate and groupbytags (#2451, @Dieterbe)
 - Add Statusengine to list of integrations (Forwarding) (#2452, @nook24)
 - Django22 compatibility (#2462, @piotr1212)
 - Python 3.8 support (#2464, @piotr1212)
 - New functions: add, sigmoid, logit, exp (#2466, @piotr1212)
 - Better error handling (return 4XX instead of 5XX in case of wrong function parameters) (#2467, @replay)
 - Pass maxDataPoints to the requestContext for Finder (#2479, @Felixoid)
 - Add redis password support for tagdb (#2483, @ahmet2mir)
 - Created issue template (#2488, @bigpythonimish)
 - docs: add netdata to ‘tools that work with graphite’ (#2490, @sbasgall)
 - Updated minimumBelow() docstring (#2493, @bigpythonimish)
 - xFilesFactor is an optional parameter for removeEmptySeries (#2495, @DanCech)
 - fix functions that aggregate to include the aliases in their params (#2496, @Dieterbe)
 - the callback parameter for groupByNode is optional (#2497, @DanCech)

## carbon

### Bug Fixes
 - set package long description (#834, @YevhenLukomskyi)
 - Remove pidfile on ValueError exception (#853, @albang)

### Features / Enhancements
 - Add testing for Python 3.8 (#859, @piotr1212)

## whisper

### Bug Fixes
 - Switch to setuptools (#272, @piotr1212)
 - adding appropriate ‘type’ to sleep variable (#273, @piotr1212)
 - Add testing for Python 3.8, remove 3.4 (eol)(#277, @piotr1212)
 - Altering rrd2whisper.py for py3 compatibility (#280, @FliesLikeABrick)

### Features / Enhancements
 - set package long description (#271, @YevhenLukomskyi)
 - Dump as raw values (#282, @Glandos)

## carbonate

### Bug Fixes
 - fix lint errors (PR#105, @YevhenLukomskyi)
 - specify long_description_content_type, so that package description is properly rendered on pypi.org (PR#104, @YevhenLukomskyi)

### Features / Enhancements
 - Python 3 support (PR#107, @piotr1212)
 - Use –copy-dest, enabling the rsync algorithm when copying from remote to staging (PR#106, @luke-heberling)


# 1.1.5
 - See Release notes: https://graphite.readthedocs.io/en/latest/releases/1_1_5.html

# 1.1.4
 - See Release notes: https://graphite.readthedocs.io/en/latest/releases/1_1_4.html

# 1.1.3
 - See Release notes: https://graphite.readthedocs.io/en/latest/releases/1_1_3.html

# 1.1.2
 - See Release notes: https://graphite.readthedocs.io/en/latest/releases/1_1_2.html

# 1.1.1
 - See Release notes: https://graphite.readthedocs.io/en/latest/releases/1_1_1.html

# 1.0.2
 - See Release notes: https://graphite.readthedocs.io/en/latest/releases/1_0_2.html

# 1.0.1
 - See Release notes: https://graphite.readthedocs.io/en/latest/releases/1_0_1.html

# 1.0.0
 - See Release notes: https://graphite.readthedocs.io/en/latest/releases/1_0_0.html

# 0.9.16
 - See Release notes: https://graphite.readthedocs.io/en/latest/releases/0_9_16.html

# 0.9.15
 - See Release notes: https://graphite.readthedocs.io/en/latest/releases/0_9_15.html

# 0.9.14
 - See Release notes: https://graphite.readthedocs.io/en/latest/releases/0_9_14.html

# 0.9.12
 - See Release notes: https://graphite.readthedocs.io/en/latest/releases/0_9_12.html

# 0.9.11
 - See Release notes: https://graphite.readthedocs.io/en/latest/releases/0_9_11.html

# 0.9.10
 - See Release notes: https://graphite.readthedocs.io/en/latest/releases/0_9_10.html

# 0.9.9
 - See Release notes: https://graphite.readthedocs.io/en/latest/releases/0_9_9.html

# 0.9.8
 - See Release notes: https://graphite.readthedocs.io/en/latest/releases/0_9_8.html

# 0.9.7
- See Release notes: https://graphite.readthedocs.io/en/latest/releases/0_9_7.html

# 0.9.6
- See Release notes: https://graphite.readthedocs.io/en/latest/releases/0_9_6.html

# 0.9.5
- See Release notes: https://graphite.readthedocs.io/en/latest/releases/0_9_5.html

# 0.9.4
- See Release notes: https://graphite.readthedocs.io/en/latest/releases/0_9_4.html

# 0.9.3
- See Release notes: https://graphite.readthedocs.io/en/latest/releases/0_9_3.html

# 0.9.2
- See Release notes: https://graphite.readthedocs.io/en/latest/releases/0_9_2.html
