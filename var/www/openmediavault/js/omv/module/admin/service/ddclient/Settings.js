/**
 * @license   http://www.gnu.org/licenses/gpl.html GPL Version 3
 * @author    Volker Theile <volker.theile@openmediavault.org>
 * @author    OpenMediaVault Plugin Developers <plugins@omv-extras.org>
 * @copyright Copyright (c) 2009-2013 Volker Theile
 * @copyright Copyright (c) 2013-2014 OpenMediaVault Plugin Developers
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
// require("js/omv/WorkspaceManager.js")
// require("js/omv/workspace/form/Panel.js")
// require("js/omv/workspace/window/Form.js")
// require("js/omv/data/Store.js")
// require("js/omv/data/Model.js")
// require("js/omv/data/proxy/Rpc.js")
// require("js/omv/workspace/window/plugin/ConfigObject.js")

/**
 * @class OMV.module.admin.service.ddclient.Settings
 * @derived OMV.workspace.form.Panel
 */
Ext.define("OMV.module.admin.service.ddclient.Settings", {
    extend : "OMV.workspace.form.Panel",

    rpcService   : "DDclient",
    rpcGetMethod : "getSettings",
    rpcSetMethod : "setSettings",

    plugins : [{
        ptype        : "linkedfields",
        correlations : [{
            name        : [
              "enable"
            ],
            conditions  : [
                { name : "enable", value : true }
            ],
            properties : function(valid, field) {
                this.setButtonDisabled("chkconf", !valid);
            }
        },{
            name        : [
              "enable"
            ],
            conditions  : [
                { name : "enable", value : true }
            ],
            properties : function(valid, field) {
                this.setButtonDisabled("delcache", !valid);
            }
        },{
            name       : [
                "dyndns_fieldset"
            ],
            conditions : [{
                 name  : "ddns_type",
                 value : "d"
            }],
            properties : "show"
        },{
            name       : [
                "noip_fieldset"
            ],
            conditions : [{
                 name  : "ddns_type",
                 value : "n"
            }],
            properties : "show"
        }]   
    }],


    getButtonItems : function() {
        var me = this;
        var items = me.callParent(arguments);
        items.push({
            id       : me.getId() + "-chkconf",
            xtype    : "button",
            text     : _("Test Config"),
            icon     : "images/bug.png",
            iconCls  : Ext.baseCSSPrefix + "btn-icon-16x16",
            disabled : true,
            scope    : me,
            handler  : Ext.Function.bind(me.onCheck, me, [ me ])
        },{
            id       : me.getId() + "-delcache",
            xtype    : "button",
            text     : _("Delete Cache"),
            icon     : "images/delete.png",
            iconCls  : Ext.baseCSSPrefix + "btn-icon-16x16",
            disabled : true,
            scope    : me,
            handler  : function() {
                // Execute RPC.
                OMV.Rpc.request({
                    scope       : this,
                    callback    : function(id, success, response) {
                        this.doRestart();
                    },
                    relayErrors : false,
                    rpcData     : {
                        service  : "DDclient",
                        method   : "deleteCache"
                    }
                });
            }
        });
        return items;
    },

    onCheck: function() {
        var me = this;
        var wnd = Ext.create("OMV.window.Execute", {
            title           : _("Click start to test config ..."),
            rpcService      : "DDclient",
            rpcMethod       : "doCheck",
            rpcIgnoreErrors : true,
            hideStopButton  : true,
            listeners       : {
                scope       : me,
                exception   : function(wnd, error) { OMV.MessageBox.error(null, error);}
            }
        });
        wnd.show();
    },

    getFormItems: function () {
        return [{
            xtype : "fieldset",
            title : _("General settings"),
            items : [{
                xtype      : "checkbox",
                name       : "enable",
                fieldLabel : _("Enable"),
                checked    : false
            },{
                xtype      : "combo",
                name       : "ddns_type",
                fieldLabel : _("DDNS Service"),
                mode       : 'local',
                store      : new Ext.data.SimpleStore({
                    fields : [ "value", "text" ],
                    data   : [
                     ['d', _('DynDNS')],
                     ['n', _('No-IP free')]
                    ]
                }), 
                displayField  : "text",
                valueField    : "value",
                allowBlank    : false,
                editable      : false,
                triggerAction : 'all',
                value         : 'd',
                selectOnFocus : true
            },{
                xtype          : "fieldset",
                id             : "dyndns_fieldset",
                title          : _("DynDNS Configuration"),
                fieldDefaults  : {
                    labelSeparator : ""
                },
                hidden         : true,
                items          : [{
                    xtype       : "textfield",
                    name        : "dusername",
                    fieldLabel  : _("Username"),
                    allowBlank  : true
                },{
                    xtype       : "passwordfield",
                    name        : "dpassword",
                    fieldLabel  : _("Password"),
                    allowBlank  : true
                },{
                    xtype       : "textfield",
                    name        : "dhostname",
                    fieldLabel  : _("Hostname"),
                    allowBlank  : true
                },{
                    xtype      : "combo",
                    name       : "dtype",
                    fieldLabel : _("Type"),
                    mode       : 'local',
                    store      : new Ext.data.SimpleStore({
                        fields : [ "value", "text" ],
                        data   : [
                            ['x', _('Dynamic')],
                            ['y', _('Static')],
                            ['z', _('Custom')]
                        ]
                    }), 
                    displayField  : "text",
                    valueField    : "value",
                    allowBlank    : false,
                    editable      : false,
                    triggerAction : 'all',
                    value         : 'x'
                },{
                    xtype      : "checkbox",
                    name       : "dssl",
                    fieldLabel : _("SSL"),
                    checked    : false
                },{
                    xtype      : "checkbox",
                    name       : "dwildcard",
                    fieldLabel : _("Wildcard"),
                    checked    : false
                },{
                    xtype      : "checkbox",
                    name       : "dipcheck",
                    fieldLabel : _("No External"),
                    boxLabel   : _("If checked here there will be no external IP check."),
                    checked    : false
                }]
            },{
                xtype          : "fieldset",
                id             : "noip_fieldset",
                title          : _("No-IP free Configuration"),           
                fieldDefaults  : {
                    labelSeparator : ""
                },
                hidden         : true,
                items          : [{
                    xtype       : "textfield",
                    name        : "nusername",
                    fieldLabel  : _("Username"),
                    allowBlank  : true
                },{
                    xtype       : "passwordfield",
                    name        : "npassword",
                    fieldLabel  : _("Password"),
                    allowBlank  : true
                },{
                    xtype       : "textfield",
                    name        : "nhostname",
                    fieldLabel  : _("Hostname"),
                    allowBlank  : true
                },{
                    xtype      : "checkbox",
                    name       : "nipcheck",
                    fieldLabel : _("No External"),
                    boxLabel   : _("If checked here there will be no external IP check."),
                    checked    : false
                }]
            },{
                xtype           : "fieldset",
                id              : "updateinterval",
                title           : _("Update Interval"),
                fieldDefaults   : {
                    labelSeparator : ""
                },
                items            : [{
                    xtype         : "numberfield",
                    name          : "seconds",
                    fieldLabel    : _("Seconds"),
                    minValue      : 300,
                    maxValue      : 2592000,
                    allowDecimals : false,
                    allowBlank    : false,
                    editable      : true,
                    value         : 43200,
                    plugins : [{
                        ptype : "fieldinfo",
                        text  : _("Min=300 (5 minutes) Max=2592000 (30 days) Default=43200 (half-day)")
                    }]
                }]
            }]
        }];
    }
});

OMV.WorkspaceManager.registerPanel({
    id        : "settings",
    path      : "/service/ddclient",
    text      : _("Settings"),
    position  : 10,
    className : "OMV.module.admin.service.ddclient.Settings"
});
