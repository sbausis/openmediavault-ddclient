
// require("js/omv/WorkspaceManager.js")

OMV.WorkspaceManager.registerNode({
	id: "networking",
	path: "/",
	text: _("Networking"),
	position: 15
});

OMV.WorkspaceManager.registerNodeOverride({
	newpath : "/networking",
    id      : "ddclient",
    path    : "/service"
});

OMV.WorkspaceManager.registerPanelOverride({
	newpath   : "/networking/ddclient",
    id        : "settings",
    path      : "/service/ddclient"
});
