function slDefineNode(nodeType, nodeLabel, nodeColor, nodeIcon) {
  RED.nodes.registerType(nodeType, {
    category: 'Sfera Labs',
    color: nodeColor,
    defaults: {
      name: {
        value: ""
      },
      file: {
        value: "",
        required: true
      },
      outputs: {}
    },
    inputs:1,
    icon: nodeIcon,
    paletteLabel: nodeLabel,
    label: function() {
      if (this.name) {
        return this.name;
      }
      if (this.file) {
        return nodeLabel + " - " + this.file.split(':')[1];
      }
      return nodeLabel;
    },
    labelStyle: function() {
      return this.name?"node_label_italic":"";
    },
    oneditprepare: function() {
      var fileInput = $("#node-input-file");
      var curr = this.file;
      $.getJSON("sferalabs_sysfs", function(data) {
        $.each(data, function(i, f) {
          var path = f.device + "/" + f.file;
          var text = path + " (" + f.rw.toUpperCase() + ")";
          var val = f.rw + ":" + path;
          fileInput.append($("<option />").val(val).text(text));
        });
        fileInput.val(curr).change();
      });
    },
    oneditsave: function() {
      var that = this;
      var rw = $("#node-input-file").val().split(':')[0];
      if (rw.indexOf('r') >= 0) {
        that.outputs = 1;
      } else {
        that.outputs = 0;
      }
    }
  });
}
