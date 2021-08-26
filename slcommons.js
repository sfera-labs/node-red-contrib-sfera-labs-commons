function sysFsFileModule(RED, tag) {
  var fs = require('fs');
  var path = require('path');

  var basePath = "/sys/class/" + tag + "/";
  var initErr = null;
  var sysFsFiles = [];

  try {
    fs.readdirSync(basePath).forEach(function(d) {
        var deviceDir = path.resolve(basePath, d);
        var stat = fs.statSync(deviceDir);
        if (stat && stat.isDirectory()) {
          fs.readdirSync(deviceDir).forEach(function(f) {
            var file = path.resolve(deviceDir, f);
            stat = fs.statSync(file);
            if (stat && !stat.isDirectory() && f != "uevent") {
              var rw = null;

              try {
                fs.accessSync(file, fs.constants.R_OK | fs.constants.W_OK);
                rw = "rw";
              } catch (err) {
                try {
                  fs.accessSync(file, fs.constants.R_OK);
                  rw = "r";
                } catch (err) {
                  try {
                    fs.accessSync(file, fs.constants.W_OK);
                    rw = "w";
                  } catch (err) {}
                }
              }

              if (rw) {
                sysFsFiles.push({
                  device: d,
                  file: f,
                  rw: rw
                });
              }
            }
          });
        }
    });
  } catch(e) {
    initErr = e;
  }

  function SysFsFileNode(config) {
    RED.nodes.createNode(this, config);
    var rw_path = config.file.split(':');
    this.canRead = rw_path[0].indexOf('r') >= 0;
    this.canWrite = rw_path[0].indexOf('w') >= 0;
    this.path = basePath + rw_path[1];
    var node = this;

    node.status({fill:"yellow", shape:"ring", text:"Loading..."});

    if (initErr) {
      var errMsg = "Error accessing " + basePath + ". Is the kernel module installed?";
      node.error(errMsg + " - " + initErr);
      node.status({fill:"red", shape:"ring", text:errMsg});
      return;
    }

    node.status({});

    node.on('input', function(msg, send, done) {
      send = send || function() { node.send.apply(node, arguments) }
      var err = null;

      try {
        if (node.canWrite) {
          if (msg.payload !== undefined) {
            if (typeof msg.payload == "boolean") {
              var val = msg.payload ? '1' : '0';
            } else {
              var val = String(msg.payload).trim();
            }
            if (val) {
              try {
                fs.writeFileSync(node.path, val);
              } catch (e) {
                err = e;
              }
            }
          }
        }
        if (node.canRead) {
          try {
            var val = fs.readFileSync(node.path, 'utf8');
            msg.payload = val.trim();
          } catch (e) {
            err = e;
          }
        }
        send(msg);
      } catch (e) {
        err = e;
      }

      if (err) {
          if (done) {
              // Node-RED 1.0 compatible
              done(err);
          } else {
              // Node-RED 0.x compatible
              node.error(err, msg);
          }
          node.status({fill:"red", shape:"ring", text:"Error"});
      } else {
        if (done) {
            done();
        }
        node.status({});
      }
    });
  }

  RED.nodes.registerType(tag, SysFsFileNode);

  RED.httpAdmin.get("/sferalabs_sysfs", RED.auth.needsPermission('sferalabs_sysfs.read'), function(req,res) {
    res.json(sysFsFiles);
  });
}

module.exports = { sysFsFileModule }
