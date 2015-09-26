<?php
/**
 * @license   http://www.gnu.org/licenses/gpl.html GPL Version 3
 * @author    Volker Theile <volker.theile@openmediavault.org>
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
require_once("openmediavault/object.inc");
require_once("openmediavault/config.inc");
require_once("openmediavault/error.inc");
require_once("openmediavault/util.inc");
require_once("openmediavault/rpcservice.inc");
require_once("openmediavault/notify.inc");

class OMVRpcServiceDDclient extends OMVRpcServiceAbstract
{

    public function getName()
    {
        return "DDclient";
    }

    private function getPluginName()
    {
        return strtolower( $this->getName() );
    }

    private function getXPath()
    {
        $path = sprintf( "//services/%s", $this->getPluginName() );
        return $path;
    }

    private function getEventMessagePath()
    {
        return sprintf("org.openmediavault.services.%s", $this->getPluginName());
    }

    public function initialize()
    {
        $this->registerMethod("getSettings");
        $this->registerMethod("setSettings");
        $this->registerMethod("doCheck");
        $this->registerMethod("deleteCache");
        $this->registerMethod("getInterfaces");
    }

    public function getSettings($params, $context)
    {
        global $xmlConfig;

        // Validate the RPC caller context.
        $this->validateMethodContext(
            $context,
            array( "role" => OMV_ROLE_ADMINISTRATOR )
        );

        // Get the configuration object.
        $object = $xmlConfig->get($this->getXPath());

        if (is_null($object))
        {
            throw new OMVException(
                OMVErrorMsg::E_CONFIG_GET_OBJECT_FAILED,
                $this->getXPath()
            );
        }

        // Modify the result object.
		
        $object["enable"]      = boolval($object["enable"]);
        $object["ssl"]         = boolval($object["ssl"]);
        $object["wildcard"]    = boolval($object["wildcard"]);
        $object["ipcheck"]     = boolval($object["ipcheck"]);
        $object["seconds"]     = intval($object["seconds"]);
        $object["syslog"]      = boolval($object["syslog"]);
        $object["mail"]        = boolval($object["mail"]);
        $object["mailfailure"] = boolval($object["mailfailure"]);

        return $object;
    }

    public function setSettings($params, $context)
    {
        global $xmlConfig;

        // Validate the RPC caller context.
        $this->validateMethodContext(
            $context,
            array( "role" => OMV_ROLE_ADMINISTRATOR )
        );
	
        // Validate the parameters of the RPC service method.
        $this->validateMethodParams(
            $params,
            '{
                "type"            : "object",
                "properties"      : {
                    "enable"      : { "type" : "boolean" },
                    "server"      : { "type" : "string"},
                    "username"    : { "type" : "string"},
                    "password"    : { "type" : "string"},
                    "hostname"    : { "type" : "string"},
                    "type"        : { "type" : "string"},
                    "ssl"         : { "type" : "boolean"},
                    "wildcard"    : { "type" : "boolean"},
                    "ipcheck"     : { "type" : "boolean"},
                    "interface"   : { "type" : "string"},
                    "seconds"     : { "type" : "integer", "minimum" : 300, "maximum" : 2592000 },
                    "syslog"      : { "type" : "boolean"},
                    "mail"        : { "type" : "boolean"},
	                "mailfailure" : { "type" : "boolean"}
                }
            }'
        );

        // Get the existing configuration object.
        $oldObject = $xmlConfig->get($this->getXPath());

        if (is_null($oldObject))
        {
            throw new OMVException(
                OMVErrorMsg::E_CONFIG_GET_OBJECT_FAILED,
                $this->getXPath()
            );
        }
		
        // Update the configuration object.
        $object = array(
            "enable"      => array_boolval($params, "enable"),
            "server"      => $params["server"],
            "username"    => $params["username"],
            "password"    => $params["password"],
            "hostname"    => $params["hostname"],
            "type"        => $params["type"],
            "ssl"         => array_boolval($params, "ssl"),
            "wildcard"    => array_boolval($params, "wildcard"),
            "ipcheck"     => array_boolval($params, "ipcheck"),
            "interface"   => $params["interface"],
            "seconds"     => $params["seconds"],
            "syslog"      => $params["syslog"],
            "mail"        => $params["mail"],
            "mailfailure" => $params["mailfailure"],
        );

        if ($xmlConfig->replace($this->getXPath(), $object) === false)
        {
            throw new OMVException(
                OMVErrorMsg::E_CONFIG_SET_OBJECT_FAILED
            );
        }

        // Notify configuration changes.
        $dispatcher = &OMVNotifyDispatcher::getInstance();

        $dispatcher->notify(
            OMV_NOTIFY_MODIFY,
            $this->getEventMessagePath(),
            $object
        );

        // Return the configuration object.
        return $object;
    }

    public function doCheck()
    {
        // Validate the RPC caller context.
        //$this->validateMethodContext($context, array(
        //    "role" => OMV_ROLE_ADMINISTRATOR
        //));

        // Create a background process.
        $bgStatusFilename = $this->createBgProcStatus();
        $pid = $this->fork();

        if ($pid > 0) {
            // Parent process.
            $this->initializeBgProcStatus($bgStatusFilename, $pid);
            return $bgStatusFilename;
        }

        // Child process.
        try {
            $bgOutputFilename = $this->createBgProcOutput();
            $this->updateBgProcStatus(
                $bgStatusFilename,
                "outputfilename",
                $bgOutputFilename
            );

            $cmd = sprintf(
                "export LANG=C; %s -daemon=0 -debug -verbose -noquiet 2>&1",
                 $this->getPluginName()
            );
            $this->exec($cmd, $output, $bgOutputFilename);
            $this->finalizeBgProcStatus($bgStatusFilename, $output);

        } catch (Exception $e) {
            $this->finalizeBgProcStatus($bgStatusFilename, "", $e);
            exit(1);
        }
    }

    public function deleteCache()
    {
        $cmd = sprintf(
            "export LANG=C; cp /dev/null /var/cache/%s/%s.cache 2>&1",
            $this->getPluginName(),
            $this->getPluginName()
        );

        if ($this->exec($cmd, $output) !== 0) {
            throw new OMVException(
                OMVErrorMsg::E_EXEC_FAILED,
                $cmd,
                implode("\n", $output)
            );
        }
    }

    public function getInterfaces($params, $context) {
        global $xmlConfig;
		
        // Validate the RPC caller context.
        $this->validateMethodContext($context, array( "role" => OMV_ROLE_ADMINISTRATOR ));
		
        $networks = array();
		$ints = $xmlConfig->getList("//system/network/interfaces/interface");
		
        $networks[] = array('netif'=> 'none');
        foreach ($ints as $n) {
            $networks[] = array('netif'=> $n['devicename']);
        }
		
        return $networks;
    }
}

// Register the RPC service.
$rpcServiceMgr = &OMVRpcServiceMgr::getInstance();
$rpcServiceMgr->registerService(new OMVRpcServiceDDclient());
