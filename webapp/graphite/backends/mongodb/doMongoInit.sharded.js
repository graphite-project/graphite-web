sh.status();
rs.status();
db.createCollection("metricCounters");
db.metricCounters.insert({name: "nextmetrictypeid", value: 1000});
db.metricCounters.ensureIndex({name: 1}, {unique:true});
db.createCollection("metricType");
db.metricType.ensureIndex({metrictypeid:1});
db.metricType.ensureIndex({metricname: 1, expiry: 1}, {unique : true});
newTypeDoc  = { "metrictypeid" : 1, "metricname" : "deleteme.testing" };
db.metricType.insert(newTypeDoc);
db.createCollection("metricValue");
newValueDoc = { metrictypeid: 3, seqno: 0, metricname : "test.metric.name.string.goes.here", hostname : "zaphod", startdatetime : -1, lastupdatetime : -1, numvals: 2, vals: [ 1, 3 ], offsets : [ -1, -1 ] };
db.metricValue.insert(newValueDoc);
db.metricValue.ensureIndex({metrictypeid:1, seqno: 1}, {unique:true});
db.metricValue.ensureIndex({ numvals: -1, metrictypeid:1, seqno: 1})
db.metricType.getIndexes();
db.metricValue.getIndexes();
db.metricCounters.getIndexes();
sh.enableSharding("megamaid");
sh.shardCollection("megamaid.metricType",  { metricname   : 1} );
sh.shardCollection("megamaid.metricValue", { metrictypeid : 1, seqno: 1} );
sh.status();

