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
            conditions : [
                { name : "enable", value : true }
            ],
            properties : "show"
        },{
			name       : [
			    "interface"
			],
			conditions : [
			    { name : "ipcheck", value : false }
			],
			properties : "show"
		},{
			name       : [
			    "type"
			],
			conditions : [
			    { name : "server", value : "members.dyndns.org" }
			],
			properties : "show"
		}/*,{
			name       : [
			    "mailfailure"
			],
			conditions : [
			    { name : "mail", value : true }
			],
			properties : "show"
		}*/]   
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
return [
	{
	xtype : "fieldset",
	title : _("General settings"),
	items : [{
	    	xtype      : "checkbox",
	    	name       : "enable",
	    	fieldLabel : _("Enable"),
	    	checked    : false
		}, {
			xtype      : "combo",
			name       : "server",
			fieldLabel : _("DDNS Server"),
			mode       : 'local',
			store      : new Ext.data.SimpleStore({
			    fields : [ "value", "text" ],
			    data   : [
			     ['members.dyndns.org', _('DynDNS')],
			     ['dynupdate.no-ip.com', _('No-IP free')],
			     ['freedns.afraid.org', _('FreeDNS')]
			    ]
			}), 
			displayField  : "text",
			valueField    : "value",
			allowBlank    : false,
			editable      : false,
			triggerAction : 'all',
			value         : 'members.dyndns.org',
			selectOnFocus : true
        }, {
			xtype      : "combo",
			name       : "type",
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
		}, {
			xtype : "fieldset",
			title : _("Login"),
			items : [{
				xtype       : "textfield",
				name        : "username",
				fieldLabel  : _("Username"),
				allowBlank  : false
			}, {
				xtype       : "passwordfield",
				name        : "password",
				fieldLabel  : _("Password"),
				allowBlank  : false
			}, {
				xtype       : "textfield",
				name        : "hostname",
				fieldLabel  : _("Hostname"),
				allowBlank  : false
			}]
		}, {
			xtype : "fieldset",
			title : _("Settings"),
			items : [{
					xtype      : "checkbox",
					name       : "ipcheck",
					fieldLabel : _("WebCheck"),
					boxLabel   : _("If checked, IP will be obtained from external IP-Check-Site."),
					checked    : true
				}, {
					xtype         : "combo",
					name          : "interface",
					hiddenName    : "interface",
					fieldLabel    : _("Network Interface"),
					mode       	  : 'local',
					emptyText     : _("none"),
					value         : 'none',
					allowBlank    : false,
					editable      : false,
					triggerAction : "all",
					displayField  : "netif",
					valueField    : "netif",
					store         : Ext.create("OMV.data.Store", {
					    autoLoad : true,
					    model    : OMV.data.Model.createImplicit({
					        idProperty  : "netif",
					        fields      : [{ name : "netif", type : "string" }]
					    }),
					    proxy : {
					        type : "rpc",
					        rpcData : {
					            service : "DDclient",
					            method  : "getInterfaces"
					        },
					        appendSortParams : false
					    },
					    sorters : [{ direction : "ASC", property  : "netif"}]
					})
				}, {
					xtype      : "checkbox",
					name       : "ssl",
					fieldLabel : _("SSL"),
					checked    : true
				}, {
					xtype      : "checkbox",
					name       : "wildcard",
					fieldLabel : _("Wildcard"),
					checked    : false
				}, {
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
		}, {
			xtype : "fieldset",
			title : _("Log"),
			items : [{
				xtype      : "checkbox",
				name       : "syslog",
				fieldLabel : _("Log Updates to Syslog"),
				checked    : true
			}, {
				xtype      : "checkbox",
				name       : "mail",
				fieldLabel : _("Send Mail on Updates"),
				checked    : false
			}, {
				xtype      : "checkbox",
				name       : "mailfailure",
				fieldLabel : _("Send Mail on Failure"),
				checked    : false
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
