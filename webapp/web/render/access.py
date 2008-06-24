#Series Retrieval API functions below

def resolvePaths(pathExpression):
  "Resolves a graphite path expression to a list of corresponding (graphitePath,dbURL) pairs"
  matches = []
  fsPathExpression = pathExpression.replace('.','/')

  whisperExpr = os.path.join(settings.WHISPER_DIR, fsPathExpression) + '.wsp'
  for fsPath in glob(whisperExpr):
    graphitePath = fsPath.replace(settings.WHISPER_DIR,'').replace('/','.')[:-4]
    dbURL = 'whisper://' + fsPath
    matches.append( (graphitePath,dbURL) )

  if rrdtool:
    components = fsPathExpression.split('.')
    datasourceExpression = components.pop()
    rrdFileExpression = '.'.join(components)
    rrdExpr = os.path.join(settings.RRD_DIR, rrdFileExpression) + '.rrd'
    for fsPath in glob(rrdExpr):
      try:
        info = rrdtool.info(fsPath)
      except:
        log.exception("Failed to retrieve RRD info from %s" % fsPath)
      for datasource in info['ds']:
        if not fnmatchcase(datasource,datasourceExpression): continue
        graphitePath = fsPath.replace(settings.RRD_DIR,'').replace('/','.')[:-4]
        dbURL = 'rrdtool://' + fsPath + ':' + datasource
        matches.append( (graphitePath,dbURL) )

  return matches

def databaseFetch(graphitePath,dbURL,interval):
  (dbHandler,dbPath) = dbURL.split('://',1)
  (startDateTime,endDateTime) = interval

  if dbHandler == 'whisper':
    myHash = pathHash(graphitePath)
    cachedValues = cache.get(myHash)
    if cachedValues is None: #cache miss
      log.cache("databaseFetch cache miss for %s! Querying CarbonLink" % graphitePath)
      getResponse = carbonLink.request(graphitePath)
    else:
      log.cache("databaseFetch cache hit for %s!" % graphitePath)
    fromTimestamp  = mktime( startDateTime.timetuple() )
    untilTimestamp = mktime( endDateTime.timetuple()   )
    (timeInfo,values) = whisper.fetch(dbPath,fromTimestamp,untilTimestamp)
    (start,end,step) = timeInfo
    if cachedValues is None:
      cachedValues = getResponse() #retrieve cached values from CarbonLink
      try: cache.set(myHash,cachedValues)
      except: pass
    #Graft the cached values into the values retrieved from the disk
    for (timestamp,value) in cachedValues:
      interval = timestamp - (timestamp % step)
      try:
        i = int(interval - start) / int(step)
        values[i] = value
      except:
        pass
    return (timeInfo,values)

  elif dbHandler == 'rrdtool':
    assert rrdtool, "rrdtool module was not successfully loaded"
    (dbPath,datasource) = dbPath.rsplit(':',1)
    startString = startDateTime.strftime("%H:%M_%Y%m%d")
    endString   =   endDateTime.strftime("%H:%M_%Y%m%d")
    try:
      (timeInfo,columns,rows) = rrdtool.fetch(dbPath,'AVERAGE','-s' + startString,'-e' + endString)
    except:
      log.exception("databaseFetch: unable to read from RRD %s" % dbPath)
      return
    if datasource not in columns:
      log.exception("databaseFetch: no such datasource '%s' in RRD %s" % (datasource,dbPath))
      return
    colIndex = list(columns).index(datasource)
    rows.pop() #chop off the last row because RRD sucks
    (start,end,step) = timeInfo
    values = (row[colIndex] for row in rows)
    return (timeInfo,values)
